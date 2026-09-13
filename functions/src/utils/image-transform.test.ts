import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  applySharpTransforms,
  clampTransformDimensions,
  DEFAULT_QUALITY,
  isImageFit,
  isImageFormat,
  MAX_OUTPUT_DIMENSION,
  ORIGINAL_FORMAT,
  parseAssetTransformQuery,
  resolveOutputFormat,
  VALID_FITS,
  VALID_FORMATS,
} from './image-transform';

/** A 200x100 solid-colour source — deliberately non-square so fit modes differ visibly. */
function source(): sharp.Sharp {
  return sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png();
}

async function dimensions(pipeline: sharp.Sharp): Promise<{ width?: number; height?: number }> {
  const { width, height } = await sharp(await pipeline.toBuffer()).metadata();
  return { width, height };
}

describe('isImageFormat', () => {
  it.each(VALID_FORMATS)('accepts %s', format => {
    expect(isImageFormat(format)).toBe(true);
  });

  it.each([['bogus'], [''], [undefined], [null], [42], ['WEBP']])('rejects %s', value => {
    expect(isImageFormat(value)).toBe(false);
  });
});

describe('isImageFit', () => {
  it.each(VALID_FITS)('accepts %s', fit => {
    expect(isImageFit(fit)).toBe(true);
  });

  it.each([['bogus'], [''], [undefined], [null], [42], ['COVER']])('rejects %s', value => {
    expect(isImageFit(value)).toBe(false);
  });
});

describe('applySharpTransforms — fit modes on a 200x100 source into a 50x50 box', () => {
  it('cover fills the box exactly, cropping the overflow', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'cover' });

    expect(await dimensions(out)).toEqual({ width: 50, height: 50 });
  });

  it('defaults to cover when no fit is given, preserving existing behaviour', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85 });

    expect(await dimensions(out)).toEqual({ width: 50, height: 50 });
  });

  it('inside shrinks to fit inside the box without padding', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'inside' });

    expect(await dimensions(out)).toEqual({ width: 50, height: 25 });
  });

  it('contain pads to the exact box', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'contain' });

    expect(await dimensions(out)).toEqual({ width: 50, height: 50 });
  });

  it('outside covers the box, so the output may exceed it', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'outside' });

    expect(await dimensions(out)).toEqual({ width: 100, height: 50 });
  });

  it('fill stretches to the exact box, discarding the aspect ratio', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'fill' });

    expect(await dimensions(out)).toEqual({ width: 50, height: 50 });
  });

  it('distinguishes inside from cover — the whole point of the parameter', async () => {
    const cover = await dimensions(applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'cover' }));
    const inside = await dimensions(applySharpTransforms(source(), { width: 50, height: 50, quality: 85, fit: 'inside' }));

    expect(cover).not.toEqual(inside);
  });
});

describe('applySharpTransforms — fit is ignored with a single dimension', () => {
  it('ignores fit when only width is given', async () => {
    const withFit = await dimensions(applySharpTransforms(source(), { width: 50, quality: 85, fit: 'contain' }));
    const withoutFit = await dimensions(applySharpTransforms(source(), { width: 50, quality: 85 }));

    expect(withFit).toEqual(withoutFit);
    expect(withFit).toEqual({ width: 50, height: 25 });
  });

  it('ignores fit when only height is given', async () => {
    const withFit = await dimensions(applySharpTransforms(source(), { height: 50, quality: 85, fit: 'fill' }));
    const withoutFit = await dimensions(applySharpTransforms(source(), { height: 50, quality: 85 }));

    expect(withFit).toEqual(withoutFit);
    expect(withFit).toEqual({ width: 100, height: 50 });
  });
});

describe('applySharpTransforms — contain background', () => {
  it('pads a transparent background for a format with an alpha channel', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, format: 'png', fit: 'contain' });
    const { data, info } = await out.raw().toBuffer({ resolveWithObject: true });

    // Top-left corner is padding for a 200x100 source in a 50x50 box.
    expect(info.channels).toBe(4);
    expect(data[3]).toBe(0);
  });

  it('pads opaque white for a format without an alpha channel', async () => {
    const out = applySharpTransforms(source(), { width: 50, height: 50, quality: 85, format: 'jpeg', fit: 'contain' });
    const { data } = await out.raw().toBuffer({ resolveWithObject: true });

    // JPEG cannot be transparent; padding must be white, never black.
    expect(data[0]).toBeGreaterThan(240);
    expect(data[1]).toBeGreaterThan(240);
    expect(data[2]).toBeGreaterThan(240);
  });

  it('pads opaque white when no format is given, since the source may be JPEG', async () => {
    const out = applySharpTransforms(sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 10, g: 20, b: 30 } } }).jpeg(), {
      width: 50,
      height: 50,
      quality: 85,
      fit: 'contain',
    });
    const { data } = await out.raw().toBuffer({ resolveWithObject: true });

    expect(data[0]).toBeGreaterThan(240);
  });
});

describe('applySharpTransforms — existing behaviour is unchanged', () => {
  it('does not resize when neither dimension is given', async () => {
    const out = applySharpTransforms(source(), { quality: 85 });

    expect(await dimensions(out)).toEqual({ width: 200, height: 100 });
  });

  it.each(['webp', 'jpeg', 'png', 'avif'] as const)('converts to %s', async format => {
    const out = applySharpTransforms(source(), { quality: 85, format });
    const { format: actual } = await sharp(await out.toBuffer()).metadata();

    expect(actual).toBe(format === 'jpeg' ? 'jpeg' : format === 'avif' ? 'heif' : format);
  });
});

describe('parseAssetTransformQuery', () => {
  const ok = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (!result.ok) throw new Error(`expected ok, got rejection for ${result.error.param}`);
    return result.query;
  };

  it('defaults an empty query', () => {
    expect(ok({})).toEqual({
      width: undefined,
      height: undefined,
      quality: DEFAULT_QUALITY,
      qualityExplicit: false,
      format: undefined,
      fit: undefined,
      download: false,
      thumbnail: false,
    });
  });

  describe('dimensions are lenient', () => {
    it('parses positive integers', () => {
      expect(ok({ w: '400', h: '300' })).toMatchObject({ width: 400, height: 300 });
    });

    it.each([['0'], ['-5'], ['abc'], [''], ['NaN']])('ignores a non-positive or non-numeric w: %s', raw => {
      expect(ok({ w: raw }).width).toBeUndefined();
    });

    it('takes the leading integer of a decimal, matching parseInt', () => {
      expect(ok({ w: '400.9' }).width).toBe(400);
    });
  });

  describe('quality is clamped', () => {
    it('passes an in-range value through', () => {
      expect(ok({ q: '50' }).quality).toBe(50);
    });

    it.each([
      ['0', 1],
      ['-10', 1],
      ['101', 100],
      ['9999', 100],
    ])('clamps %s to %i', (raw, expected) => {
      expect(ok({ q: raw }).quality).toBe(expected);
    });

    it.each([['abc'], [''], [undefined]])('defaults when q is %s', raw => {
      expect(ok({ q: raw }).quality).toBe(DEFAULT_QUALITY);
    });
  });

  describe('enums are strict', () => {
    it.each(VALID_FORMATS)('accepts f=%s', format => {
      expect(ok({ f: format }).format).toBe(format);
    });

    it.each(VALID_FITS)('accepts fit=%s', fit => {
      expect(ok({ fit }).fit).toBe(fit);
    });

    it('rejects an unrecognised f, naming the param, value and options', () => {
      const result = parseAssetTransformQuery({ f: 'bogus' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.param).toBe('f');
      expect(result.error.value).toBe('bogus');
      expect(result.error.message).toContain('webp');
    });

    it('rejects an unrecognised fit', () => {
      const result = parseAssetTransformQuery({ fit: 'squish' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.param).toBe('fit');
      expect(result.error.message).toContain('inside');
    });

    it('rejects f before fit, so the first bad param is reported', () => {
      const result = parseAssetTransformQuery({ f: 'bogus', fit: 'squish' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.param).toBe('f');
    });

    it('is case-sensitive', () => {
      expect(parseAssetTransformQuery({ f: 'WEBP' }).ok).toBe(false);
    });

    it.each([
      ['f', ''],
      ['fit', ''],
    ])('treats an empty %s as absent rather than invalid', (param, value) => {
      const result = parseAssetTransformQuery({ [param]: value });

      expect(result.ok).toBe(true);
    });
  });

  describe('flags are presence-based', () => {
    it.each([[''], ['true'], ['false'], ['1']])('treats download=%s as set', raw => {
      expect(ok({ download: raw }).download).toBe(true);
    });

    it('treats an absent download as unset', () => {
      expect(ok({}).download).toBe(false);
    });

    it.each([[''], ['true'], ['false']])('treats thumbnail=%s as set', raw => {
      expect(ok({ thumbnail: raw }).thumbnail).toBe(true);
    });
  });

  it('parses a full query', () => {
    expect(ok({ w: '400', h: '300', q: '80', f: 'webp', fit: 'inside', download: '', thumbnail: '' })).toEqual({
      width: 400,
      height: 300,
      quality: 80,
      qualityExplicit: true,
      format: 'webp',
      fit: 'inside',
      download: true,
      thumbnail: true,
    });
  });
});

describe('clampTransformDimensions', () => {
  const source1000 = { width: 1000, height: 800 };

  it('leaves a request below the source untouched', () => {
    expect(clampTransformDimensions({ width: 500 }, source1000)).toEqual({ width: 500, height: undefined });
  });

  it('leaves a request equal to the source untouched', () => {
    expect(clampTransformDimensions({ width: 1000 }, source1000)).toEqual({ width: 1000, height: undefined });
  });

  it('clamps a request above the source down to the source', () => {
    expect(clampTransformDimensions({ width: 3840 }, source1000)).toEqual({ width: 1000, height: undefined });
  });

  it('passes the request through when the source width is unknown', () => {
    expect(clampTransformDimensions({ width: 800 }, {})).toEqual({ width: 800, height: undefined });
  });

  it('clamps to MAX_OUTPUT_DIMENSION when the source is larger', () => {
    expect(clampTransformDimensions({ width: 8000 }, { width: 8000 })).toEqual({
      width: MAX_OUTPUT_DIMENSION,
      height: undefined,
    });
  });

  it('uses the source when it is smaller than the ceiling', () => {
    expect(clampTransformDimensions({ width: 8000 }, { width: 1000 })).toEqual({ width: 1000, height: undefined });
  });

  it('caps an unknown-source request at the ceiling', () => {
    expect(clampTransformDimensions({ width: 9999 }, {})).toEqual({ width: MAX_OUTPUT_DIMENSION, height: undefined });
  });

  it('clamps height independently of width', () => {
    expect(clampTransformDimensions({ width: 100, height: 5000 }, source1000)).toEqual({ width: 100, height: 800 });
  });

  it('returns undefined for a dimension that was not requested', () => {
    expect(clampTransformDimensions({}, source1000)).toEqual({ width: undefined, height: undefined });
  });

  it('honours an explicit maxDimension override', () => {
    expect(clampTransformDimensions({ width: 900 }, {}, 640)).toEqual({ width: 640, height: undefined });
  });
});

describe('applySharpTransforms — never enlarges', () => {
  it('does not upscale when the requested width exceeds the source', async () => {
    const out = applySharpTransforms(source(), { width: 400, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 200, height: 100 });
  });

  it('does not upscale when the requested height exceeds the source', async () => {
    const out = applySharpTransforms(source(), { height: 400, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 200, height: 100 });
  });

  it('does not upscale inside a box larger than the source', async () => {
    const out = applySharpTransforms(source(), { width: 800, height: 800, quality: 80, fit: 'inside' });

    expect(await dimensions(out)).toEqual({ width: 200, height: 100 });
  });

  it('still downscales normally', async () => {
    const out = applySharpTransforms(source(), { width: 50, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 50, height: 25 });
  });
});

describe('DEFAULT_QUALITY', () => {
  it('is 80 — the chosen bandwidth/quality trade point', () => {
    expect(DEFAULT_QUALITY).toBe(80);
  });

  it('is used when q is absent', () => {
    const result = parseAssetTransformQuery({});

    expect(result.ok && result.query.quality).toBe(80);
  });

  it('is overridden by an explicit q', () => {
    const result = parseAssetTransformQuery({ q: '95' });

    expect(result.ok && result.query.quality).toBe(95);
  });
});

describe('resolveOutputFormat', () => {
  const resolve = (overrides: Partial<Parameters<typeof resolveOutputFormat>[0]> = {}) =>
    resolveOutputFormat({ sourceType: 'image/jpeg', download: false, qualityExplicit: false, resizing: false, ...overrides });

  describe('the WebP default', () => {
    it('defaults a jpeg source to webp', () => {
      expect(resolve()).toBe('webp');
    });

    it.each([['image/png'], ['image/gif'], ['image/webp'], ['image/avif'], ['image/svg+xml'], ['image/tiff']])(
      'leaves %s untouched',
      sourceType => {
        expect(resolve({ sourceType })).toBeUndefined();
      }
    );

    it.each([['video/mp4'], ['video/webm'], ['application/pdf']])('leaves %s untouched', sourceType => {
      expect(resolve({ sourceType })).toBeUndefined();
    });

    it('exempts downloads so the stored original is returned', () => {
      expect(resolve({ download: true })).toBeUndefined();
    });
  });

  describe('f=original opts out explicitly', () => {
    it('keeps a jpeg as jpeg rather than converting to webp', () => {
      expect(resolve({ requested: ORIGINAL_FORMAT })).toBeUndefined();
    });

    it('still opts out when combined with a resize, so only the size changes', () => {
      expect(resolve({ requested: ORIGINAL_FORMAT, resizing: true })).toBeUndefined();
    });

    it('still opts out when an explicit quality is given', () => {
      expect(resolve({ requested: ORIGINAL_FORMAT, qualityExplicit: true })).toBeUndefined();
    });

    it.each([['image/png'], ['image/webp']])('is a no-op for %s, which never defaulted anyway', sourceType => {
      expect(resolve({ requested: ORIGINAL_FORMAT, sourceType })).toBeUndefined();
    });
  });

  describe('requesting a lossless source format collapses to a passthrough', () => {
    it('serves a png asked for as png as stored, since the re-encode is a true no-op', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png' })).toBeUndefined();
    });

    it('collapses even on a download, where the disposition is the only concern', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png', download: true })).toBeUndefined();
    });

    it('re-encodes when resizing, since the bytes must change anyway', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png', resizing: true })).toBe('png');
    });

    it('re-encodes when an explicit quality is given, since that is a real request', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png', qualityExplicit: true })).toBe('png');
    });

    it('does not collapse a genuine conversion', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/jpeg' })).toBe('png');
    });

    it('does not collapse for a source with no encoder equivalent', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/svg+xml' })).toBe('png');
    });
  });

  describe('lossy formats never collapse — the re-encode is a real size reduction', () => {
    it.each([
      ['image/jpeg', 'jpeg'],
      ['image/webp', 'webp'],
      ['image/avif', 'avif'],
    ] as const)('%s asked for as %s still re-encodes at the default quality', (sourceType, requested) => {
      expect(resolve({ requested, sourceType })).toBe(requested);
    });

    it('keeps ?f=jpeg useful as the escape hatch for clients that cannot render webp', () => {
      // Must not become a passthrough: that would serve the full uncompressed original to
      // exactly the clients least able to afford it. `f=original` is the passthrough.
      expect(resolve({ requested: 'jpeg', sourceType: 'image/jpeg' })).toBe('jpeg');
    });
  });

  describe('an explicit format still wins where it means something', () => {
    it('converts jpeg to avif on request', () => {
      expect(resolve({ requested: 'avif' })).toBe('avif');
    });

    it('overrides the download exemption', () => {
      expect(resolve({ requested: 'webp', download: true })).toBe('webp');
    });

    it('overrides the webp default with png', () => {
      expect(resolve({ requested: 'png' })).toBe('png');
    });
  });
});

describe('parseAssetTransformQuery — f=original and qualityExplicit', () => {
  const ok = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (!result.ok) throw new Error(`expected ok, got rejection for ${result.error.param}`);
    return result.query;
  };

  it('accepts f=original', () => {
    expect(ok({ f: 'original' }).format).toBe(ORIGINAL_FORMAT);
  });

  it('lists original among the accepted values when rejecting a typo', () => {
    const result = parseAssetTransformQuery({ f: 'orignal' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('original');
  });

  it('reports qualityExplicit false when q is absent', () => {
    expect(ok({}).qualityExplicit).toBe(false);
  });

  it('reports qualityExplicit true when q is given', () => {
    expect(ok({ q: '80' }).qualityExplicit).toBe(true);
  });

  it('reports qualityExplicit true even for an out-of-range q that gets clamped', () => {
    expect(ok({ q: '500' })).toMatchObject({ quality: 100, qualityExplicit: true });
  });

  it('reports qualityExplicit false for a non-numeric q', () => {
    expect(ok({ q: 'abc' }).qualityExplicit).toBe(false);
  });
});

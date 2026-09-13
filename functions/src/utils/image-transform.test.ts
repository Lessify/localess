import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  applySharpTransforms,
  canonicalTransformSize,
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

  describe('dimensions', () => {
    it('parses positive integers', () => {
      expect(ok({ w: '400', h: '300' })).toMatchObject({ width: 400, height: 300 });
    });

    // Previously these were silently ignored. They now reject — see the
    // 'numeric params are strict' block below for the full rule and its rationale.
    it.each([['0'], ['-5'], ['abc'], ['NaN']])('rejects a non-positive or non-numeric w: %s', raw => {
      expect(parseAssetTransformQuery({ w: raw }).ok).toBe(false);
    });

    it('treats an empty w as absent rather than invalid', () => {
      expect(ok({ w: '' }).width).toBeUndefined();
    });

    it('rejects a decimal rather than truncating it', () => {
      // `w=400.9` and `w=400` would render identical bytes under two cache keys.
      expect(parseAssetTransformQuery({ w: '400.9' }).ok).toBe(false);
    });
  });

  describe('quality is range-checked', () => {
    it('passes an in-range value through', () => {
      expect(ok({ q: '50' }).quality).toBe(50);
    });

    it.each([['1'], ['50'], ['100']])('accepts %s, at and inside the bounds', raw => {
      expect(ok({ q: raw }).quality).toBe(Number(raw));
    });

    it.each([['0'], ['-10'], ['101'], ['9999']])('rejects an out-of-range q=%s rather than clamping it', raw => {
      expect(parseAssetTransformQuery({ q: raw }).ok).toBe(false);
    });

    it('names the accepted range in the rejection', () => {
      const result = parseAssetTransformQuery({ q: '150' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('between 1 and 100');
    });

    it.each([[''], [undefined]])('defaults when q is absent (%s)', raw => {
      expect(ok({ q: raw }).quality).toBe(DEFAULT_QUALITY);
    });

    it('rejects a non-numeric q rather than defaulting', () => {
      expect(parseAssetTransformQuery({ q: 'abc' }).ok).toBe(false);
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

describe('applySharpTransforms — upscales when asked', () => {
  it('enlarges when the requested width exceeds the source', async () => {
    const out = applySharpTransforms(source(), { width: 400, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 400, height: 200 });
  });

  it('enlarges when the requested height exceeds the source', async () => {
    const out = applySharpTransforms(source(), { height: 400, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 800, height: 400 });
  });

  it('enlarges inside a box larger than the source', async () => {
    const out = applySharpTransforms(source(), { width: 800, height: 800, quality: 80, fit: 'inside' });

    expect(await dimensions(out)).toEqual({ width: 800, height: 400 });
  });

  it('still downscales normally', async () => {
    const out = applySharpTransforms(source(), { width: 50, quality: 80 });

    expect(await dimensions(out)).toEqual({ width: 50, height: 25 });
  });

  it('gives distinct sizes for distinct widths, so no two URLs share bytes', async () => {
    const a = await dimensions(applySharpTransforms(source(), { width: 300, quality: 80 }));
    const b = await dimensions(applySharpTransforms(source(), { width: 500, quality: 80 }));

    expect(a).not.toEqual(b);
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

  it('reports qualityExplicit true for an in-range q at the boundary', () => {
    expect(ok({ q: '100' })).toMatchObject({ quality: 100, qualityExplicit: true });
  });

  it('reports qualityExplicit false for an empty q', () => {
    expect(ok({ q: '' }).qualityExplicit).toBe(false);
  });
});

describe('parseAssetTransformQuery — numeric params are strict', () => {
  const ok = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (!result.ok) throw new Error(`expected ok, got rejection for ${result.error.param}`);
    return result.query;
  };
  const rejection = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
  };

  describe('unparseable values are rejected', () => {
    it.each([['w'], ['h'], ['q']])('rejects a non-numeric %s, naming the param and value', param => {
      const error = rejection({ [param]: 'abc' });

      expect(error.param).toBe(param);
      expect(error.value).toBe('abc');
      expect(error.message).toContain(param);
    });

    it('rejects the template-bug case that used to silently work', () => {
      expect(rejection({ w: 'undefined' }).param).toBe('w');
    });

    it('rejects NaN', () => {
      expect(rejection({ w: 'NaN' }).param).toBe('w');
    });
  });

  describe('an empty value is absent, not invalid', () => {
    it.each([['w'], ['h'], ['q']])('treats an empty %s as omitted, matching f and fit', param => {
      expect(parseAssetTransformQuery({ [param]: '' }).ok).toBe(true);
    });

    it('leaves width undefined for an empty w', () => {
      expect(ok({ w: '' }).width).toBeUndefined();
    });

    it('falls back to the default quality for an empty q', () => {
      expect(ok({ q: '' })).toMatchObject({ quality: DEFAULT_QUALITY, qualityExplicit: false });
    });
  });

  describe('dimensions have no sensible non-positive reading, so those reject', () => {
    it.each([
      ['w', '0'],
      ['w', '-5'],
      ['h', '0'],
      ['h', '-5'],
    ])('rejects %s=%s', (param, value) => {
      expect(rejection({ [param]: value }).param).toBe(param);
    });
  });

  describe('quality is bounded to its documented range, not clamped into it', () => {
    it.each([['0'], ['-10'], ['101'], ['9999']])('rejects q=%s', raw => {
      // Clamping would silently serve a quality other than the one requested — the same
      // leniency that let a malformed `w` pass unnoticed. `@localess/client` rejects these
      // before a URL is built; this is the server-side half of that rule.
      expect(parseAssetTransformQuery({ q: raw }).ok).toBe(false);
    });

  });

  describe('only a canonical integer is accepted, because every alias is a separate cache key', () => {
    it.each([
      ['q', '50.0'],
      ['q', '50.1'],
      ['q', '50.5'],
      ['w', '400.9'],
      ['w', '0.5'],
    ])('rejects the decimal %s=%s, which would encode the same as its integer', (param, value) => {
      expect(parseAssetTransformQuery({ [param]: value }).ok).toBe(false);
    });

    it.each([
      ['w', '0400'],
      ['w', '007'],
    ])('rejects the leading-zero alias %s=%s', (param, value) => {
      expect(parseAssetTransformQuery({ [param]: value }).ok).toBe(false);
    });

    it.each([
      ['w', '4e2'],
      ['w', '1e3'],
      ['w', '0x190'],
    ])('rejects the non-decimal notation %s=%s', (param, value) => {
      expect(parseAssetTransformQuery({ [param]: value }).ok).toBe(false);
    });

    it.each([
      ['w', ' 400'],
      ['w', '400 '],
      ['w', '+400'],
    ])('rejects the whitespace or sign alias %s=%s', (param, value) => {
      expect(parseAssetTransformQuery({ [param]: value }).ok).toBe(false);
    });

    it('says the value must be a whole number', () => {
      const result = parseAssetTransformQuery({ q: '50.5' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('whole number');
    });

    it('still reports a negative integer as out of range, not malformed', () => {
      const result = parseAssetTransformQuery({ w: '-5' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain(`between 1 and ${MAX_OUTPUT_DIMENSION}`);
    });

    it.each([['1'], ['400'], ['4096']])('accepts the canonical integer %s', raw => {
      expect(parseAssetTransformQuery({ w: raw }).ok).toBe(true);
    });
  });

  describe('leniency that must not change', () => {
    it('still treats an absent param as absent', () => {
      expect(ok({})).toMatchObject({ width: undefined, height: undefined, quality: DEFAULT_QUALITY });
    });
  });

  describe('rejection ordering is stable', () => {
    it('reports w before h', () => {
      expect(rejection({ w: 'abc', h: 'abc' }).param).toBe('w');
    });

    it('reports a numeric param before f', () => {
      expect(rejection({ w: 'abc', f: 'bogus' }).param).toBe('w');
    });
  });
});

describe('MAX_OUTPUT_DIMENSION is a rejection, not a clamp', () => {
  it('is 8192', () => {
    expect(MAX_OUTPUT_DIMENSION).toBe(8192);
  });

  it.each([['w'], ['h']])('accepts %s exactly at the ceiling', param => {
    expect(parseAssetTransformQuery({ [param]: String(MAX_OUTPUT_DIMENSION) }).ok).toBe(true);
  });

  it.each([['w'], ['h']])('rejects %s one above the ceiling', param => {
    expect(parseAssetTransformQuery({ [param]: String(MAX_OUTPUT_DIMENSION + 1) }).ok).toBe(false);
  });

  it('rejects a request large enough to exhaust the instance', () => {
    // ~7.5GB of raw pixel buffer if it were honoured.
    expect(parseAssetTransformQuery({ w: '50000' }).ok).toBe(false);
  });

  it('does not collapse oversized widths onto one output, which clamping used to do', () => {
    // The point of rejecting rather than clamping: `w=9000` and `w=50000` must not both
    // succeed and return identical bytes under two cache keys.
    expect(parseAssetTransformQuery({ w: '9000' }).ok).toBe(false);
    expect(parseAssetTransformQuery({ w: '50000' }).ok).toBe(false);
  });

  it('passes an in-range width through untouched, including above a typical source size', () => {
    // Upscaling is honoured — the parser does not know or care about the source dimensions.
    expect(parseAssetTransformQuery({ w: '3840' })).toMatchObject({ ok: true, query: { width: 3840 } });
  });
});

describe('canonicalTransformSize', () => {
  const source = { width: 400, height: 300 };

  describe('leaves a request that already fits alone', () => {
    it.each([[200], [400]])('returns w=%i unchanged', width => {
      expect(canonicalTransformSize({ width }, source)).toEqual({ width });
    });

    it('returns an in-range box unchanged', () => {
      expect(canonicalTransformSize({ width: 200, height: 150 }, source)).toEqual({ width: 200, height: 150 });
    });

    it('returns an untouched request when no dimension was asked for', () => {
      expect(canonicalTransformSize({}, source)).toEqual({});
    });
  });

  describe('shrinks a single oversized dimension to the source', () => {
    it('caps width at the source width', () => {
      expect(canonicalTransformSize({ width: 5000 }, source)).toEqual({ width: 400, height: undefined });
    });

    it('caps height at the source height', () => {
      expect(canonicalTransformSize({ height: 5000 }, source)).toEqual({ width: undefined, height: 300 });
    });

    it('maps every oversized width onto the same canonical value', () => {
      // This is the point of redirecting: the duplicates collapse onto one URL rather than
      // onto one *response* under many URLs.
      expect(canonicalTransformSize({ width: 5000 }, source)).toEqual(canonicalTransformSize({ width: 99999 }, source));
    });
  });

  describe('shrinks an oversized box proportionally, preserving its aspect ratio', () => {
    it('keeps a square box square, so a cover crop still crops', () => {
      // Clamping per-axis would give 400x300 — a 4:3 box that no longer crops at all.
      expect(canonicalTransformSize({ width: 5000, height: 5000 }, source)).toEqual({ width: 300, height: 300 });
    });

    it('keeps a wide box wide', () => {
      expect(canonicalTransformSize({ width: 4000, height: 1000 }, source)).toEqual({ width: 400, height: 100 });
    });

    it('keeps a tall box tall', () => {
      expect(canonicalTransformSize({ width: 1000, height: 4000 }, source)).toEqual({ width: 75, height: 300 });
    });

    it('never shrinks a dimension below one pixel', () => {
      expect(canonicalTransformSize({ width: 8000, height: 1 }, source)).toMatchObject({ height: 1 });
    });
  });

  describe('is idempotent, so a redirect cannot loop', () => {
    it.each([
      [{ width: 5000 }],
      [{ height: 5000 }],
      [{ width: 5000, height: 5000 }],
      [{ width: 4000, height: 1000 }],
      [{ width: 8000, height: 1 }],
    ])('re-canonicalising %o is a no-op', requested => {
      const once = canonicalTransformSize(requested, source);

      expect(canonicalTransformSize(once, source)).toEqual(once);
    });
  });

  describe('degrades gracefully when the source size is unknown', () => {
    it('leaves the request alone with no metadata at all', () => {
      expect(canonicalTransformSize({ width: 5000 }, {})).toEqual({ width: 5000 });
    });

    it('caps only the axis it knows about', () => {
      expect(canonicalTransformSize({ width: 5000 }, { width: 400 })).toEqual({ width: 400, height: undefined });
    });

    it('leaves height alone when only the source width is known', () => {
      expect(canonicalTransformSize({ height: 5000 }, { width: 400 })).toEqual({ width: undefined, height: 5000 });
    });
  });
});

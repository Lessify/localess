import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  applySharpTransforms,
  canonicalTransformSize,
  isAnimatedPages,
  isImageFit,
  isImageFormat,
  MAX_ANIMATED_PIXELS,
  MAX_OUTPUT_DIMENSION,
  parseAssetTransformQuery,
  resolveOutputFormat,
  sourceEncoderFormat,
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

describe('applySharpTransforms — quality is the encoder decision unless the caller makes it', () => {
  /**
   * Gradient plus noise, which compresses like a photograph rather than a flat fill.
   * A solid colour compresses to near-nothing at every quality and would hide the difference.
   */
  function photographic(): sharp.Sharp {
    const width = 400;
    const height = 300;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        const noise = Math.round(Math.sin(x * 0.7) * Math.cos(y * 0.9) * 40);
        raw[i] = Math.max(0, Math.min(255, Math.round((x * 255) / width) + noise));
        raw[i + 1] = Math.max(0, Math.min(255, Math.round((y * 255) / height) + noise));
        raw[i + 2] = (x * y) % 255;
      }
    }
    return sharp(raw, { raw: { width, height, channels: 3 } });
  }

  const size = async (opts: Parameters<typeof applySharpTransforms>[1]) =>
    (await applySharpTransforms(photographic(), opts).toBuffer()).length;

  // The regression this guards: quality is not portable between codecs. sharp defaults AVIF to
  // 50 and JPEG/WebP to 80 because AVIF sits on a different perceptual curve. An earlier
  // revision passed a flat 80 to every encoder, which made AVIF several times larger than
  // sharp's default and larger than the equivalent WebP — so `?f=avif`, the best format on
  // offer, became the worst one to ask for.
  it('lets sharp pick the avif default rather than imposing the jpeg/webp number', async () => {
    expect(await size({ format: 'avif' })).toBeLessThan(await size({ format: 'avif', quality: 80 }));
  });

  it('still honours an explicit quality for avif', async () => {
    expect(await size({ format: 'avif', quality: 30 })).toBeLessThan(await size({ format: 'avif', quality: 90 }));
  });

  it('still honours an explicit quality for jpeg and webp', async () => {
    expect(await size({ format: 'jpeg', quality: 30 })).toBeLessThan(await size({ format: 'jpeg', quality: 90 }));
    expect(await size({ format: 'webp', quality: 30 })).toBeLessThan(await size({ format: 'webp', quality: 90 }));
  });
});

describe('sourceEncoderFormat', () => {
  it.each([
    ['image/jpeg', 'jpeg'],
    ['image/webp', 'webp'],
    ['image/png', 'png'],
    ['image/avif', 'avif'],
  ] as const)('maps %s onto its own encoder, so a resize keeps the format', (sourceType, expected) => {
    expect(sourceEncoderFormat(sourceType)).toBe(expected);
  });

  it.each([['image/gif'], ['image/svg+xml'], ['image/tiff'], ['video/mp4'], ['application/pdf']])(
    'returns undefined for %s, leaving sharp to infer the output',
    sourceType => {
      expect(sourceEncoderFormat(sourceType)).toBeUndefined();
    }
  );
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
      quality: undefined,
      format: undefined,
      fit: undefined,
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

    it.each([[''], [undefined]])('leaves quality undefined when q is absent (%s)', raw => {
      expect(ok({ q: raw }).quality).toBeUndefined();
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
    it.each([[''], ['true'], ['false'], ['1']])('treats thumbnail=%s as set', raw => {
      expect(ok({ thumbnail: raw }).thumbnail).toBe(true);
    });
  });

  it('parses a full query', () => {
    expect(ok({ w: '400', h: '300', q: '80', f: 'webp', fit: 'inside', thumbnail: '' })).toEqual({
      width: 400,
      height: 300,
      quality: 80,
      format: 'webp',
      fit: 'inside',
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

describe('quality is not defaulted by the endpoint', () => {
  // Each encoder has its own calibrated default and they are not the same number — sharp uses
  // 80 for JPEG and WebP but 50 for AVIF, because the scales are not comparable. Leaving `q`
  // undefined is what lets each encoder apply its own.
  it('leaves quality undefined when q is absent', () => {
    const result = parseAssetTransformQuery({});

    expect(result.ok && result.query.quality).toBeUndefined();
  });

  it('leaves quality undefined for an empty q', () => {
    const result = parseAssetTransformQuery({ q: '' });

    expect(result.ok && result.query.quality).toBeUndefined();
  });

  it('carries an explicit q through', () => {
    const result = parseAssetTransformQuery({ q: '95' });

    expect(result.ok && result.query.quality).toBe(95);
  });
});

describe('resolveOutputFormat', () => {
  const resolve = (overrides: Partial<Parameters<typeof resolveOutputFormat>[0]> = {}) =>
    resolveOutputFormat({ sourceType: 'image/jpeg', resizing: false, ...overrides });

  describe('nothing is converted without an explicit f', () => {
    // A format change is the developer's call. `?f=` is the only thing that triggers one, and
    // it is the recommended way to cut transfer size — opt-in, not imposed.
    it('leaves a jpeg source untouched', () => {
      expect(resolve()).toBeUndefined();
    });

    it.each([['image/png'], ['image/gif'], ['image/webp'], ['image/avif'], ['image/svg+xml'], ['image/tiff']])(
      'leaves %s untouched',
      sourceType => {
        expect(resolve({ sourceType })).toBeUndefined();
      }
    );

    it('stays a passthrough even when resizing, so only the size changes', () => {
      expect(resolve({ resizing: true })).toBeUndefined();
    });

    it('stays a passthrough when only a quality is given', () => {
      expect(resolve({ quality: 50 })).toBeUndefined();
    });

    it.each([['video/mp4'], ['video/webm'], ['application/pdf']])('leaves %s untouched', sourceType => {
      expect(resolve({ sourceType })).toBeUndefined();
    });

  });

  describe('requesting a lossless source format collapses to a passthrough', () => {
    it('serves a png asked for as png as stored, since the re-encode is a true no-op', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png' })).toBeUndefined();
    });

    it('re-encodes when resizing, since the bytes must change anyway', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png', resizing: true })).toBe('png');
    });

    it('re-encodes when an explicit quality is given, since that is a real request', () => {
      expect(resolve({ requested: 'png', sourceType: 'image/png', quality: 50 })).toBe('png');
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
      // exactly the clients least able to afford it. The `/original` route is the passthrough.
      expect(resolve({ requested: 'jpeg', sourceType: 'image/jpeg' })).toBe('jpeg');
    });
  });

  describe('an explicit format still wins where it means something', () => {
    it('converts jpeg to avif on request', () => {
      expect(resolve({ requested: 'avif' })).toBe('avif');
    });

    it('overrides the webp default with png', () => {
      expect(resolve({ requested: 'png' })).toBe('png');
    });
  });
});

describe('parseAssetTransformQuery — removed parameters point at their replacement route', () => {
  const reject = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (result.ok) throw new Error('expected a rejection');
    return result.error;
  };

  it('rejects f=original and says to omit the parameter instead', () => {
    const error = reject({ f: 'original' });

    expect(error.param).toBe('f');
    expect(error.value).toBe('original');
    expect(error.message).toContain('Omit the parameter');
  });

  it('rejects a valueless download flag and names the /download route', () => {
    const error = reject({ download: '' });

    expect(error.param).toBe('download');
    expect(error.message).toContain('/download');
  });

  it('rejects download=true as well, since the flag is presence-based', () => {
    expect(reject({ download: 'true' }).param).toBe('download');
  });

  it('rejects download even when it is combined with a transform', () => {
    expect(reject({ w: '400', download: '' }).param).toBe('download');
  });

  it('still accepts the four encoder formats', () => {
    for (const f of ['webp', 'jpeg', 'png', 'avif']) {
      expect(parseAssetTransformQuery({ f }).ok).toBe(true);
    }
  });
});

describe('parseAssetTransformQuery — quality presence', () => {
  const ok = (query: Record<string, unknown>) => {
    const result = parseAssetTransformQuery(query);
    if (!result.ok) throw new Error(`expected ok, got rejection for ${result.error.param}`);
    return result.query;
  };

  it('leaves quality undefined when q is absent', () => {
    expect(ok({}).quality).toBeUndefined();
  });

  it('carries q through when given', () => {
    expect(ok({ q: '80' }).quality).toBe(80);
  });

  it('carries an in-range q at the boundary', () => {
    expect(ok({ q: '100' })).toMatchObject({ quality: 100 });
  });

  it('leaves quality undefined for an empty q', () => {
    expect(ok({ q: '' }).quality).toBeUndefined();
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

    it('leaves quality undefined for an empty q', () => {
      expect(ok({ q: '' }).quality).toBeUndefined();
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
      expect(ok({})).toMatchObject({ width: undefined, height: undefined, quality: undefined });
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

describe('isAnimatedPages', () => {
  // The regression this guards: a **static GIF reports `pages: 1`**, and the old test was
  // `pages !== undefined`, so every still GIF was treated as animated and passed through
  // untransformed — `?w=400` on one silently did nothing. Only a static WebP reports undefined.
  it('treats an absent page count as a still image', () => {
    expect(isAnimatedPages(undefined)).toBe(false);
  });

  it('treats a single page as a still image, not an animation', () => {
    expect(isAnimatedPages(1)).toBe(false);
  });

  it.each([[2], [6], [24], [120]])('treats %i pages as an animation', pages => {
    expect(isAnimatedPages(pages)).toBe(true);
  });
});

describe('applySharpTransforms — colour profile', () => {
  /** sRGB input carrying an embedded profile. */
  async function tagged(): Promise<Buffer> {
    return sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 120, b: 60 } } })
      .withIccProfile('p3')
      .png()
      .toBuffer();
  }

  it('carries a source profile through a transform instead of dropping it', async () => {
    const out = await applySharpTransforms(sharp(await tagged()), { width: 16, format: 'png' }).toBuffer();

    expect((await sharp(out).metadata()).icc).toBeDefined();
  });

  it('adds no profile, and no bytes, to a source that never had one', async () => {
    // `withIccProfile('srgb')` would tag every response at a measured +506 bytes each. Keeping
    // rather than converting is what makes an untagged source cost nothing.
    const untagged = sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 120, b: 60 } } }).png();
    const out = await applySharpTransforms(untagged, { width: 16, format: 'png' }).toBuffer();

    expect((await sharp(out).metadata()).icc).toBeUndefined();
  });
});

describe('applySharpTransforms — png quality is opt-in', () => {
  /** Screenshot-like: flat bands with edges, which is what PNG actually carries in a CMS. */
  function screenshot(): sharp.Sharp {
    const width = 400;
    const height = 300;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 3;
        const band = Math.floor(y / 30) % 4;
        const colour = [
          [250, 250, 252],
          [230, 235, 245],
          [40, 44, 52],
          [90, 140, 220],
        ][band];
        const edge = x % 97 < 2 ? -40 : 0;
        raw[i] = Math.max(0, colour[0] + edge);
        raw[i + 1] = Math.max(0, colour[1] + edge);
        raw[i + 2] = Math.max(0, colour[2] + edge);
      }
    }
    return sharp(raw, { raw: { width, height, channels: 3 } });
  }

  const size = async (opts: Parameters<typeof applySharpTransforms>[1]) => (await applySharpTransforms(screenshot(), opts).toBuffer()).length;

  it('stays lossless without an explicit quality', async () => {
    const out = await applySharpTransforms(screenshot(), { format: 'png' }).toBuffer();
    const { paletteBitDepth } = await sharp(out).metadata();

    // A quantised PNG reports a palette bit depth; a lossless one does not.
    expect(paletteBitDepth).toBeUndefined();
  });

  it('quantises to a palette when a quality is given, cutting size substantially', async () => {
    const lossless = await size({ format: 'png' });
    const quantised = await size({ format: 'png', quality: 60 });

    expect(quantised).toBeLessThan(lossless);
  });
});

describe('MAX_ANIMATED_PIXELS', () => {
  // Resizing an animation decodes every frame at once, so the budget is the whole animation
  // rather than one frame. The API runs at 1GiB with concurrency 20, so one oversized request
  // does not merely fail itself — it takes the container down for the other nineteen tenants.
  const decoded = (width: number, frameHeight: number, pages: number) => width * frameHeight * pages;

  it('clears a typical short clip', () => {
    expect(decoded(480, 270, 24)).toBeLessThan(MAX_ANIMATED_PIXELS);
  });

  it('clears a long clip at modest dimensions', () => {
    expect(decoded(480, 270, 90)).toBeLessThan(MAX_ANIMATED_PIXELS);
  });

  it('refuses an animation that would exhaust the instance', () => {
    expect(decoded(1000, 1000, 100)).toBeGreaterThan(MAX_ANIMATED_PIXELS);
  });

  it('stays well inside the 1GiB instance budget at 4 bytes per pixel', () => {
    expect(MAX_ANIMATED_PIXELS * 4).toBeLessThan(64 * 1024 * 1024);
  });
});

describe('applySharpTransforms — animations survive a resize', () => {
  /** A genuinely multi-frame GIF; frames must differ or the encoder collapses them to one. */
  async function animatedGif(frames: number, width = 120, height = 90): Promise<Buffer> {
    const raw = Buffer.alloc(width * height * frames * 3);
    for (let f = 0; f < frames; f++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (f * height + y) * width * 3 + x * 3;
          raw[i] = (x * 2 + f * 40) % 255;
          raw[i + 1] = (y * 2 + f * 20) % 255;
          raw[i + 2] = (f * 40) % 255;
        }
      }
    }
    return sharp(raw, { raw: { width, height: height * frames, channels: 3, pageHeight: height } })
      .gif()
      .toBuffer();
  }

  it('keeps every frame when resizing, rather than passing the animation through', async () => {
    const gif = await animatedGif(6);
    const out = await applySharpTransforms(sharp(gif, { animated: true }), { width: 60, format: undefined }).toBuffer();
    const meta = await sharp(out, { animated: true }).metadata();

    expect(meta.pages).toBe(6);
    expect(meta.width).toBe(60);
  });

  it('converts an animation to webp on request, keeping every frame', async () => {
    const gif = await animatedGif(6);
    const out = await applySharpTransforms(sharp(gif, { animated: true }), { width: 60, format: 'webp' }).toBuffer();
    const meta = await sharp(out, { animated: true }).metadata();

    expect(meta.format).toBe('webp');
    expect(meta.pages).toBe(6);
  });

  it('produces a smaller file than the untransformed source, which is the whole point', async () => {
    const gif = await animatedGif(6, 240, 180);
    const out = await applySharpTransforms(sharp(gif, { animated: true }), { width: 120, format: 'webp' }).toBuffer();

    expect(out.length).toBeLessThan(gif.length);
  });
});

describe('EXIF orientation is baked in, not discarded', () => {
  /** A 200x100 JPEG tagged Orientation=6, i.e. one that renders as 100x200. */
  async function rotatedPortrait(): Promise<Buffer> {
    return sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 200, g: 50, b: 50 } } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
  }

  it('honours the orientation tag, so a portrait photo stays portrait', async () => {
    const out = await applySharpTransforms(sharp(await rotatedPortrait(), { autoOrient: true }), { width: 50 }).toBuffer();
    const { width, height } = await sharp(out).metadata();

    expect({ width, height }).toEqual({ width: 50, height: 100 });
  });

  it('would otherwise produce a landscape image from a portrait source', async () => {
    // Pins why `autoOrient` is required rather than optional: sharp strips the orientation tag on
    // re-encode, so without it the client has nothing left to correct with, and the **aspect ratio
    // itself** is transposed — the surrounding layout breaks, not just the rotation.
    const out = await applySharpTransforms(sharp(await rotatedPortrait()), { width: 50 }).toBuffer();
    const { width, height, orientation } = await sharp(out).metadata();

    expect({ width, height }).toEqual({ width: 50, height: 25 });
    expect(orientation).toBeUndefined();
  });
});

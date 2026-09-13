import type sharp from 'sharp';

import { isFlagSet } from './query-flag';

export const VALID_FORMATS = ['webp', 'jpeg', 'png', 'avif'] as const;
export type ImageFormat = (typeof VALID_FORMATS)[number];

/**
 * Check if a value is a supported image format.
 * @param {unknown} v Value to check
 * @return {boolean} true if the value is one of VALID_FORMATS
 */
export function isImageFormat(v: unknown): v is ImageFormat {
  return VALID_FORMATS.includes(v as ImageFormat);
}

/**
 * `f=original` — an explicit opt-out of the default format conversion.
 *
 * Not an encoder target, which is why it is kept out of {@link VALID_FORMATS}: it resolves
 * to "no format change", never to a sharp pipeline call. It exists because once JPEG
 * defaults to WebP there is otherwise no way to ask for the stored bytes *inline* —
 * `?f=jpeg` is a lossy round-trip, not a passthrough, and `?download` forces an
 * attachment disposition the caller may not want.
 */
export const ORIGINAL_FORMAT = 'original';
export type RequestedFormat = ImageFormat | typeof ORIGINAL_FORMAT;

/** Everything accepted by `?f=`, including the passthrough sentinel. */
export const VALID_FORMAT_REQUESTS = [...VALID_FORMATS, ORIGINAL_FORMAT] as const;

/**
 * Check if a value is an accepted `?f=` value.
 * @param {unknown} v Value to check
 * @return {boolean} true if the value is a supported format or `original`
 */
export function isRequestedFormat(v: unknown): v is RequestedFormat {
  return VALID_FORMAT_REQUESTS.includes(v as RequestedFormat);
}

/** Stored MIME types that map onto an encoder target, for passthrough detection. */
const SOURCE_MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/avif': 'avif',
};

/**
 * Formats whose encoder is lossless, so re-encoding to the same format only burns CPU.
 *
 * The lossy formats are deliberately excluded. Re-encoding a JPEG as JPEG at
 * {@link DEFAULT_QUALITY} is *not* a no-op — it is a meaningful size reduction, and on a
 * public CDN that reduction is the whole point. Collapsing it to a passthrough would make
 * `?f=jpeg`, the escape hatch for clients that cannot render WebP, serve the full
 * uncompressed original. Callers who want the stored bytes ask for `f=original`.
 */
const LOSSLESS_FORMATS: ReadonlySet<ImageFormat> = new Set<ImageFormat>(['png']);

export const VALID_FITS = ['cover', 'contain', 'inside', 'outside', 'fill'] as const;
export type ImageFit = (typeof VALID_FITS)[number];

/**
 * Check if a value is a supported image fit mode.
 * @param {unknown} v Value to check
 * @return {boolean} true if the value is one of VALID_FITS
 */
export function isImageFit(v: unknown): v is ImageFit {
  return VALID_FITS.includes(v as ImageFit);
}

/**
 * Background used to pad a `contain` resize.
 *
 * Transparent only where the output format is known to carry an alpha channel,
 * otherwise opaque white. An undefined format means the source format is kept,
 * which may be JPEG — and sharp flattens a transparent background to **black**
 * there, so white is the safe default rather than the prettier one.
 * @param {ImageFormat} [format] Requested output format
 * @return {object} a sharp background colour
 */
function containBackground(format?: ImageFormat): { r: number; g: number; b: number; alpha: number } {
  const supportsAlpha = format === 'png' || format === 'webp' || format === 'avif';
  return { r: 255, g: 255, b: 255, alpha: supportsAlpha ? 0 : 1 };
}

/**
 * Apply resize and format/quality transforms to a sharp pipeline.
 * @param {sharp.Sharp} pipeline Sharp pipeline to transform
 * @param {object} opts Transform options
 * @param {number} [opts.width] Target width in pixels
 * @param {number} [opts.height] Target height in pixels
 * @param {number} opts.quality Output quality
 * @param {ImageFormat} [opts.format] Output format
 * @param {ImageFit} [opts.fit] How the image is fitted when BOTH width and height
 *   are given. Ignored otherwise, since sharp preserves aspect ratio with one
 *   dimension and a fit mode would have no effect.
 * @return {sharp.Sharp} the transformed pipeline
 */
export function applySharpTransforms(
  pipeline: sharp.Sharp,
  opts: {
    width?: number;
    height?: number;
    quality: number;
    format?: ImageFormat;
    fit?: ImageFit;
  }
): sharp.Sharp {
  if (opts.width || opts.height) {
    // `fit` only means something when both dimensions box the output.
    const boxed = Boolean(opts.width && opts.height);
    // Enlargement is deliberately allowed. A caller asking for a width above the source is
    // taken at their word: silently returning the source size instead would mean two URLs
    // resolving to identical bytes, which is the cache fragmentation this endpoint avoids.
    // The upper bound is enforced as a `400` in `parseAssetTransformQuery`, not here.
    const resizeOptions: sharp.ResizeOptions = {};
    if (boxed && opts.fit) {
      resizeOptions.fit = opts.fit;
      if (opts.fit === 'contain') resizeOptions.background = containBackground(opts.format);
    }
    pipeline = pipeline.resize(opts.width ?? null, opts.height ?? null, resizeOptions);
  }
  if (opts.format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: opts.quality });
  } else if (opts.format === 'webp') {
    pipeline = pipeline.webp({ quality: opts.quality });
  } else if (opts.format === 'png') {
    pipeline = pipeline.png();
  } else if (opts.format === 'avif') {
    pipeline = pipeline.avif({ quality: opts.quality });
  }
  return pipeline;
}

/** Resolved, validated transform parameters for an asset request. */
export interface AssetTransformQuery {
  width?: number;
  height?: number;
  quality: number;
  /** Whether `?q=` was supplied, as opposed to {@link DEFAULT_QUALITY} being applied. */
  qualityExplicit: boolean;
  format?: RequestedFormat;
  fit?: ImageFit;
  download: boolean;
  thumbnail: boolean;
}

/** Why a request was rejected, ready to be rendered as a `400`. */
export interface AssetTransformQueryError {
  /** The offending query parameter. */
  param: string;
  /** The value that was rejected. */
  value: string;
  message: string;
}

export type AssetTransformQueryResult = { ok: true; query: AssetTransformQuery } | { ok: false; error: AssetTransformQueryError };

export const DEFAULT_QUALITY = 80;

/**
 * Hard ceiling on any transformed output edge, in pixels.
 *
 * A request above this is **rejected with `400`**, never clamped. Clamping would map every
 * oversized width onto the same output — `w=9000` and `w=50000` returning identical bytes
 * under two cache keys — which is the fragmentation this endpoint exists to avoid. Rejecting
 * keeps one URL to one output.
 *
 * The ceiling exists for memory, not for bandwidth: sharp holds the full decoded bitmap, so
 * an 8192px edge is roughly 200MB of raw pixels. Raising it further needs the instance
 * `memory`/`concurrency` in `functions/src/v1.ts` revisited with it.
 *
 * Kept here rather than in `config.ts` deliberately: `config.ts` calls `initializeApp()`
 * at module scope, and importing it would drag Firebase Admin initialisation into this
 * module's unit tests. This file must stay side-effect free.
 */
export const MAX_OUTPUT_DIMENSION = 8192;

/**
 * Resolves the encoder target for a request, or `undefined` to serve the stored bytes.
 *
 * `undefined` is what keeps a request *off* the transform path entirely: the route only
 * enters sharp when a width, a height or a format is present. So returning `undefined`
 * here is the passthrough decision, and returning a format is what pulls even a bare
 * request onto the transform path.
 *
 * The default is WebP for `image/jpeg` only. WebP is ~25–35% smaller than JPEG at
 * equivalent perceptual quality, and photographic JPEG is the case where lossy
 * re-encoding is safe. PNG carries screenshots and line art that lossy WebP visibly
 * degrades, and GIF/animated WebP are passed through untransformed by the route because
 * sharp cannot resize animations.
 * @param {object} params Resolution inputs
 * @param {RequestedFormat} [params.requested] Explicit `?f=`, including `original`
 * @param {string} params.sourceType Stored asset MIME type
 * @param {boolean} params.download Whether `?download` was set
 * @param {boolean} params.qualityExplicit Whether the caller passed `?q=`
 * @param {boolean} params.resizing Whether a width or height survived clamping
 * @return {ImageFormat | undefined} the format to encode to, or undefined to serve the stored bytes
 */
export function resolveOutputFormat(params: {
  requested?: RequestedFormat;
  sourceType: string;
  download: boolean;
  qualityExplicit: boolean;
  resizing: boolean;
}): ImageFormat | undefined {
  const { requested, sourceType, download, qualityExplicit, resizing } = params;

  // Explicit opt-out: keep whatever is stored.
  if (requested === ORIGINAL_FORMAT) return undefined;

  if (requested !== undefined) {
    // Asking for a *lossless* format the source already is, with nothing else to change,
    // is a genuine no-op: the encoder would spend CPU to produce equivalent bytes. Serve
    // the stored file instead. An explicit `q` or a resize means the caller does want a
    // re-encode, so those opt back in. Lossy formats never collapse — see LOSSLESS_FORMATS.
    if (!resizing && !qualityExplicit && LOSSLESS_FORMATS.has(requested) && SOURCE_MIME_TO_FORMAT[sourceType] === requested) {
      return undefined;
    }
    return requested;
  }

  // A download must hand back the file the user uploaded, with its original extension.
  if (download) return undefined;
  return sourceType === 'image/jpeg' ? 'webp' : undefined;
}

/** Intrinsic dimensions of the stored original, where known. */
export interface SourceDimensions {
  width?: number;
  height?: number;
}

/**
 * Reduces a requested render size to the largest one the source can actually produce.
 *
 * The route does not serve this size directly — it **redirects** to it. Serving it under the
 * original URL is what the earlier clamp did, and it meant `?w=5000` and `?w=99999` returned
 * identical bytes under two cache keys, so the CDN stored both and sharp ran twice. A redirect
 * collapses every oversized spelling onto one canonical URL instead, which is the same trick
 * the `cv` parameter uses for content.
 *
 * With both dimensions given the *box* is shrunk proportionally rather than each axis being
 * capped independently. Capping per axis changes the box's aspect ratio, and `fit` is defined
 * against that ratio: a 5000x5000 request against a 400x300 source is a square box that crops,
 * but per-axis capping would turn it into 400x300 — a 4:3 box that no longer crops at all.
 *
 * Idempotent by construction, so the redirect cannot loop: the result always fits the source,
 * and a request that fits is returned untouched.
 * @param {object} requested Requested width/height, already parsed and validated
 * @param {SourceDimensions} source Intrinsic dimensions of the original, where known
 * @return {object} the canonical width/height for this source
 */
export function canonicalTransformSize(
  requested: { width?: number; height?: number },
  source: SourceDimensions
): { width?: number; height?: number } {
  const { width, height } = requested;
  if (width === undefined && height === undefined) return requested;

  // The largest factor that brings every requested axis inside the source. An axis whose
  // source dimension is unknown cannot constrain anything, so it is skipped rather than
  // guessed — older assets without metadata keep their previous behaviour.
  let scale = 1;
  if (width !== undefined && source.width !== undefined) scale = Math.min(scale, source.width / width);
  if (height !== undefined && source.height !== undefined) scale = Math.min(scale, source.height / height);
  if (scale >= 1) return requested;

  return {
    width: width === undefined ? undefined : Math.max(1, Math.round(width * scale)),
    height: height === undefined ? undefined : Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Parses and validates the transform query of an asset request.
 *
 * Kept out of the route handler so it is a pure function of the query object —
 * the route then only has to branch on `ok`. That also makes every parsing and
 * validation rule unit-testable without route-level test infrastructure.
 *
 * Numeric params are lenient by long-standing behaviour: a non-numeric or
 * non-positive `w`/`h` is ignored, and `q` is clamped to 1–100 with a default of
 * {@link DEFAULT_QUALITY}. The two enum params are strict — an unrecognised
 * value is rejected so a typo surfaces instead of silently returning an
 * untransformed image. An empty value (`?f=`) counts as absent, not invalid.
 * @param {Record<string, unknown>} query Express request query
 * @return {AssetTransformQueryResult} the parsed query, or the rejection reason
 */
export function parseAssetTransformQuery(query: Record<string, unknown>): AssetTransformQueryResult {
  /**
   * Parsed numeric parameter: absent, a value, or a rejection.
   *
   * Three outcomes rather than two, because "the caller omitted it" and "the caller sent
   * something meaningless" must not collapse into the same `undefined`.
   */
  type NumericResult = { ok: true; value?: number } | { ok: false; error: AssetTransformQueryError };

  /**
   * Parses a numeric parameter and bounds it, rejecting anything outside the accepted range.
   *
   * Out-of-range values are rejected rather than clamped. Clamping silently serves something
   * other than what was asked for, which is the same leniency that let a malformed `w` pass
   * unnoticed — and `q=150` is far more often a caller bug than a request for maximum
   * quality. `@localess/client` applies the identical rule before a URL is even built.
   * @param {string} param Query parameter name
   * @param {unknown} raw Raw query value
   * @param {number} min Smallest accepted value
   * @param {number} [max] Largest accepted value, where the parameter has an upper bound
   * @return {NumericResult} absent, a value, or a rejection
   */
  const parseNumeric = (param: string, raw: unknown, min: number, max?: number): NumericResult => {
    const value = (raw as string | undefined)?.toString() ?? '';
    // An empty value counts as absent, not invalid — matching `f` and `fit`, so the parser
    // has one rule for "omitted" rather than one per parameter.
    if (value === '') return { ok: true };
    // Only a canonical decimal integer is accepted, and this is a *caching* rule more than a
    // parsing one. Every spelling that resolves to the same number is a distinct CDN cache key
    // producing byte-identical output: `q=50`, `q=50.1` and `q=50.5` all encode at 50, and
    // `w=400`, `w=0400`, `w=4e2` all resize to 400. Accepting the aliases multiplies edge
    // entries and re-runs sharp for each, which is the fragmentation this endpoint exists to
    // avoid. One value, one URL.
    if (!/^-?(?:0|[1-9]\d*)$/.test(value)) {
      return { ok: false, error: { param, value, message: `Unsupported '${param}' value '${value}'. Expected a whole number.` } };
    }
    const parsed = parseInt(value, 10);
    if (parsed < min || (max !== undefined && parsed > max)) {
      const range = max !== undefined ? `between ${min} and ${max}` : `greater than or equal to ${min}`;
      return { ok: false, error: { param, value, message: `Unsupported '${param}' value '${value}'. Expected a number ${range}.` } };
    }
    return { ok: true, value: parsed };
  };

  const widthResult = parseNumeric('w', query.w, 1, MAX_OUTPUT_DIMENSION);
  if (!widthResult.ok) return widthResult;
  const heightResult = parseNumeric('h', query.h, 1, MAX_OUTPUT_DIMENSION);
  if (!heightResult.ok) return heightResult;
  const qualityResult = parseNumeric('q', query.q, 1, 100);
  if (!qualityResult.ok) return qualityResult;

  const formatRaw = (query.f as string | undefined)?.toString() || undefined;
  if (formatRaw !== undefined && !isRequestedFormat(formatRaw)) {
    return {
      ok: false,
      error: {
        param: 'f',
        value: formatRaw,
        message: `Unsupported 'f' value '${formatRaw}'. Expected one of: ${VALID_FORMAT_REQUESTS.join(', ')}.`,
      },
    };
  }

  const fitRaw = (query.fit as string | undefined)?.toString() || undefined;
  if (fitRaw !== undefined && !isImageFit(fitRaw)) {
    return {
      ok: false,
      error: {
        param: 'fit',
        value: fitRaw,
        message: `Unsupported 'fit' value '${fitRaw}'. Expected one of: ${VALID_FITS.join(', ')}.`,
      },
    };
  }

  return {
    ok: true,
    query: {
      width: widthResult.value,
      height: heightResult.value,
      // No clamping needed — `parseNumeric` already rejected anything outside 1–100.
      quality: qualityResult.value ?? DEFAULT_QUALITY,
      // Tracked separately from `quality` because the resolved number cannot distinguish
      // "the caller asked for 80" from "the caller asked for nothing". Passthrough
      // detection needs that difference: `?f=jpeg&q=80` on a JPEG is a real re-encode
      // request, while a bare `?f=jpeg` is a no-op.
      qualityExplicit: qualityResult.value !== undefined,
      format: formatRaw as RequestedFormat | undefined,
      fit: fitRaw as ImageFit | undefined,
      download: isFlagSet(query.download),
      thumbnail: isFlagSet(query.thumbnail),
    },
  };
}

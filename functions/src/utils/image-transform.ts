import sharp from 'sharp';

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
  format?: ImageFormat;
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

export const DEFAULT_QUALITY = 85;

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
  const positiveInt = (raw: unknown): number | undefined => {
    const parsed = parseInt((raw as string | undefined)?.toString() ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const qualityParsed = parseInt((query.q as string | undefined)?.toString() ?? '', 10);

  const formatRaw = (query.f as string | undefined)?.toString() || undefined;
  if (formatRaw !== undefined && !isImageFormat(formatRaw)) {
    return {
      ok: false,
      error: {
        param: 'f',
        value: formatRaw,
        message: `Unsupported 'f' value '${formatRaw}'. Expected one of: ${VALID_FORMATS.join(', ')}.`,
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
      width: positiveInt(query.w),
      height: positiveInt(query.h),
      quality: Number.isFinite(qualityParsed) ? Math.min(100, Math.max(1, qualityParsed)) : DEFAULT_QUALITY,
      format: formatRaw as ImageFormat | undefined,
      fit: fitRaw as ImageFit | undefined,
      download: isFlagSet(query.download),
      thumbnail: isFlagSet(query.thumbnail),
    },
  };
}

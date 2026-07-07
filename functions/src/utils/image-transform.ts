import sharp from 'sharp';

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
 * Apply resize and format/quality transforms to a sharp pipeline.
 * @param {sharp.Sharp} pipeline Sharp pipeline to transform
 * @param {object} opts Transform options
 * @param {number} [opts.width] Target width in pixels
 * @param {number} [opts.height] Target height in pixels
 * @param {number} opts.quality Output quality
 * @param {ImageFormat} [opts.format] Output format
 * @return {sharp.Sharp} the transformed pipeline
 */
export function applySharpTransforms(
  pipeline: sharp.Sharp,
  opts: {
    width?: number;
    height?: number;
    quality: number;
    format?: ImageFormat;
  }
): sharp.Sharp {
  if (opts.width || opts.height) {
    pipeline = pipeline.resize(opts.width ?? null, opts.height ?? null);
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

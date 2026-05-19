import sharp from 'sharp';

export const VALID_FORMATS = ['webp', 'jpeg', 'png'] as const;
export type ImageFormat = (typeof VALID_FORMATS)[number];

export function isImageFormat(v: unknown): v is ImageFormat {
  return VALID_FORMATS.includes(v as ImageFormat);
}

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
  }
  return pipeline;
}

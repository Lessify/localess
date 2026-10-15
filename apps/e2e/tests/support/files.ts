/** A valid 1×1 PNG, for asset uploads. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function pngFile(name = 'pixel.png'): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'image/png', buffer: PNG_1X1 };
}

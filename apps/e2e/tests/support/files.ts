/** A file to upload (`setInputFiles`, a drop, `api.uploadAsset`). */
export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** A valid 1×1 PNG, for asset uploads. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function pngFile(name = 'pixel.png'): FilePayload {
  return { name, mimeType: 'image/png', buffer: PNG_1X1 };
}

/** A minimal PDF document. */
export function pdfFile(name = 'document.pdf'): FilePayload {
  return { name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n') };
}

/** A plain text file. */
export function textFile(name = 'notes.txt', text = 'Plain text notes'): FilePayload {
  return { name, mimeType: 'text/plain', buffer: Buffer.from(text) };
}

/** Splits `photo.final.JPG` into name `photo.final` and extension `.JPG`, like the upload form did. */
export function splitFilename(filename: string): { name: string; extension: string } {
  const index = filename.lastIndexOf('.');
  return index > 0 ? { name: filename.substring(0, index), extension: filename.substring(index) } : { name: filename, extension: '' };
}

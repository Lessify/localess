import { z } from 'zod';

export const zLabels = z.array(z.string().max(200)).max(100);

/**
 * A visual-editor preview URL: absolute http(s) once its `{placeholders}` are filled in. Loaded into a
 * trusted iframe, so `javascript:`/`data:` must never get in — zod's `.url()` alone accepts both.
 */
export const zPreviewUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(value => {
    try {
      const url = new URL(value.replace(/\{[^{}]*\}/g, 'x'));
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Preview URLs must be absolute http(s) URLs');

import { z } from 'zod';

// The WHATWG URL parser, a global in browsers and Node; this package compiles without DOM or Node types.
declare const URL: new (url: string) => { protocol: string };

/**
 * A boolean sent as text (a query parameter, an environment variable): exactly `true` or `false`, lowercase; anything
 * else is refused. Not `z.coerce.boolean()`, which reads `"false"` as `true` (any non-empty string is).
 */
export const zBoolean = z.stringbool({ truthy: ['true'], falsy: ['false'], case: 'sensitive' });

/** A schema's or translation's labels. */
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

import { z } from 'zod';

// App API requests of the Unsplash plugin.

/** `GET /api/app/plugins/unsplash/search`. */
export const zUnsplashSearch = z.object({
  query: z.string().min(1).max(200),
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
});
export type UnsplashSearch = z.infer<typeof zUnsplashSearch>;

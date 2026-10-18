import { z } from 'zod';
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from './page.model.js';

/**
 * The query of a paginated endpoint: `page` (0-based), `size` (1 … 100), `sort` (one of `fields`, `defaultSort` when
 * absent) and `direction` (`asc` | `desc`). Numbers are read from query strings. `.extend()` it with the endpoint's
 * filters.
 */
export function zPageable<const S extends readonly [string, ...string[]]>(fields: S, defaultSort: S[number]) {
  return z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
    sort: z.enum(fields).default(defaultSort as never),
    direction: z.enum(['asc', 'desc']).default('asc'),
  });
}

import { z } from 'zod';

import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, type SortDirection } from './page.model.js';

/**
 * The query of a paginated endpoint: `page` (0-based), `size` (1 … 100), `sort` (one of `fields`, `defaultSort` when
 * absent) and `direction` (`asc` | `desc`, `defaultDirection` when absent). Numbers are read from query strings.
 * `.extend()` it with the endpoint's filters.
 */
export function zPageable<const S extends readonly [string, ...string[]]>(
  fields: S,
  defaultSort: S[number],
  defaultDirection: SortDirection = 'asc',
) {
  return z.object({
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
    sort: z.enum(fields).default(defaultSort as never),
    direction: z.enum(['asc', 'desc']).default(defaultDirection),
  });
}

/**
 * A filter taking several values, each one of `values`: the parameter repeated (`status=FAILED&status=FINISHED`), which
 * the query parser reads as an array, or once, read as a string. Always an array once parsed.
 */
export function zMultiValue<const V extends readonly [string, ...string[]]>(values: V) {
  return z.union([z.enum(values), z.array(z.enum(values)).min(1).max(values.length)]).transform(it => (Array.isArray(it) ? it : [it]));
}

/**
 * `?search=`, the search of a paged list: trimmed, at most 200 characters; empty or only spaces is no search
 * (`undefined`). What it matches is the endpoint's (a case-insensitive "contains" over the fields it names).
 */
export const zSearch = z
  .string()
  .trim()
  .max(200)
  .transform(it => it || undefined)
  .optional();

import type { Page, Pageable } from '@localess/shared';

/** The rows of the pages before this one. */
export function offsetOf(pageable: Pageable): number {
  return pageable.page * pageable.size;
}

/** One page: the rows read with `limit size offset offsetOf`, the count of every row matching the same filters. */
export function toPage<R, T>(rows: R[], total: number, pageable: Pageable, map: (row: R) => T): Page<T> {
  return { items: rows.map(map), page: pageable.page, size: pageable.size, total };
}

/** Search text for LIKE / ILIKE, matched literally: `%`, `_` and the escape character `\` escaped. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, m => `\\${m}`);

/** A LIKE pattern matching `search` anywhere in the value. */
export function containsPattern(search: string): string {
  return `%${escapeLike(search)}%`;
}

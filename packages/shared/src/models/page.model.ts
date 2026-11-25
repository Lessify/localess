/** One page of a list, and where it sits in the whole (after filters). The response of every paginated endpoint. */
export interface Page<T> {
  /** This page's items, in the requested order; empty past the last page. */
  items: T[];
  /** This page's number, 0-based. */
  page: number;
  /** The page size asked for (not items.length, which is smaller on the last page). */
  size: number;
  /** How many items match the filters, across all pages. Pages: `Math.ceil(total / size)`. */
  total: number;
}

export type SortDirection = 'asc' | 'desc';

/** What every paginated endpoint takes in its query (`page`, `size`, `sort`, `direction`), next to its own filters. */
export interface Pageable<S extends string = string> {
  /** 0-based. */
  page: number;
  /** 1 … PAGE_SIZE_MAX. */
  size: number;
  /** One of the endpoint's allowed fields; the server always adds `id` as a tie-breaker. */
  sort: S;
  direction: SortDirection;
}

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

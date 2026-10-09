/** Unsplash's own maximum for `per_page`. */
export const MAX_PER_PAGE = 30;
const DEFAULT_PER_PAGE = 20;

/**
 * Normalises caller-supplied paging to what Unsplash accepts, so the proxy cannot be asked for
 * arbitrary page sizes on the operator's API key.
 *
 * @param {unknown} page requested page, 1-based
 * @param {unknown} perPage requested page size
 * @return {object} safe `page` (undefined when not requested) and `perPage` values
 */
export function normalizePaging(page: unknown, perPage: unknown): { page: number | undefined; perPage: number } {
  const size = Number(perPage);
  const safePerPage = Number.isFinite(size) && size >= 1 ? Math.min(Math.floor(size), MAX_PER_PAGE) : DEFAULT_PER_PAGE;
  const index = Number(page);
  const safePage = Number.isFinite(index) && index >= 1 ? Math.floor(index) : undefined;
  return { page: safePage, perPage: safePerPage };
}

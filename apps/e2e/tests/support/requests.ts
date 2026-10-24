import type { Page } from '@playwright/test';

/** A page read the app sent: its query, and whether it was cancelled (aborted) or failed before an answer. */
export interface ListRead {
  query: string;
  failed: boolean;
}

/**
 * Records the page reads of a space's list (`GET /api/app/spaces/:id/<list>?…`, e.g. `assets`, `contents`) from now
 * on, the light lists (`/folders`, `/files`, `/documents`) left out. Each read's `query` without `page` and `size`.
 */
export function recordListReads(page: Page, list: 'assets' | 'contents'): ListRead[] {
  const reads: ListRead[] = [];
  const pattern = new RegExp(`/api/app/spaces/[^/]+/${list}$`);
  const matches = (url: string) => pattern.test(new URL(url).pathname);
  const queryOf = (url: string) => {
    const params = new URL(url).searchParams;
    params.delete('page');
    params.delete('size');
    return params.toString();
  };
  page.on('request', request => {
    if (request.method() === 'GET' && matches(request.url())) reads.push({ query: queryOf(request.url()), failed: false });
  });
  page.on('requestfailed', request => {
    if (!matches(request.url())) return;
    const read = reads.findLast(it => it.query === queryOf(request.url()) && !it.failed);
    if (read) read.failed = true;
  });
  return reads;
}

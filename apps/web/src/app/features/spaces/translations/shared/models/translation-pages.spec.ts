import { HttpParams } from '@angular/common/http';
import { TranslationService } from '@core/services/translation.service';
import { Page, Translation } from '@localess/shared';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { LIST_PAGE_SIZE, TranslationPages } from './translation-pages';

const translation = (i: number): Translation => ({ id: `id-${i}`, key: `key${String(i).padStart(3, '0')}`, locales: {} }) as Translation;

/** A server holding `count` keys (or the given ones), answering pages of the requested size. */
function server(keys: Translation[]) {
  const findPage = vi.fn((_spaceId: string, params: HttpParams) => {
    const page = Number(params.get('page'));
    const size = Number(params.get('size'));
    return of<Page<Translation>>({ items: keys.slice(page * size, (page + 1) * size), page, size, total: keys.length });
  });
  return { service: { findPage } as unknown as TranslationService, findPage };
}

const keys = (count: number) => Array.from({ length: count }, (_, i) => translation(i));
const shown = (pages: TranslationPages) => pages.items().map(it => it.key);

describe('TranslationPages', () => {
  it(`reads the first ${LIST_PAGE_SIZE} keys with the filter`, async () => {
    const { service, findPage } = server(keys(120));
    const pages = new TranslationPages(service);

    await pages.load('space-1', { locale: 'en', search: 'key', label: ['ui', 'cta'], status: [] });

    expect(findPage.mock.calls[0][1].toString()).toBe('page=0&size=50&locale=en&search=key&label=ui&label=cta');
    expect(pages.items()).toHaveLength(50);
    expect(pages.total()).toBe(120);
    expect(pages.hasMore()).toBe(true);
    expect(pages.loading()).toBe(false);
  });

  it('appends the next keys until every key is shown, then reads no more', async () => {
    const { service, findPage } = server(keys(120));
    const pages = new TranslationPages(service);
    await pages.load('space-1', {});

    await pages.loadMore();
    await pages.loadMore();
    await pages.loadMore();

    expect(findPage.mock.calls.map(it => it[1].get('page'))).toEqual(['0', '1', '2']);
    expect(shown(pages)).toEqual(keys(120).map(it => it.key));
    expect(pages.hasMore()).toBe(false);
  });

  it('reads one page at a time: a second request while one runs is ignored', async () => {
    const { service, findPage } = server(keys(120));
    const pages = new TranslationPages(service);
    await pages.load('space-1', {});
    const slow = new Subject<Page<Translation>>();
    findPage.mockImplementationOnce(() => slow);

    const first = pages.loadMore();
    await pages.loadMore();
    slow.next({ items: keys(100).slice(50), page: 1, size: 50, total: 120 });
    slow.complete();
    await first;

    expect(findPage).toHaveBeenCalledTimes(2);
    expect(pages.items()).toHaveLength(100);
  });

  it('a new filter starts again from the first keys', async () => {
    const { service } = server(keys(120));
    const pages = new TranslationPages(service);
    await pages.load('space-1', {});
    await pages.loadMore();

    await pages.load('space-1', { search: 'key00' });

    expect(pages.items()).toHaveLength(50);
  });

  it('a refresh reads again every page loaded, keeping the length; a key shown twice by a shift is shown once', async () => {
    const all = keys(120);
    const { service, findPage } = server(all);
    const pages = new TranslationPages(service);
    await pages.load('space-1', {});
    await pages.loadMore();

    // A key added at the start shifts every page by one.
    all.unshift(translation(999));
    await pages.refresh();

    expect(findPage.mock.calls.slice(2).map(it => it[1].get('page'))).toEqual(['0', '1']);
    expect(pages.items()).toHaveLength(100);
    expect(pages.items()[0].id).toBe('id-999');
    expect(pages.total()).toBe(121);
    expect(new Set(pages.items().map(it => it.id)).size).toBe(100);
  });

  it('drops the answer of a load a newer one replaced', async () => {
    const { service, findPage } = server(keys(120));
    const stale = new Subject<Page<Translation>>();
    findPage.mockImplementationOnce(() => stale);
    const pages = new TranslationPages(service);

    const first = pages.load('space-1', { search: 'old' });
    await pages.load('space-1', {});
    stale.next({ items: [translation(500)], page: 0, size: 50, total: 1 });
    stale.complete();
    await first;

    expect(pages.total()).toBe(120);
    expect(pages.loading()).toBe(false);
  });
});

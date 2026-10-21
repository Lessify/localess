import { HttpParams } from '@angular/common/http';
import { TranslationService } from '@core/services/translation.service';
import { Page, Translation, TranslationNode } from '@localess/shared';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { buildOpenRows, isFiltering, TREE_EXPAND_ALL_MAX, TranslationTree, TranslationTreeRow } from './translation-tree';

const translation = (key: string): Translation => ({ id: `id-${key}`, key, locales: {} }) as Translation;
const node = (path: string, children = 0, isKey = children === 0): TranslationNode => ({
  name: path.split('.').at(-1) ?? path,
  path,
  children,
  ...(isKey ? { translation: translation(path) } : {}),
});

/** A server holding these levels (`parent` → nodes) and these matches for any filter. */
function server(levels: Record<string, TranslationNode[]>, matches: Translation[] = []) {
  const slice = <T>(items: T[], params: HttpParams): Page<T> => {
    const page = Number(params.get('page') ?? 0);
    const size = Number(params.get('size') ?? 100);
    return { items: items.slice(page * size, (page + 1) * size), page, size, total: items.length };
  };
  const findNodes = vi.fn((_spaceId: string, params: HttpParams) => of(slice(levels[params.get('parent') ?? ''] ?? [], params)));
  const findPage = vi.fn((_spaceId: string, params: HttpParams) => of(slice(matches, params)));
  return { service: { findNodes, findPage } as unknown as TranslationService, findNodes, findPage };
}

/** The rows as `key` (`+` open group with its rows, `…` a placeholder), for readable expectations. */
const shape = (rows: TranslationTreeRow[]): unknown[] =>
  rows.map(row => (row.children ? { [row.key]: shape(row.children) } : row.kind === 'node' ? row.key : `…${row.kind}`));

describe('TranslationTree', () => {
  const levels = {
    '': [node('checkout', 2), node('home', 3, true)],
    home: [node('home.cta'), node('home.hero', 2)],
    'home.hero': [node('home.hero.subtitle'), node('home.hero.title')],
  };

  it('reads the top level; a group not opened yet holds one loading row', async () => {
    const { service, findNodes } = server(levels);
    const tree = new TranslationTree(service);

    await tree.load('space-1', {});

    expect(findNodes).toHaveBeenCalledTimes(1);
    expect(shape(tree.rows())).toEqual([{ checkout: ['…loading'] }, { home: ['…loading'] }]);
    expect(tree.rows()[1].translation?.key).toBe('home');
    expect(tree.mode()).toBe('lazy');
  });

  it('reads a level when its group opens, and only once', async () => {
    const { service, findNodes } = server(levels);
    const tree = new TranslationTree(service);
    await tree.load('space-1', {});

    await tree.setExpanded(new Set(['home']));
    await tree.setExpanded(new Set(['home', 'home.hero']));
    await tree.setExpanded(new Set(['home.hero']));
    await tree.setExpanded(new Set(['home', 'home.hero']));

    expect(findNodes.mock.calls.map(it => it[1].get('parent'))).toEqual([null, 'home', 'home.hero']);
    expect(shape(tree.rows())).toEqual([
      { checkout: ['…loading'] },
      { home: ['home.cta', { 'home.hero': ['home.hero.subtitle', 'home.hero.title'] }] },
    ]);
  });

  it('shows "Load more" while a level has more nodes, and reads them on request', async () => {
    const many = Array.from({ length: 150 }, (_, i) => node(`k${String(i).padStart(3, '0')}`));
    const { service } = server({ '': many });
    const tree = new TranslationTree(service);
    await tree.load('space-1', {});

    expect(tree.rows()).toHaveLength(101);
    expect(tree.rows().at(-1)).toMatchObject({ kind: 'more', count: 50, parent: '' });

    await tree.loadMore('');

    expect(tree.rows()).toHaveLength(150);
    expect(tree.rows().every(row => row.kind === 'node')).toBe(true);
  });

  it(`opens every group of a filter with at most ${TREE_EXPAND_ALL_MAX} matches`, async () => {
    const { service, findNodes } = server(levels, [translation('home.hero.title'), translation('checkout.title')]);
    const tree = new TranslationTree(service);

    await tree.load('space-1', { search: 'title' });

    expect(findNodes).not.toHaveBeenCalled();
    expect(tree.mode()).toBe('open');
    expect(tree.matches()).toBe(2);
    expect(tree.expandedKeys()).toEqual(new Set(['home', 'home.hero', 'checkout']));
    expect(shape(tree.rows())).toEqual([{ home: [{ 'home.hero': ['home.hero.title'] }] }, { checkout: ['checkout.title'] }]);
  });

  it('keeps a filter with more matches collapsed, read by level, with the count of matches', async () => {
    const matches = Array.from({ length: TREE_EXPAND_ALL_MAX + 1 }, (_, i) => translation(`home.k${i}`));
    const { service, findPage } = server(levels, matches);
    const tree = new TranslationTree(service);

    await tree.load('space-1', { search: 'k' });

    expect(findPage).toHaveBeenCalledTimes(1);
    expect(tree.mode()).toBe('lazy');
    expect(tree.matches()).toBe(TREE_EXPAND_ALL_MAX + 1);
    expect(tree.expandedKeys()).toEqual(new Set());
  });

  it('restores what was open while browsing when the filter clears', async () => {
    const { service } = server(levels, [translation('checkout.title')]);
    const tree = new TranslationTree(service);
    await tree.load('space-1', {});
    await tree.setExpanded(new Set(['home']));

    await tree.load('space-1', { search: 'checkout' });
    expect(tree.mode()).toBe('open');
    await tree.load('space-1', {});

    expect(tree.mode()).toBe('lazy');
    expect(tree.matches()).toBeUndefined();
    expect(tree.expandedKeys()).toEqual(new Set(['home']));
    expect(shape(tree.rows())[1]).toEqual({ home: ['home.cta', { 'home.hero': ['…loading'] }] });
  });

  it('drops the answer of a load a newer one replaced', async () => {
    const { service, findNodes } = server(levels);
    const stale = new Subject<Page<TranslationNode>>();
    findNodes.mockImplementationOnce(() => stale);
    const tree = new TranslationTree(service);

    const first = tree.load('space-1', {});
    await tree.load('space-2', {});
    stale.next({ items: [node('stale')], page: 0, size: 100, total: 1 });
    stale.complete();
    await first;

    expect(shape(tree.rows())).toEqual([{ checkout: ['…loading'] }, { home: ['…loading'] }]);
    expect(tree.loading()).toBe(false);
  });
});

describe('isFiltering', () => {
  it('ignores the locale and empty values', () => {
    expect(isFiltering({ locale: 'en', search: undefined, label: [] })).toBe(false);
    expect(isFiltering({ locale: 'en', status: ['TRANSLATED'] })).toBe(true);
  });
});

describe('buildOpenRows', () => {
  it('builds the tree from the keys; a node can be a key and a group at once', () => {
    const rows = buildOpenRows([translation('home'), translation('home.title'), translation('footer')]);

    expect(shape(rows)).toEqual([{ home: ['home.title'] }, 'footer']);
    expect(rows[0]).toMatchObject({ count: 1, translation: { key: 'home' } });
  });
});

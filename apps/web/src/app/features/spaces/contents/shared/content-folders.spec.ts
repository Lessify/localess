import type { ContentFolderSummary } from '@localess/shared';
import { breadcrumbs, folderPath, subtreeIds } from './content-folders';

const f = (id: string, slug: string, parentId?: string): ContentFolderSummary => ({ id, slug, name: slug.toUpperCase(), parentId });
const list = [f('a', 'blog'), f('b', '2026', 'a'), f('c', 'june', 'b'), f('d', 'news')];
const map = new Map(list.map(it => [it.id, it]));

describe('content folders', () => {
  it('builds breadcrumbs from the root down to the folder', () => {
    expect(breadcrumbs(map, 'c').map(it => it.id)).toEqual(['a', 'b', 'c']);
    expect(breadcrumbs(map, null)).toEqual([]);
    expect(breadcrumbs(map, 'missing')).toEqual([]);
  });

  it('computes a folder path', () => {
    expect(folderPath(map, 'c')).toBe('blog/2026/june');
    expect(folderPath(map, null)).toBe('');
  });

  it('collects a folder and everything under it', () => {
    expect([...subtreeIds(list, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...subtreeIds(list, 'd')]).toEqual(['d']);
  });
});

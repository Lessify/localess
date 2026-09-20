import { collectGroupKeys, LlTreeNode } from './tree-node.model';

describe('collectGroupKeys', () => {
  const tree: LlTreeNode[] = [
    {
      key: 'home',
      name: 'home',
      children: [
        { key: 'home.title', name: 'title' },
        { key: 'home.nav', name: 'nav', children: [{ key: 'home.nav.back', name: 'back' }] },
      ],
    },
    { key: 'footer', name: 'footer' },
  ];

  it('collects the keys of every node that has children, at any depth', () => {
    expect(collectGroupKeys(tree)).toEqual(new Set(['home', 'home.nav']));
  });

  it('excludes leaf nodes', () => {
    expect(collectGroupKeys(tree).has('home.title')).toBe(false);
    expect(collectGroupKeys(tree).has('footer')).toBe(false);
  });

  it('treats an empty children array as a leaf', () => {
    expect(collectGroupKeys([{ key: 'a', name: 'a', children: [] }])).toEqual(new Set());
  });

  it('returns an empty set for an empty tree', () => {
    expect(collectGroupKeys([])).toEqual(new Set());
  });
});

import { describe, expect, it } from 'vitest';
import { rewriteData, rewriteIds } from './rewrite-references.js';

const maps = {
  assets: new Map([['a1', 'A-1'], ['a2', 'A-2']]),
  contents: new Map([['c1', 'C-1']]),
};

describe('rewriteData', () => {
  it('rewrites ASSET, content LINK and REFERENCE uris at any depth and in locale variants', () => {
    const data = {
      _id: 'root',
      _schema: 'page',
      hero: { kind: 'ASSET', uri: 'a1' },
      gallery: [{ kind: 'ASSET', uri: 'a2' }],
      cta: { kind: 'LINK', type: 'content', uri: 'c1' },
      external: { kind: 'LINK', type: 'url', uri: 'https://example.com' },
      author: { kind: 'REFERENCE', uri: 'c1' },
      blocks: [{ _id: 'b1', _schema: 'card', image_i18n_de: { kind: 'ASSET', uri: 'a1' }, refs: [{ kind: 'REFERENCE', uri: 'c1' }] }],
    };
    const { value, changed, missing } = rewriteData(data, maps);
    expect(changed).toBe(true);
    expect(missing).toEqual([]);
    expect(value).toEqual({
      _id: 'root',
      _schema: 'page',
      hero: { kind: 'ASSET', uri: 'A-1' },
      gallery: [{ kind: 'ASSET', uri: 'A-2' }],
      cta: { kind: 'LINK', type: 'content', uri: 'C-1' },
      external: { kind: 'LINK', type: 'url', uri: 'https://example.com' },
      author: { kind: 'REFERENCE', uri: 'C-1' },
      blocks: [{ _id: 'b1', _schema: 'card', image_i18n_de: { kind: 'ASSET', uri: 'A-1' }, refs: [{ kind: 'REFERENCE', uri: 'C-1' }] }],
    });
  });

  it('keeps unmatched ids and reports them', () => {
    const { value, changed, missing } = rewriteData({ hero: { kind: 'ASSET', uri: 'gone' }, link: { kind: 'LINK', type: 'content', uri: 'lost' } }, maps);
    expect(changed).toBe(false);
    expect(value).toEqual({ hero: { kind: 'ASSET', uri: 'gone' }, link: { kind: 'LINK', type: 'content', uri: 'lost' } });
    expect(missing).toEqual([{ kind: 'asset', id: 'gone' }, { kind: 'content', id: 'lost' }]);
  });

  it('leaves null and plain values alone', () => {
    expect(rewriteData(null, maps)).toEqual({ value: null, changed: false, missing: [] });
    expect(rewriteData({ title: 'a1' }, maps).value).toEqual({ title: 'a1' });
  });
});

describe('rewriteIds', () => {
  it('maps every id, keeps and reports unmatched ones', () => {
    expect(rewriteIds(['a1', 'x'], maps.assets, 'asset')).toEqual({ value: ['A-1', 'x'], changed: true, missing: [{ kind: 'asset', id: 'x' }] });
    expect(rewriteIds(null, maps.assets, 'asset')).toEqual({ value: null, changed: false, missing: [] });
  });
});

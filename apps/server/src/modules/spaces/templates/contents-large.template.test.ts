import { createHash } from 'node:crypto';
import type { ContentData } from '@localess/shared';
import { zContentData } from '@localess/shared/zod';
import { describe, expect, it } from 'vitest';
import { CONTENTS_LARGE_TEMPLATE } from './contents-large.template.js';

const contents = CONTENTS_LARGE_TEMPLATE.contents!;
const byKey = new Map(contents.map(it => [it.key, it]));
const id = (key: string) => {
  if (!byKey.has(key)) throw new Error(`unknown ${key}`);
  return `id-${key}`;
};
const data = (key: string) => ({ _id: id(key), _schema: 'article', ...byKey.get(key)!.data!(id) }) as ContentData;

describe('CONTENTS_LARGE_TEMPLATE', () => {
  it('is a test template in English only', () => {
    expect(CONTENTS_LARGE_TEMPLATE).toMatchObject({ id: 'CONTENTS_LARGE', name: 'Contents (large)', icon: 'lucideFolderTree', test: true });
    expect(CONTENTS_LARGE_TEMPLATE.locales ?? []).toEqual([]);
  });

  it('has 2,000 documents and 67 folders, parents declared first', () => {
    expect(contents.filter(it => it.kind === 'DOCUMENT')).toHaveLength(2_000);
    expect(contents.filter(it => it.kind === 'FOLDER')).toHaveLength(67);
    expect(byKey.size).toBe(contents.length);
    const seen = new Set<string>();
    for (const item of contents) {
      if (item.parent) expect(seen.has(item.parent), item.key).toBe(true);
      seen.add(item.key);
    }
    expect(contents.filter(it => it.parent === 'archive')).toHaveLength(1_000);
    expect(contents.filter(it => it.parent === 'blog/2024/06').map(it => it.name)).toEqual(
      Array.from({ length: 16 }, (_, i) => `Post 2024-06-${String(i + 1).padStart(2, '0')}`),
    );
    expect(contents.filter(it => !it.parent && it.kind === 'DOCUMENT')).toHaveLength(40);
    expect(byKey.get('archive/doc-0001')).toMatchObject({ name: 'Doc 0001', slug: 'doc-0001', schema: 'article' });
  });

  it('fills each document: title, body, the previous document of its folder, a URL', () => {
    expect(data('blog/2024/06/post-03')).toMatchObject({
      title: 'Post 2024-06-03',
      body: 'Body of Post 2024-06-03',
      related: { kind: 'REFERENCE', uri: 'id-blog/2024/06/post-02' },
      link: { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/blog/2024/06/post-03' },
    });
    expect(data('archive/doc-0001')).not.toHaveProperty('related');
    expect(data('archive/doc-1000').related).toEqual({ kind: 'REFERENCE', uri: 'id-archive/doc-0999' });
    for (const item of contents.filter(it => it.kind === 'DOCUMENT')) {
      expect(zContentData.safeParse(data(item.key)).success, item.key).toBe(true);
    }
  });

  it('is stable', () => {
    // The whole tree and every document's data, hashed: a change to either changes the hash.
    const all = contents.map(it => [it.key, it.kind, it.name, it.slug, it.parent, it.data?.(id)]);
    expect(createHash('sha256').update(JSON.stringify(all)).digest('hex')).toBe('bca0ef90886bafab3b6bfb687f9c5c1f18b72b05e55f73dbdcf6081586289913');
  });
});

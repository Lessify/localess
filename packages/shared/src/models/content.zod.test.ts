import { describe, expect, it } from 'vitest';
import { zContentData } from './content.zod.js';

const root = { _id: 'r1', _schema: 'page' };
const link = { kind: 'LINK', type: 'url', target: '_self', uri: 'https://example.com' };
const reference = { kind: 'REFERENCE', uri: 'c1' };
const asset = { kind: 'ASSET', uri: 'a1' };
const richText = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi', marks: [{ type: 'bold' }] }] }] };

const valid = (data: unknown) => zContentData.safeParse(data).success;
const issuePath = (data: unknown) => zContentData.safeParse(data).error?.issues[0]?.path.join('.');

describe('zContentData', () => {
  it('accepts every value shape the editor stores', () => {
    expect(
      valid({
        ...root,
        title: 'Hello',
        title_i18n_de: 'Hallo',
        count: 3,
        visible: true,
        color: '#ff0000',
        tags: ['a', 'b'],
        cta: link,
        author: reference,
        related: [reference, reference],
        hero: asset,
        gallery: [asset],
        body: richText,
        header: { _id: 'b1', _schema: 'hero', title: 'Nested' },
        blocks: [{ _id: 'b2', _schema: 'card', items: [{ _id: 'b3', _schema: 'card' }] }],
        empty: [],
      }),
    ).toBe(true);
  });

  it('requires the root and every block to carry `_id` and `_schema`', () => {
    expect(valid({ _id: 'r1' })).toBe(false);
    expect(valid({ _schema: 'page' })).toBe(false);
    expect(valid({ _id: '', _schema: 'page' })).toBe(false);
    expect(valid({ ...root, header: { _id: 'b1', title: 'no schema' } })).toBe(false);
    expect(valid({ ...root, blocks: [{ _schema: 'card' }] })).toBe(false);
  });

  it('refuses values of no known shape, naming where', () => {
    expect(issuePath({ ...root, nothing: null })).toBe('nothing');
    expect(valid({ ...root, mixed: ['a', 1] })).toBe(false);
    expect(valid({ ...root, odd: { foo: 1 } })).toBe(false);
    expect(valid({ ...root, nan: Number.NaN })).toBe(false);
    expect(valid({ ...root, deep: [{ _id: 'b1', _schema: 'card', bad: { foo: 1 } }] })).toBe(false);
  });

  it('checks links, references and assets', () => {
    expect(valid({ ...root, cta: { ...link, uri: '' } })).toBe(false);
    expect(valid({ ...root, cta: { ...link, type: 'mail' } })).toBe(false);
    expect(valid({ ...root, cta: { ...link, target: undefined } })).toBe(false);
    expect(valid({ ...root, author: { kind: 'REFERENCE' } })).toBe(false);
    expect(valid({ ...root, gallery: [asset, { kind: 'ASSET', uri: '' }] })).toBe(false);
  });

  it('accepts rich text nodes with a type at every level', () => {
    expect(valid({ ...root, body: { type: 'doc' } })).toBe(true);
    expect(valid({ ...root, body: { type: 'doc', content: [{ text: 'no type' }] } })).toBe(false);
  });
});

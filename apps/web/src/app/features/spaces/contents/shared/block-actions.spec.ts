import { ContentData, Schema, SchemaFieldKind, SchemaType } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { blockActions, duplicateBlock, findBlock, moveBlockDown, moveBlockUp, removeBlock } from './block-actions';

const schemas = new Map<string, Schema>(
  [
    {
      id: 'page',
      name: 'page',
      type: SchemaType.ROOT,
      fields: [
        { name: 'hero', kind: SchemaFieldKind.SCHEMA },
        { name: 'body', kind: SchemaFieldKind.SCHEMAS },
      ],
    },
    { id: 'section', name: 'section', type: SchemaType.NODE, fields: [{ name: 'cards', kind: SchemaFieldKind.SCHEMAS }] },
    { id: 'card', name: 'card', type: SchemaType.NODE, fields: [] },
  ].map(it => [it.name, it as unknown as Schema]),
);

function page(): ContentData {
  return {
    _id: 'root',
    _schema: 'page',
    hero: { _id: 'hero', _schema: 'card' },
    body: [
      { _id: 's1', _schema: 'section', cards: [{ _id: 'c1', _schema: 'card', title: 'One' }] },
      { _id: 's2', _schema: 'section' },
    ],
  };
}

describe('findBlock', () => {
  it('finds blocks in single and list fields, at any depth', () => {
    const data = page();

    expect(findBlock(data, 'hero', schemas)).toEqual({ parent: data, field: 'hero' });
    expect(findBlock(data, 's2', schemas)).toEqual({ parent: data, field: 'body', index: 1 });
    expect(findBlock(data, 'c1', schemas)).toEqual({ parent: data['body'][0], field: 'cards', index: 0 });
  });

  it('returns undefined for the root and unknown ids', () => {
    expect(findBlock(page(), 'root', schemas)).toBeUndefined();
    expect(findBlock(page(), 'missing', schemas)).toBeUndefined();
  });
});

describe('blockActions', () => {
  it('offers only the moves a block can make', () => {
    const data = page();

    expect(blockActions({ parent: data, field: 'hero' })).toEqual(['remove']);
    expect(blockActions({ parent: data, field: 'body', index: 0 })).toEqual(['moveDown', 'duplicate', 'remove']);
    expect(blockActions({ parent: data, field: 'body', index: 1 })).toEqual(['moveUp', 'duplicate', 'remove']);
    expect(blockActions({ parent: data['body'][0], field: 'cards', index: 0 })).toEqual(['duplicate', 'remove']);
  });
});

describe('block actions', () => {
  const ids = (data: ContentData) => (data['body'] as ContentData[] | undefined)?.map(it => it._id);

  it('moves a block up and down', () => {
    const data = page();

    moveBlockDown({ parent: data, field: 'body', index: 0 });
    expect(ids(data)).toEqual(['s2', 's1']);
    moveBlockUp({ parent: data, field: 'body', index: 1 });
    expect(ids(data)).toEqual(['s1', 's2']);
  });

  it('ignores a move past either end', () => {
    const data = page();

    moveBlockUp({ parent: data, field: 'body', index: 0 });
    moveBlockDown({ parent: data, field: 'body', index: 1 });
    expect(ids(data)).toEqual(['s1', 's2']);
  });

  it('inserts a copy with new ids right after the block', () => {
    const data = page();

    duplicateBlock({ parent: data, field: 'body', index: 0 });

    const [original, copy] = data['body'] as ContentData[];
    expect(ids(data)).toEqual(['s1', copy._id, 's2']);
    expect(copy._id).not.toBe('s1');
    expect(copy['cards'][0]).toMatchObject({ _schema: 'card', title: 'One' });
    expect(copy['cards'][0]._id).not.toBe(original['cards'][0]._id);
  });

  it('removes a block, and the field with the last one', () => {
    const data = page();

    removeBlock({ parent: data, field: 'body', index: 0 });
    expect(ids(data)).toEqual(['s2']);
    removeBlock({ parent: data, field: 'body', index: 0 });
    expect('body' in data).toBe(false);
    removeBlock({ parent: data, field: 'hero' });
    expect('hero' in data).toBe(false);
  });
});

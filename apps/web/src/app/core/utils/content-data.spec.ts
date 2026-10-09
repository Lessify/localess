import { ContentData } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { copyBlock, normalizeContent } from './content-data';

describe('content data', () => {
  describe('normalizeContent', () => {
    it('deep copies an object without mutating the source', () => {
      const source: Record<string, any> = { a: { b: 1 } };
      const copy = normalizeContent(source);
      copy['a'].b = 2;
      expect(source['a'].b).toBe(1);
    });

    it('deep copies an array without mutating the source', () => {
      const source: Record<string, any>[] = [{ a: 1 }];
      const copy = normalizeContent(source);
      copy[0]['a'] = 2;
      expect(source[0]['a']).toBe(1);
    });

    it('keeps ids', () => {
      expect(normalizeContent<Record<string, any>>({ _id: 'original' })['_id']).toBe('original');
    });

    it('moves the legacy schema key of a block stored before _schema existed', () => {
      expect(normalizeContent<Record<string, any>>({ _id: '1', schema: 'root-1' })).toEqual({ _id: '1', _schema: 'root-1' });
    });

    it('migrates legacy blocks nested in SCHEMA and SCHEMAS fields', () => {
      const legacy = { _id: '1', schema: 'root-1', hero: { _id: '2', schema: 'hero' }, rows: [{ _id: '3', schema: 'row' }] };

      expect(normalizeContent<Record<string, any>>(legacy)).toEqual({
        _id: '1',
        _schema: 'root-1',
        hero: { _id: '2', _schema: 'hero' },
        rows: [{ _id: '3', _schema: 'row' }],
      });
    });

    it('keeps a user field named schema on a block that has _schema', () => {
      expect(normalizeContent<Record<string, any>>({ _id: '1', _schema: 'root-1', schema: 'user value' })).toEqual({
        _id: '1',
        _schema: 'root-1',
        schema: 'user value',
      });
    });

    it('drops null/undefined fields and empty arrays', () => {
      const copy = normalizeContent<Record<string, any>>({ a: null, b: undefined, c: [], d: 'kept' });
      expect(copy).toEqual({ d: 'kept' });
    });

    it('drops nested Link/Reference/Asset objects whose uri is empty', () => {
      const copy = normalizeContent<Record<string, any>>({
        link: { kind: 'LINK', uri: '' },
        reference: { kind: 'REFERENCE', uri: undefined },
        asset: { kind: 'ASSET', uri: 'kept.png' },
      });
      expect(copy['link']).toBeUndefined();
      expect(copy['reference']).toBeUndefined();
      expect(copy['asset']).toEqual({ kind: 'ASSET', uri: 'kept.png' });
    });
  });

  describe('copyBlock', () => {
    it('gives the block and every block inside it a new id, keeping the content', () => {
      const block: ContentData = {
        _id: 'a',
        _schema: 'section',
        title: 'Hello',
        child: { _id: 'b', _schema: 'card' },
        cards: [{ _id: 'c', _schema: 'card' }],
      };

      const copy = copyBlock(block);

      expect(copy).toMatchObject({ _schema: 'section', title: 'Hello' });
      expect([copy._id, copy['child']._id, copy['cards'][0]._id]).not.toContain('a');
      expect(new Set([copy._id, copy['child']._id, copy['cards'][0]._id, 'a', 'b', 'c']).size).toBe(6);
      expect(block._id).toBe('a');
    });

    it('normalizes the copy like normalizeContent', () => {
      expect(copyBlock({ _id: 'a', _schema: 'card', empty: [], link: { kind: 'LINK', uri: '' } } as ContentData)).toEqual({
        _id: expect.any(String),
        _schema: 'card',
      });
    });
  });
});

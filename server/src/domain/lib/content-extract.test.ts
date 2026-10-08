import { describe, expect, it } from 'vitest';

import { ContentData, Schema, SchemaFieldKind, SchemaType } from '../models/index.js';
import { buildDocumentStorage, extractContent } from './content-extract.js';

function schemaOf(fields: { name: string; kind: SchemaFieldKind; translatable?: boolean }[], id = 'root-1'): Schema {
  return { id, type: SchemaType.ROOT, fields } as unknown as Schema;
}

function schemasMap(...schemas: Schema[]): Map<string, Schema> {
  return new Map(schemas.map(it => [(it as unknown as { id: string }).id, it]));
}

/**
 * `extractContent` produces the per-locale JSON the CDN serves, so it is the last place the
 * storage rule is applied before content leaves the system: the default locale lives under the
 * bare field name, every other locale under `{field}_i18n_{locale}`.
 *
 * It is duplicated from `extractContent` in `src/app/shared/utils/content.ts` on the frontend - the two sides of
 * this repo hand-copy their models and this logic with them - so it needs its own guard. A break
 * here is invisible in the editor and only shows up as wrong content on the public API.
 *
 * See docs/concepts.md "How localised values are stored".
 */
describe('extractContent', () => {
  it('serves the locale-suffixed value when the translation exists', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hallo');
  });

  // The whole reason the default locale sits in the bare key: it is the fallback value, so an
  // untranslated field still serves content rather than a blank.
  it('falls back to the bare field name when the translation is missing', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hello');
  });

  it('serves the bare field name for the default locale', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'default').title).toBe('Hello');
  });

  // A non-translatable field has one value shared by every locale, and it lives in the bare key.
  it('ignores locale suffixes for a non-translatable field', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: false }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hello');
  });

  it('never leaks a suffixed key into the served payload', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo', title_i18n_fr: 'Bonjour' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    const result = extractContent(content, schemas, 'de');

    expect(Object.keys(result).some(key => key.includes('_i18n_'))).toBe(false);
    expect(result).toEqual({ _id: '1', _schema: 'root-1', title: 'Hallo' });
  });

  it('applies the rule inside a nested SCHEMA field', () => {
    const content: ContentData = {
      _id: '1',
      _schema: 'root-1',
      hero: { _id: '2', _schema: 'block', label: 'Hello', label_i18n_de: 'Hallo' },
    };
    const schemas = schemasMap(
      schemaOf([{ name: 'hero', kind: SchemaFieldKind.SCHEMA }]),
      schemaOf([{ name: 'label', kind: SchemaFieldKind.TEXT, translatable: true }], 'block'),
    );

    expect(extractContent(content, schemas, 'de').hero).toMatchObject({ label: 'Hallo' });
  });

  it('applies the rule to every entry of a SCHEMAS array', () => {
    const content: ContentData = {
      _id: '1',
      _schema: 'root-1',
      rows: [
        { _id: '2', _schema: 'block', label: 'One', label_i18n_de: 'Eins' },
        { _id: '3', _schema: 'block', label: 'Two' },
      ],
    };
    const schemas = schemasMap(
      schemaOf([{ name: 'rows', kind: SchemaFieldKind.SCHEMAS }]),
      schemaOf([{ name: 'label', kind: SchemaFieldKind.TEXT, translatable: true }], 'block'),
    );

    const rows = extractContent(content, schemas, 'de').rows as ContentData[];

    expect(rows.map(it => it.label)).toEqual(['Eins', 'Two']);
  });

  it('carries only the underscore-prefixed identity fields', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1' };

    expect(extractContent(content, schemasMap(schemaOf([])), 'de')).toEqual({ _id: '1', _schema: 'root-1' });
  });

  it('resolves a legacy block stored with only the schema key, without serving that key', () => {
    const content = { _id: '1', schema: 'root-1', title: 'Hello' } as unknown as ContentData;
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT }]));

    expect(extractContent(content, schemas, 'de')).toEqual({ _id: '1', _schema: 'root-1', title: 'Hello' });
  });

  it('ignores a leftover translatable flag on a REFERENCE field, serving the shared value', () => {
    const shared = { kind: 'REFERENCE', uri: 'doc-en' };
    const content: ContentData = { _id: '1', _schema: 'root-1', author: shared, author_i18n_de: { kind: 'REFERENCE', uri: 'doc-de' } };
    const schemas = schemasMap(schemaOf([{ name: 'author', kind: SchemaFieldKind.REFERENCE, translatable: true }]));

    expect(extractContent(content, schemas, 'de').author).toEqual(shared);
  });

  it('serves a user field named schema as a regular field', () => {
    const content: ContentData = { _id: '1', _schema: 'root-1', schema: 'user value' };
    const schemas = schemasMap(schemaOf([{ name: 'schema', kind: SchemaFieldKind.TEXT }]));

    expect(extractContent(content, schemas, 'de')).toEqual({ _id: '1', _schema: 'root-1', schema: 'user value' });
  });
});

describe('buildDocumentStorage', () => {
  const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));
  const document = {
    id: 'doc-1',
    name: 'Home',
    slug: 'home',
    parentSlug: '',
    fullSlug: 'home',
    data: JSON.stringify({ _id: 'b1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' }),
    assets: ['a1'],
    links: [],
    references: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  it('builds the per-locale document, accepting data stored as a JSON string', () => {
    expect(buildDocumentStorage(document, schemas, 'de')).toEqual({
      id: 'doc-1',
      name: 'Home',
      kind: 'DOCUMENT',
      locale: 'de',
      slug: 'home',
      fullSlug: 'home',
      parentSlug: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      data: { _id: 'b1', _schema: 'root-1', title: 'Hallo' },
      assets: ['a1'],
    });
  });

  it('stamps publishedAt only when given, and omits empty id arrays', () => {
    const published = buildDocumentStorage({ ...document, data: null, assets: [] }, schemas, 'en', '2026-02-01T00:00:00.000Z');
    expect(published.publishedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(published).not.toHaveProperty('data');
    expect(published).not.toHaveProperty('assets');
    expect(published).not.toHaveProperty('links');
    expect(buildDocumentStorage(document, schemas, 'en')).not.toHaveProperty('publishedAt');
  });
});

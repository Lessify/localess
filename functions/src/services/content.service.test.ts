import { describe, expect, it, vi } from 'vitest';

// `content.service.ts` pulls in `../config`, which initializes Firebase on import. `extractContent`
// itself is pure, so the module's side effects are stubbed out rather than exercised.
vi.mock('../config', () => ({
  bucket: {},
  firestoreService: {},
}));

import { ContentData, Schema, SchemaFieldKind, SchemaType } from '../models';
import { extractContent } from './content.service';

function schemaOf(fields: { name: string; kind: SchemaFieldKind; translatable?: boolean }[], id = 'root-1'): Schema {
  return { id, type: SchemaType.ROOT, fields } as unknown as Schema;
}

function schemasMap(...schemas: Schema[]): Map<string, Schema> {
  return new Map(schemas.map(it => [it.id, it]));
}

/**
 * `extractContent` produces the per-locale JSON the CDN serves, so it is the last place the
 * storage rule is applied before content leaves the system: the default locale lives under the
 * bare field name, every other locale under `{field}_i18n_{locale}`.
 *
 * It is duplicated from `ContentHelperService.extractContent` on the frontend - the two sides of
 * this repo hand-copy their models and this logic with them - so it needs its own guard. A break
 * here is invisible in the editor and only shows up as wrong content on the public API.
 *
 * See docs/concepts.md "How localised values are stored".
 */
describe('extractContent', () => {
  it('serves the locale-suffixed value when the translation exists', () => {
    const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hallo');
  });

  // The whole reason the default locale sits in the bare key: it is the fallback value, so an
  // untranslated field still serves content rather than a blank.
  it('falls back to the bare field name when the translation is missing', () => {
    const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hello');
  });

  it('serves the bare field name for the default locale', () => {
    const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    expect(extractContent(content, schemas, 'default').title).toBe('Hello');
  });

  // A non-translatable field has one value shared by every locale, and it lives in the bare key.
  it('ignores locale suffixes for a non-translatable field', () => {
    const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: false }]));

    expect(extractContent(content, schemas, 'de').title).toBe('Hello');
  });

  it('never leaks a suffixed key into the served payload', () => {
    const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo', title_i18n_fr: 'Bonjour' };
    const schemas = schemasMap(schemaOf([{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }]));

    const result = extractContent(content, schemas, 'de');

    expect(Object.keys(result).some(key => key.includes('_i18n_'))).toBe(false);
    expect(result).toEqual({ _id: '1', _schema: 'root-1', schema: 'root-1', title: 'Hallo' });
  });

  it('applies the rule inside a nested SCHEMA field', () => {
    const content: ContentData = {
      _id: '1',
      schema: 'root-1',
      hero: { _id: '2', schema: 'block', label: 'Hello', label_i18n_de: 'Hallo' },
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
      schema: 'root-1',
      rows: [
        { _id: '2', schema: 'block', label: 'One', label_i18n_de: 'Eins' },
        { _id: '3', schema: 'block', label: 'Two' },
      ],
    };
    const schemas = schemasMap(
      schemaOf([{ name: 'rows', kind: SchemaFieldKind.SCHEMAS }]),
      schemaOf([{ name: 'label', kind: SchemaFieldKind.TEXT, translatable: true }], 'block'),
    );

    const rows = extractContent(content, schemas, 'de').rows as ContentData[];

    expect(rows.map(it => it.label)).toEqual(['Eins', 'Two']);
  });

  it('carries the identity fields and defaults _schema to schema', () => {
    const content: ContentData = { _id: '1', schema: 'root-1' };

    expect(extractContent(content, schemasMap(schemaOf([])), 'de')).toEqual({ _id: '1', _schema: 'root-1', schema: 'root-1' });
  });
});

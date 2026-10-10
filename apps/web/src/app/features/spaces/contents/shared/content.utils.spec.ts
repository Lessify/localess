import { CONTENT_DEFAULT_LOCALE, ContentAsset, ContentData, ContentReference, extractContent, SchemaComponent, SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { collectTranslatableFields, extractReferences, extractSchemaContent } from './content.utils';

function field(partial: Partial<SchemaField> & Pick<SchemaField, 'name' | 'kind'>): SchemaField {
  return partial as SchemaField;
}

function rootSchema(fields: SchemaField[], id = 'root-1'): SchemaComponent {
  return { id, name: id, type: SchemaType.ROOT, fields } as SchemaComponent;
}

describe('content utils', () => {
  describe('extractSchemaContent', () => {
    it('reads the default-locale value for non-translatable fields regardless of locale', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: false })]);
      const data: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello' };
      expect(extractSchemaContent(data, schema, 'fr', false)).toEqual({ title: 'Hello' });
    });

    it('reads the locale-suffixed value for translatable fields on a non-default locale', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const data: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(extractSchemaContent(data, schema, 'fr', false)).toEqual({ title: 'Bonjour' });
    });

    it('reads the base value for translatable fields on the default locale', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const data: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(extractSchemaContent(data, schema, CONTENT_DEFAULT_LOCALE.id, false)).toEqual({ title: 'Hello' });
    });

    it('omits SCHEMA/SCHEMAS fields unless full=true', () => {
      const schema = rootSchema([
        field({ name: 'title', kind: SchemaFieldKind.TEXT }),
        field({ name: 'child', kind: SchemaFieldKind.SCHEMA }),
      ]);
      const data: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', child: { _id: '2', _schema: 'x' } };
      expect(extractSchemaContent(data, schema, 'default', false)).toEqual({ title: 'Hello' });
      expect(extractSchemaContent(data, schema, 'default', true)).toEqual({ title: 'Hello', child: { _id: '2', _schema: 'x' } });
    });

    it('only includes array-kind fields (OPTIONS/REFERENCES/ASSETS/SCHEMAS) when the value is actually an array', () => {
      const schema = rootSchema([field({ name: 'tags', kind: SchemaFieldKind.OPTIONS })]);
      const arrayData: ContentData = { _id: '1', _schema: 'root-1', tags: ['a', 'b'] };
      const scalarData: ContentData = { _id: '1', _schema: 'root-1', tags: 'not-an-array' };
      expect(extractSchemaContent(arrayData, schema, 'default', true)).toEqual({ tags: ['a', 'b'] });
      expect(extractSchemaContent(scalarData, schema, 'default', true)).toEqual({});
    });

    it('skips fields whose value is undefined', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT })]);
      const data: ContentData = { _id: '1', _schema: 'root-1' };
      expect(extractSchemaContent(data, schema, 'default', true)).toEqual({});
    });
  });

  describe('extractContent', () => {
    it('always carries _id and _schema', () => {
      const schemas = new Map([['root-1', rootSchema([])]]);
      const content: ContentData = { _id: '1', _schema: 'root-1' };
      expect(extractContent(content, schemas, 'default')).toEqual({ _id: '1', _schema: 'root-1' });
    });

    it('falls back to the base value when the locale-suffixed value is missing for a translatable field', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const schemas = new Map([['root-1', schema]]);
      const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello' };
      expect(extractContent(content, schemas, 'fr')).toEqual({ _id: '1', _schema: 'root-1', title: 'Hello' });
    });

    it('prefers the locale-suffixed value for a translatable field when present', () => {
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const schemas = new Map([['root-1', schema]]);
      const content: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(extractContent(content, schemas, 'fr')).toEqual({
        _id: '1',
        _schema: 'root-1',
        title: 'Bonjour',
      });
    });

    it('recurses into a nested SCHEMA field', () => {
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT })]);
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })]);
      const schemas = new Map([
        ['root-1', parentSchema],
        ['child-1', childSchema],
      ]);
      const content: ContentData = {
        _id: '1',
        _schema: 'root-1',
        child: { _id: '2', _schema: 'child-1', label: 'Nested' },
      };
      expect(extractContent(content, schemas, 'default')['child']).toEqual({
        _id: '2',
        _schema: 'child-1',
        label: 'Nested',
      });
    });

    it('recurses into a nested SCHEMAS array field', () => {
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT })]);
      const parentSchema = rootSchema([field({ name: 'children', kind: SchemaFieldKind.SCHEMAS })]);
      const schemas = new Map([
        ['root-1', parentSchema],
        ['child-1', childSchema],
      ]);
      const content: ContentData = {
        _id: '1',
        _schema: 'root-1',
        children: [{ _id: '2', _schema: 'child-1', label: 'A' }],
      };
      expect(extractContent(content, schemas, 'default')['children']).toEqual([{ _id: '2', _schema: 'child-1', label: 'A' }]);
    });
  });



  describe('extractReferences', () => {
    it('returns empty sets for undefined data', () => {
      expect(extractReferences(undefined, [], 'default')).toEqual([new Set(), new Set(), new Set()]);
    });

    it('collects asset, link and reference uris from top-level fields', () => {
      const schema = rootSchema([
        field({ name: 'cover', kind: SchemaFieldKind.ASSET }),
        field({ name: 'link', kind: SchemaFieldKind.LINK }),
        field({ name: 'ref', kind: SchemaFieldKind.REFERENCE }),
      ]);
      const data: ContentData = {
        _id: '1',
        _schema: 'root-1',
        cover: { kind: 'ASSET', uri: 'asset-1' } as ContentAsset,
        link: { kind: 'LINK', type: 'content', target: '_self', uri: 'link-1' },
        ref: { kind: 'REFERENCE', uri: 'ref-1' } as ContentReference,
      };
      const [assets, links, references] = extractReferences(data, [schema], 'default');
      expect(assets).toEqual(new Set(['asset-1']));
      expect(links).toEqual(new Set(['link-1']));
      expect(references).toEqual(new Set(['ref-1']));
    });

    it('collects uris from ASSETS/REFERENCES arrays', () => {
      const schema = rootSchema([field({ name: 'assets', kind: SchemaFieldKind.ASSETS })]);
      const data: ContentData = {
        _id: '1',
        _schema: 'root-1',
        assets: [
          { kind: 'ASSET', uri: 'asset-1' },
          { kind: 'ASSET', uri: 'asset-2' },
        ],
      };
      const [assets] = extractReferences(data, [schema], 'default');
      expect(assets).toEqual(new Set(['asset-1', 'asset-2']));
    });

    it('recurses into nested SCHEMA/SCHEMAS content', () => {
      const childSchema = rootSchema([field({ name: 'cover', kind: SchemaFieldKind.ASSET })], 'child-1');
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })], 'root-1');
      const data: ContentData = {
        _id: '1',
        _schema: 'root-1',
        child: { _id: '2', _schema: 'child-1', cover: { kind: 'ASSET', uri: 'nested-asset' } },
      };
      const [assets] = extractReferences(data, [parentSchema, childSchema], 'default');
      expect(assets).toEqual(new Set(['nested-asset']));
    });
  });

  describe('collectTranslatableFields', () => {
    function nodeSchema(fields: SchemaField[], id: string): SchemaComponent {
      return { id, name: id, type: SchemaType.NODE, fields } as SchemaComponent;
    }

    it('collects a translatable TEXT field whose target is empty', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      const fields = collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(fields).toHaveLength(1);
      expect(fields[0].content).toBe('Hello');
      expect(fields[0].format).toBe('text');
    });

    it('applies a translation onto the target locale key, leaving the source alone', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')[0].apply('Hallo');

      expect(data['title_i18n_de']).toBe('Hallo');
      expect(data['title']).toBe('Hello');
    });

    it('skips a field whose target already has a value', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('includes a filled target when overwrite is requested', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de', { overwrite: true })).toHaveLength(1);
    });

    it('skips fields that are not translatable and kinds that are not text', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello', count: 5 };
      const schemas = [
        rootSchema([
          field({ name: 'title', kind: SchemaFieldKind.TEXT }),
          field({ name: 'count', kind: SchemaFieldKind.NUMBER, translatable: true }),
        ]),
      ];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('skips a field with no source value', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: '' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('reads the locale-suffixed key when the source is not the default locale', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, 'fr', 'de')[0].content).toBe('Bonjour');
    });

    it('recurses into SCHEMA and SCHEMAS children', () => {
      const data: ContentData = {
        _id: 'c1',
        _schema: 'root-1',
        hero: { _id: 'c2', _schema: 'block', title: 'Hero' },
        rows: [
          { _id: 'c3', _schema: 'block', title: 'One' },
          { _id: 'c4', _schema: 'block', title: 'Two' },
        ],
      };
      const schemas = [
        rootSchema([field({ name: 'hero', kind: SchemaFieldKind.SCHEMA }), field({ name: 'rows', kind: SchemaFieldKind.SCHEMAS })]),
        nodeSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })], 'block'),
      ];

      const fields = collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(fields.map(it => it.content).sort()).toEqual(['Hero', 'One', 'Two']);
    });

    // RICH_TEXT travels as HTML because that is the only shape a provider can translate without
    // flattening the document.
    it('serializes RICH_TEXT to HTML and parses the translation back to a document', () => {
      const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] };
      const data: ContentData = { _id: 'c1', _schema: 'root-1', body: doc };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      const fields = collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');
      expect(fields[0].format).toBe('html');
      expect(fields[0].content).toBe('<p>Hello</p>');

      fields[0].apply('<p>Hallo</p>');

      expect(data['body_i18n_de']).toMatchObject({ type: 'doc' });
      expect(data['body_i18n_de'].content[0].content[0].text).toBe('Hallo');
    });

    it('skips an empty RICH_TEXT document', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', body: { type: 'doc', content: [{ type: 'paragraph' }] } };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    // Whitespace is nothing to translate: sending it costs a provider request and returns
    // whitespace back.
    it('skips a source value that is only whitespace', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: '   ' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('treats a whitespace-only target as empty and fills it', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title: 'Hello', title_i18n_de: '  ' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toHaveLength(1);
    });

    it('skips a RICH_TEXT document whose only text is whitespace', () => {
      const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }] };
      const data: ContentData = { _id: 'c1', _schema: 'root-1', body: doc };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      expect(collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    // The default locale's value lives under the bare field name, at either end of the translation.
    it('writes to the bare field name when the target is the default locale', () => {
      const data: ContentData = { _id: 'c1', _schema: 'root-1', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      const fields = collectTranslatableFields(data, schemas, 'de', CONTENT_DEFAULT_LOCALE.id);
      expect(fields).toHaveLength(1);
      expect(fields[0].content).toBe('Hallo');

      fields[0].apply('Hello');

      expect(data['title']).toBe('Hello');
      expect(data['title_i18n_default']).toBeUndefined();
    });

    it('gives every field a unique id', () => {
      const data: ContentData = {
        _id: 'c1',
        _schema: 'root-1',
        rows: [
          { _id: 'c2', _schema: 'block', title: 'One' },
          { _id: 'c3', _schema: 'block', title: 'Two' },
        ],
      };
      const schemas = [
        rootSchema([field({ name: 'rows', kind: SchemaFieldKind.SCHEMAS })]),
        nodeSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })], 'block'),
      ];

      const ids = collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de').map(it => it.id);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

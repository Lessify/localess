import { TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { ContentAsset, ContentData, ContentReference } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE } from '@shared/models/locale.model';
import { SchemaComponent, SchemaField, SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { describe, expect, it } from 'vitest';
import { ContentHelperService } from './content-helper.service';

function field(partial: Partial<SchemaField> & Pick<SchemaField, 'name' | 'kind'>): SchemaField {
  return partial as SchemaField;
}

function rootSchema(fields: SchemaField[], id = 'root-1'): SchemaComponent {
  return { id, type: SchemaType.ROOT, fields } as SchemaComponent;
}

function setup() {
  return { service: TestBed.inject(ContentHelperService) };
}

describe('ContentHelperService', () => {
  describe('generateSchemaForm', () => {
    it('builds a required control only when the field is required and locale is default', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, required: true })]);

      const requiredOnDefault = service.generateSchemaForm(schema, true);
      expect(requiredOnDefault.controls['title'].errors).toEqual({ required: true });

      const notRequiredOnNonDefault = service.generateSchemaForm(schema, false);
      expect(notRequiredOnNonDefault.controls['title'].errors).toBeNull();
    });

    it('applies minLength/maxLength validators for text-like fields', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, minLength: 3, maxLength: 5 })]);
      const form = service.generateSchemaForm(schema, true);
      form.controls['title'].setValue('ab');
      expect(form.controls['title'].errors).toEqual({ minlength: { requiredLength: 3, actualLength: 2 } });
      form.controls['title'].setValue('abcdef');
      expect(form.controls['title'].errors).toEqual({ maxlength: { requiredLength: 5, actualLength: 6 } });
    });

    it('applies min/max validators for number fields', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'count', kind: SchemaFieldKind.NUMBER, minValue: 1, maxValue: 10 })]);
      const form = service.generateSchemaForm(schema, true);
      form.controls['count'].setValue(0);
      expect(form.controls['count'].errors).toEqual({ min: { min: 1, actual: 0 } });
      form.controls['count'].setValue(11);
      expect(form.controls['count'].errors).toEqual({ max: { max: 10, actual: 11 } });
    });

    it('disables non-translatable fields on non-default locales, and keeps translatable fields enabled', () => {
      const { service } = setup();
      const schema = rootSchema([
        field({ name: 'nonTranslatable', kind: SchemaFieldKind.TEXT, translatable: false }),
        field({ name: 'translatable', kind: SchemaFieldKind.TEXT, translatable: true }),
      ]);
      const form = service.generateSchemaForm(schema, false);
      expect(form.controls['nonTranslatable'].disabled).toBe(true);
      expect(form.controls['translatable'].disabled).toBe(false);
    });

    it('never disables fields on the default locale, translatable or not', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'nonTranslatable', kind: SchemaFieldKind.TEXT, translatable: false })]);
      const form = service.generateSchemaForm(schema, true);
      expect(form.controls['nonTranslatable'].disabled).toBe(false);
    });

    it('builds a nested FormGroup with kind/uri controls for LINK, REFERENCE and ASSET', () => {
      const { service } = setup();
      const schema = rootSchema([
        field({ name: 'link', kind: SchemaFieldKind.LINK }),
        field({ name: 'reference', kind: SchemaFieldKind.REFERENCE }),
        field({ name: 'asset', kind: SchemaFieldKind.ASSET }),
      ]);
      const form = service.generateSchemaForm(schema, true);
      expect(form.controls['link']).toBeInstanceOf(FormGroup);
      expect((form.controls['link'] as FormGroup).controls['kind'].value).toBe(SchemaFieldKind.LINK);
      expect((form.controls['reference'] as FormGroup).controls['kind'].value).toBe(SchemaFieldKind.REFERENCE);
      expect((form.controls['asset'] as FormGroup).controls['kind'].value).toBe(SchemaFieldKind.ASSET);
    });

    it('builds an empty FormArray for REFERENCES/ASSETS, requiring at least one item when required', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'references', kind: SchemaFieldKind.REFERENCES, required: true })]);
      const form = service.generateSchemaForm(schema, true);
      const fa = form.controls['references'] as FormArray;
      expect(fa.length).toBe(0);
      expect(fa.errors).not.toBeNull();
      fa.push(service.referenceContentToForm({ kind: 'REFERENCE', uri: 'id-1' }));
      expect(fa.errors).toBeNull();
    });
  });

  describe('extractSchemaContent', () => {
    it('reads the default-locale value for non-translatable fields regardless of locale', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: false })]);
      const data: ContentData = { _id: '1', schema: 'root-1', title: 'Hello' };
      expect(service.extractSchemaContent(data, schema, 'fr', false)).toEqual({ title: 'Hello' });
    });

    it('reads the locale-suffixed value for translatable fields on a non-default locale', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const data: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(service.extractSchemaContent(data, schema, 'fr', false)).toEqual({ title: 'Bonjour' });
    });

    it('reads the base value for translatable fields on the default locale', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const data: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(service.extractSchemaContent(data, schema, CONTENT_DEFAULT_LOCALE.id, false)).toEqual({ title: 'Hello' });
    });

    it('omits SCHEMA/SCHEMAS fields unless full=true', () => {
      const { service } = setup();
      const schema = rootSchema([
        field({ name: 'title', kind: SchemaFieldKind.TEXT }),
        field({ name: 'child', kind: SchemaFieldKind.SCHEMA }),
      ]);
      const data: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', child: { _id: '2', schema: 'x' } };
      expect(service.extractSchemaContent(data, schema, 'default', false)).toEqual({ title: 'Hello' });
      expect(service.extractSchemaContent(data, schema, 'default', true)).toEqual({ title: 'Hello', child: { _id: '2', schema: 'x' } });
    });

    it('only includes array-kind fields (OPTIONS/REFERENCES/ASSETS/SCHEMAS) when the value is actually an array', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'tags', kind: SchemaFieldKind.OPTIONS })]);
      const arrayData: ContentData = { _id: '1', schema: 'root-1', tags: ['a', 'b'] };
      const scalarData: ContentData = { _id: '1', schema: 'root-1', tags: 'not-an-array' };
      expect(service.extractSchemaContent(arrayData, schema, 'default', true)).toEqual({ tags: ['a', 'b'] });
      expect(service.extractSchemaContent(scalarData, schema, 'default', true)).toEqual({});
    });

    it('skips fields whose value is undefined', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT })]);
      const data: ContentData = { _id: '1', schema: 'root-1' };
      expect(service.extractSchemaContent(data, schema, 'default', true)).toEqual({});
    });
  });

  describe('extractContent', () => {
    it('always carries _id/_schema/schema and falls back _schema to schema', () => {
      const { service } = setup();
      const schemas = new Map([['root-1', rootSchema([])]]);
      const content: ContentData = { _id: '1', schema: 'root-1' };
      expect(service.extractContent(content, schemas, 'default')).toEqual({ _id: '1', _schema: 'root-1', schema: 'root-1' });
    });

    it('falls back to the base value when the locale-suffixed value is missing for a translatable field', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const schemas = new Map([['root-1', schema]]);
      const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello' };
      expect(service.extractContent(content, schemas, 'fr')).toEqual({ _id: '1', _schema: 'root-1', schema: 'root-1', title: 'Hello' });
    });

    it('prefers the locale-suffixed value for a translatable field when present', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })]);
      const schemas = new Map([['root-1', schema]]);
      const content: ContentData = { _id: '1', schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      expect(service.extractContent(content, schemas, 'fr')).toEqual({
        _id: '1',
        _schema: 'root-1',
        schema: 'root-1',
        title: 'Bonjour',
      });
    });

    it('recurses into a nested SCHEMA field', () => {
      const { service } = setup();
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT })]);
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })]);
      const schemas = new Map([
        ['root-1', parentSchema],
        ['child-1', childSchema],
      ]);
      const content: ContentData = {
        _id: '1',
        schema: 'root-1',
        child: { _id: '2', schema: 'child-1', label: 'Nested' },
      };
      expect(service.extractContent(content, schemas, 'default')['child']).toEqual({
        _id: '2',
        _schema: 'child-1',
        schema: 'child-1',
        label: 'Nested',
      });
    });

    it('recurses into a nested SCHEMAS array field', () => {
      const { service } = setup();
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT })]);
      const parentSchema = rootSchema([field({ name: 'children', kind: SchemaFieldKind.SCHEMAS })]);
      const schemas = new Map([
        ['root-1', parentSchema],
        ['child-1', childSchema],
      ]);
      const content: ContentData = {
        _id: '1',
        schema: 'root-1',
        children: [{ _id: '2', schema: 'child-1', label: 'A' }],
      };
      expect(service.extractContent(content, schemas, 'default')['children']).toEqual([
        { _id: '2', _schema: 'child-1', schema: 'child-1', label: 'A' },
      ]);
    });
  });

  describe('clone', () => {
    it('deep clones an object without mutating the source', () => {
      const { service } = setup();
      const source: Record<string, any> = { a: { b: 1 } };
      const cloned = service.clone(source);
      cloned['a'].b = 2;
      expect(source['a'].b).toBe(1);
    });

    it('deep clones an array without mutating the source', () => {
      const { service } = setup();
      const source: Record<string, any>[] = [{ a: 1 }];
      const cloned = service.clone(source);
      cloned[0]['a'] = 2;
      expect(source[0]['a']).toBe(1);
    });

    it('generates a new _id only when generateNewID is true', () => {
      const { service } = setup();
      const source: Record<string, any> = { _id: 'original' };
      expect(service.clone(source)['_id']).toBe('original');
      expect(service.clone(source, false)['_id']).toBe('original');
      expect(service.clone(source, true)['_id']).not.toBe('original');
    });

    it('backfills _schema from schema when _schema is missing', () => {
      const { service } = setup();
      expect(service.clone<Record<string, any>>({ schema: 'root-1' })['_schema']).toBe('root-1');
      expect(service.clone<Record<string, any>>({ schema: 'root-1', _schema: 'explicit' })['_schema']).toBe('explicit');
    });

    it('drops null/undefined fields and empty arrays', () => {
      const { service } = setup();
      const cloned = service.clone<Record<string, any>>({ a: null, b: undefined, c: [], d: 'kept' });
      expect(cloned).toEqual({ d: 'kept' });
    });

    it('drops nested Link/Reference/Asset objects whose uri is empty', () => {
      const { service } = setup();
      const cloned = service.clone<Record<string, any>>({
        link: { kind: 'LINK', uri: '' },
        reference: { kind: 'REFERENCE', uri: undefined },
        asset: { kind: 'ASSET', uri: 'kept.png' },
      });
      expect(cloned['link']).toBeUndefined();
      expect(cloned['reference']).toBeUndefined();
      expect(cloned['asset']).toEqual({ kind: 'ASSET', uri: 'kept.png' });
    });
  });

  describe('validateContent', () => {
    it('reports no errors when all required fields are present', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, required: true })]);
      const data: ContentData = { _id: '1', schema: 'root-1', title: 'Hello' };
      expect(service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id)).toEqual([]);
    });

    it('reports an error for a missing required field', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, required: true, displayName: 'Title' })]);
      const data: ContentData = { _id: '1', schema: 'root-1' };
      const errors = service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ contentId: '1', fieldName: 'title', fieldDisplayName: 'Title' });
    });

    it('reports a required error for an empty required REFERENCES array', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'refs', kind: SchemaFieldKind.REFERENCES, required: true })]);
      const data: ContentData = { _id: '1', schema: 'root-1' };
      const errors = service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toEqual([
        expect.objectContaining({ fieldName: 'refs', errors: { required: true, minlength: { requiredLength: 1, actualLength: 0 } } }),
      ]);
    });

    it('validates recursively into nested SCHEMA content', () => {
      const { service } = setup();
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT, required: true })], 'child-1');
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })], 'root-1');
      const data: ContentData = { _id: '1', schema: 'root-1', child: { _id: '2', schema: 'child-1' } };
      const errors = service.validateContent(data, [parentSchema, childSchema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toEqual([expect.objectContaining({ contentId: '2', fieldName: 'label' })]);
    });
  });

  describe('extractReferences', () => {
    it('returns empty sets for undefined data', () => {
      const { service } = setup();
      expect(service.extractReferences(undefined, [], 'default')).toEqual([new Set(), new Set(), new Set()]);
    });

    it('collects asset, link and reference uris from top-level fields', () => {
      const { service } = setup();
      const schema = rootSchema([
        field({ name: 'cover', kind: SchemaFieldKind.ASSET }),
        field({ name: 'link', kind: SchemaFieldKind.LINK }),
        field({ name: 'ref', kind: SchemaFieldKind.REFERENCE }),
      ]);
      const data: ContentData = {
        _id: '1',
        schema: 'root-1',
        cover: { kind: 'ASSET', uri: 'asset-1' } as ContentAsset,
        link: { kind: 'LINK', type: 'content', target: '_self', uri: 'link-1' },
        ref: { kind: 'REFERENCE', uri: 'ref-1' } as ContentReference,
      };
      const [assets, links, references] = service.extractReferences(data, [schema], 'default');
      expect(assets).toEqual(new Set(['asset-1']));
      expect(links).toEqual(new Set(['link-1']));
      expect(references).toEqual(new Set(['ref-1']));
    });

    it('collects uris from ASSETS/REFERENCES arrays', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'assets', kind: SchemaFieldKind.ASSETS })]);
      const data: ContentData = {
        _id: '1',
        schema: 'root-1',
        assets: [
          { kind: 'ASSET', uri: 'asset-1' },
          { kind: 'ASSET', uri: 'asset-2' },
        ],
      };
      const [assets] = service.extractReferences(data, [schema], 'default');
      expect(assets).toEqual(new Set(['asset-1', 'asset-2']));
    });

    it('recurses into nested SCHEMA/SCHEMAS content', () => {
      const { service } = setup();
      const childSchema = rootSchema([field({ name: 'cover', kind: SchemaFieldKind.ASSET })], 'child-1');
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })], 'root-1');
      const data: ContentData = {
        _id: '1',
        schema: 'root-1',
        child: { _id: '2', schema: 'child-1', cover: { kind: 'ASSET', uri: 'nested-asset' } },
      };
      const [assets] = service.extractReferences(data, [parentSchema, childSchema], 'default');
      expect(assets).toEqual(new Set(['nested-asset']));
    });
  });

  describe('assetContentToForm', () => {
    it('builds a FormGroup mirroring the asset uri/kind', () => {
      const { service } = setup();
      const form = service.assetContentToForm({ kind: 'ASSET', uri: 'asset-1' });
      expect(form.value).toEqual({ uri: 'asset-1', kind: 'ASSET' });
    });
  });

  describe('referenceContentToForm', () => {
    it('builds a FormGroup mirroring the reference uri/kind', () => {
      const { service } = setup();
      const form = service.referenceContentToForm({ kind: 'REFERENCE', uri: 'ref-1' });
      expect(form.value).toEqual({ uri: 'ref-1', kind: 'REFERENCE' });
    });
  });
describe('collectTranslatableFields', () => {
    function nodeSchema(fields: SchemaField[], id: string): SchemaComponent {
      return { id, type: SchemaType.NODE, fields } as SchemaComponent;
    }

    it('collects a translatable TEXT field whose target is empty', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      const fields = service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(fields).toHaveLength(1);
      expect(fields[0].content).toBe('Hello');
      expect(fields[0].format).toBe('text');
    });

    it('applies a translation onto the target locale key, leaving the source alone', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')[0].apply('Hallo');

      expect(data['title_i18n_de']).toBe('Hallo');
      expect(data['title']).toBe('Hello');
    });

    it('skips a field whose target already has a value', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('includes a filled target when overwrite is requested', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de', { overwrite: true })).toHaveLength(1);
    });

    it('skips fields that are not translatable and kinds that are not text', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello', count: 5 };
      const schemas = [
        rootSchema([
          field({ name: 'title', kind: SchemaFieldKind.TEXT }),
          field({ name: 'count', kind: SchemaFieldKind.NUMBER, translatable: true }),
        ]),
      ];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('skips a field with no source value', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: '' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('reads the locale-suffixed key when the source is not the default locale', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello', title_i18n_fr: 'Bonjour' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, 'fr', 'de')[0].content).toBe('Bonjour');
    });

    it('recurses into SCHEMA and SCHEMAS children', () => {
      const { service } = setup();
      const data: ContentData = {
        _id: 'c1',
        schema: 'root-1',
        hero: { _id: 'c2', schema: 'block', title: 'Hero' },
        rows: [
          { _id: 'c3', schema: 'block', title: 'One' },
          { _id: 'c4', schema: 'block', title: 'Two' },
        ],
      };
      const schemas = [
        rootSchema([field({ name: 'hero', kind: SchemaFieldKind.SCHEMA }), field({ name: 'rows', kind: SchemaFieldKind.SCHEMAS })]),
        nodeSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })], 'block'),
      ];

      const fields = service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(fields.map(it => it.content).sort()).toEqual(['Hero', 'One', 'Two']);
    });

    // RICH_TEXT travels as HTML because that is the only shape a provider can translate without
    // flattening the document.
    it('serializes RICH_TEXT to HTML and parses the translation back to a document', () => {
      const { service } = setup();
      const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] };
      const data: ContentData = { _id: 'c1', schema: 'root-1', body: doc };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      const fields = service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de');
      expect(fields[0].format).toBe('html');
      expect(fields[0].content).toBe('<p>Hello</p>');

      fields[0].apply('<p>Hallo</p>');

      expect(data['body_i18n_de']).toMatchObject({ type: 'doc' });
      expect(data['body_i18n_de'].content[0].content[0].text).toBe('Hallo');
    });

    it('skips an empty RICH_TEXT document', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', body: { type: 'doc', content: [{ type: 'paragraph' }] } };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    // Whitespace is nothing to translate: sending it costs a provider request and returns
    // whitespace back.
    it('skips a source value that is only whitespace', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: '   ' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    it('treats a whitespace-only target as empty and fills it', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title: 'Hello', title_i18n_de: '  ' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toHaveLength(1);
    });

    it('skips a RICH_TEXT document whose only text is whitespace', () => {
      const { service } = setup();
      const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }] };
      const data: ContentData = { _id: 'c1', schema: 'root-1', body: doc };
      const schemas = [rootSchema([field({ name: 'body', kind: SchemaFieldKind.RICH_TEXT, translatable: true })])];

      expect(service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de')).toEqual([]);
    });

    // The default locale's value lives under the bare field name, at either end of the translation.
    it('writes to the bare field name when the target is the default locale', () => {
      const { service } = setup();
      const data: ContentData = { _id: 'c1', schema: 'root-1', title_i18n_de: 'Hallo' };
      const schemas = [rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })])];

      const fields = service.collectTranslatableFields(data, schemas, 'de', CONTENT_DEFAULT_LOCALE.id);
      expect(fields).toHaveLength(1);
      expect(fields[0].content).toBe('Hallo');

      fields[0].apply('Hello');

      expect(data['title']).toBe('Hello');
      expect(data['title_i18n_default']).toBeUndefined();
    });

    it('gives every field a unique id', () => {
      const { service } = setup();
      const data: ContentData = {
        _id: 'c1',
        schema: 'root-1',
        rows: [
          { _id: 'c2', schema: 'block', title: 'One' },
          { _id: 'c3', schema: 'block', title: 'Two' },
        ],
      };
      const schemas = [
        rootSchema([field({ name: 'rows', kind: SchemaFieldKind.SCHEMAS })]),
        nodeSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })], 'block'),
      ];

      const ids = service.collectTranslatableFields(data, schemas, CONTENT_DEFAULT_LOCALE.id, 'de').map(it => it.id);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

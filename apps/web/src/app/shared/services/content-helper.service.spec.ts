import { TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { CONTENT_DEFAULT_LOCALE, ContentAsset, ContentData, ContentReference, SchemaComponent, SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';
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

  describe('validateContent', () => {
    it('reports no errors when all required fields are present', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, required: true })]);
      const data: ContentData = { _id: '1', _schema: 'root-1', title: 'Hello' };
      expect(service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id)).toEqual([]);
    });

    it('reports an error for a missing required field', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'title', kind: SchemaFieldKind.TEXT, required: true, displayName: 'Title' })]);
      const data: ContentData = { _id: '1', _schema: 'root-1' };
      const errors = service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ contentId: '1', fieldName: 'title', fieldDisplayName: 'Title' });
    });

    it('reports a required error for an empty required REFERENCES array', () => {
      const { service } = setup();
      const schema = rootSchema([field({ name: 'refs', kind: SchemaFieldKind.REFERENCES, required: true })]);
      const data: ContentData = { _id: '1', _schema: 'root-1' };
      const errors = service.validateContent(data, [schema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toEqual([
        expect.objectContaining({ fieldName: 'refs', errors: { required: true, minlength: { requiredLength: 1, actualLength: 0 } } }),
      ]);
    });

    it('validates recursively into nested SCHEMA content', () => {
      const { service } = setup();
      const childSchema = rootSchema([field({ name: 'label', kind: SchemaFieldKind.TEXT, required: true })], 'child-1');
      const parentSchema = rootSchema([field({ name: 'child', kind: SchemaFieldKind.SCHEMA })], 'root-1');
      const data: ContentData = { _id: '1', _schema: 'root-1', child: { _id: '2', _schema: 'child-1' } };
      const errors = service.validateContent(data, [parentSchema, childSchema], CONTENT_DEFAULT_LOCALE.id);
      expect(errors).toEqual([expect.objectContaining({ contentId: '2', fieldName: 'label' })]);
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
});

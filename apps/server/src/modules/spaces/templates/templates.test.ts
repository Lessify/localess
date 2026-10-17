import { type SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';
import { zSchemaExportArraySchema } from '@localess/shared/zod';
import { describe, expect, it } from 'vitest';
import { EMPTY_TEMPLATE_ID, SPACE_TEMPLATES } from './index.js';
import type { SpaceTemplateComponent, SpaceTemplateEnum } from './space-template.model.js';

describe('SPACE_TEMPLATES', () => {
  it('offers every template, with EMPTY first and the test ones last', () => {
    expect(SPACE_TEMPLATES.map(t => t.id)).toEqual([
      'EMPTY',
      'BLOG',
      'ECOMMERCE',
      'MARKETING',
      'TRANSLATIONS_LARGE',
      'CONTENTS_FIELDS',
      'ASSETS_LARGE',
      'CONTENTS_LARGE',
    ]);
    expect(SPACE_TEMPLATES[0].id).toBe(EMPTY_TEMPLATE_ID);
    expect(SPACE_TEMPLATES.filter(t => t.test).map(t => t.id)).toEqual([
      'TRANSLATIONS_LARGE',
      'CONTENTS_FIELDS',
      'ASSETS_LARGE',
      'CONTENTS_LARGE',
    ]);
  });

  it('gives every template a name, description and icon for the choice card', () => {
    for (const template of SPACE_TEMPLATES) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.icon.length).toBeGreaterThan(0);
    }
  });

  it('leaves EMPTY with nothing to write', () => {
    const empty = SPACE_TEMPLATES.find(t => t.id === EMPTY_TEMPLATE_ID)!;
    expect(empty.schemas).toEqual([]);
    expect(empty.locales).toBeUndefined();
    expect(empty.translations).toBeUndefined();
  });

  it('ships schemas for every template offered to users except EMPTY', () => {
    for (const template of SPACE_TEMPLATES.filter(t => t.id !== EMPTY_TEMPLATE_ID && !t.test)) {
      expect(template.schemas.length).toBeGreaterThan(0);
    }
  });

  describe.each(SPACE_TEMPLATES.map(t => [t.id, t] as const))('%s', (_id, template) => {
    const ids = new Set(template.schemas.map(s => s.id));
    const components = template.schemas.filter(
      (s): s is SpaceTemplateComponent => s.type === SchemaType.ROOT || s.type === SchemaType.NODE,
    );
    const enumIds = new Set(template.schemas.filter(s => s.type === SchemaType.ENUM).map(s => s.id));

    it('has schemas the import path accepts', () => {
      expect(zSchemaExportArraySchema.safeParse(template.schemas).success).toBe(true);
    });

    it('has unique schema ids', () => {
      expect(ids.size).toBe(template.schemas.length);
    });

    it('uses schema ids the import path would accept', () => {
      // Mirrors packages/shared/src/models/schema.zod.test.ts: >= 2 chars, starts with a letter, and `contentdata`
      // is reserved.
      for (const schema of template.schemas) {
        expect(schema.id.length).toBeGreaterThanOrEqual(2);
        expect(schema.id).toMatch(/^[a-z][a-z0-9]*$/);
        expect(schema.id).not.toBe('contentdata');
      }
    });

    it('gives every ROOT and NODE schema at least one field', () => {
      for (const schema of components) {
        expect(schema.fields?.length ?? 0).toBeGreaterThan(0);
      }
    });

    it('gives every ENUM at least one value', () => {
      for (const schema of template.schemas.filter((s): s is SpaceTemplateEnum => s.type === SchemaType.ENUM)) {
        expect(schema.values?.length ?? 0).toBeGreaterThan(0);
      }
    });

    it('has unique field names within each schema', () => {
      for (const schema of components) {
        const fields: SchemaField[] = schema.fields ?? [];
        const names = fields.map(field => field.name);
        expect(new Set(names).size).toBe(names.length);
      }
    });

    it('resolves every SCHEMA and SCHEMAS reference to a schema in the same template', () => {
      for (const schema of components) {
        for (const field of schema.fields ?? []) {
          if (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) {
            expect(field.schemas?.length ?? 0).toBeGreaterThan(0);
            for (const target of field.schemas ?? []) {
              expect(ids.has(target)).toBe(true);
            }
          }
        }
      }
    });

    it('resolves every OPTION and OPTIONS source to an ENUM in the same template', () => {
      for (const schema of components) {
        for (const field of schema.fields ?? []) {
          if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) {
            expect(enumIds.has(field.source)).toBe(true);
          }
        }
      }
    });
  });
});

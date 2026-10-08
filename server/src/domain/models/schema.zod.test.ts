import { describe, expect, it } from 'vitest';
import { zSchemaExportArraySchema, zSchemaPushSchema } from './schema.zod.js';

const valid = [
  {
    id: 'Button',
    type: 'NODE',
    displayName: 'Button',
    fields: [
      { name: 'label', kind: 'TEXT', required: true, maxLength: 50 },
      { name: 'kind', kind: 'OPTION', source: 'ButtonType' },
    ],
  },
  { id: 'ButtonType', type: 'ENUM', values: [{ name: 'Primary', value: 'primary' }] },
];

describe('zSchemaExportArraySchema', () => {
  it('accepts a valid export array', () => {
    expect(zSchemaExportArraySchema.safeParse(valid).success).toBe(true);
  });
  it('rejects unknown field kinds inside fields', () => {
    const bad = [{ id: 'A1', type: 'NODE', fields: [{ name: 'x1', kind: 'NOPE' }] }];
    expect(zSchemaExportArraySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects OPTION fields without source', () => {
    const bad = [{ id: 'A1', type: 'NODE', fields: [{ name: 'x1', kind: 'OPTION' }] }];
    expect(zSchemaExportArraySchema.safeParse(bad).success).toBe(false);
  });
  it('rejects invalid schema ids', () => {
    expect(zSchemaExportArraySchema.safeParse([{ id: '1Bad', type: 'NODE' }]).success).toBe(false);
    expect(zSchemaExportArraySchema.safeParse([{ id: 'x', type: 'NODE' }]).success).toBe(false); // min 2
  });
  it('rejects reserved schema ids (case-insensitive)', () => {
    expect(zSchemaExportArraySchema.safeParse([{ id: 'contentdata', type: 'NODE' }]).success).toBe(false);
  });
  it('rejects reserved and malformed field names', () => {
    const reserved = [{ id: 'A1', type: 'NODE', fields: [{ name: '_id', kind: 'TEXT' }] }];
    expect(zSchemaExportArraySchema.safeParse(reserved).success).toBe(false);
    const i18n = [{ id: 'A1', type: 'NODE', fields: [{ name: 'title_i18n_x', kind: 'TEXT' }] }];
    expect(zSchemaExportArraySchema.safeParse(i18n).success).toBe(false);
    const pascal = [{ id: 'A1', type: 'NODE', fields: [{ name: 'Title', kind: 'TEXT' }] }];
    expect(zSchemaExportArraySchema.safeParse(pascal).success).toBe(false);
  });
  it('enforces length limits', () => {
    const longName = [{ id: 'A1', type: 'NODE', displayName: 'x'.repeat(51) }];
    expect(zSchemaExportArraySchema.safeParse(longName).success).toBe(false);
  });
});

describe('zSchemaPushSchema', () => {
  it('accepts upsert and sync types', () => {
    expect(zSchemaPushSchema.safeParse({ type: 'sync', schemas: [] }).success).toBe(true);
    expect(zSchemaPushSchema.safeParse({ type: 'upsert', dryRun: true, schemas: valid }).success).toBe(true);
  });
  it('rejects unknown types', () => {
    expect(zSchemaPushSchema.safeParse({ type: 'replace', schemas: [] }).success).toBe(false);
  });
  it('rejects SCHEMA/SCHEMAS fields that allow no schema', () => {
    const withField = (field: object) => ({ type: 'upsert', schemas: [{ id: 'Page', type: 'ROOT', fields: [field] }] });

    expect(zSchemaPushSchema.safeParse(withField({ name: 'hero', kind: 'SCHEMA' })).success).toBe(false);
    expect(zSchemaPushSchema.safeParse(withField({ name: 'blocks', kind: 'SCHEMAS', schemas: [] })).success).toBe(false);
    expect(zSchemaPushSchema.safeParse(withField({ name: 'blocks', kind: 'SCHEMAS', schemas: ['Button'] })).success).toBe(true);
  });
  it('strips translatable from REFERENCE/REFERENCES/SCHEMA/SCHEMAS fields, keeping it elsewhere', () => {
    const parsed = zSchemaPushSchema.parse({
      type: 'upsert',
      schemas: [
        {
          id: 'Page',
          type: 'ROOT',
          fields: [
            { name: 'author', kind: 'REFERENCE', translatable: true },
            { name: 'related', kind: 'REFERENCES', translatable: true },
            { name: 'hero', kind: 'SCHEMA', schemas: ['Button'], translatable: true },
            { name: 'blocks', kind: 'SCHEMAS', schemas: ['Button'], translatable: true },
            { name: 'title', kind: 'TEXT', translatable: true },
          ],
        },
      ],
    });
    const fields = (parsed.schemas[0] as { fields: Record<string, unknown>[] }).fields;

    expect(fields.slice(0, 4).map(it => 'translatable' in it)).toEqual([false, false, false, false]);
    expect(fields[4]['translatable']).toBe(true);
  });
  it('leaves imports free to carry existing SCHEMA fields without schemas', () => {
    expect(zSchemaExportArraySchema.safeParse([{ id: 'Page', type: 'ROOT', fields: [{ name: 'hero', kind: 'SCHEMA' }] }]).success).toBe(
      true,
    );
  });
});

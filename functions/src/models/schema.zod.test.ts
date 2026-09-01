import { describe, expect, it } from 'vitest';
import { zSchemaExportArraySchema, zSchemaPushSchema } from './schema.zod';

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
});

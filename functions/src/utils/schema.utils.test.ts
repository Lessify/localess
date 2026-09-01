import { describe, expect, it } from 'vitest';
import { Schema, SchemaExport, SchemaField, SchemaFieldKind, SchemaType } from '../models';
import { docSchemaToExport, isSchemaChanged, planSchemaPush } from './schema.utils';

const timestamps = { createdAt: {} as never, updatedAt: {} as never };

describe('isSchemaChanged', () => {
  it('returns false for an identical component', () => {
    const existing: Schema = {
      type: SchemaType.NODE,
      displayName: 'Button',
      fields: [{ name: 'label', kind: SchemaFieldKind.TEXT, required: true }],
      ...timestamps,
    };
    expect(
      isSchemaChanged(existing, {
        id: 'Button',
        type: SchemaType.NODE,
        displayName: 'Button',
        fields: [{ name: 'label', kind: SchemaFieldKind.TEXT, required: true }],
      })
    ).toBe(false);
  });

  it('returns true when a field changes', () => {
    const existing: Schema = { type: SchemaType.NODE, fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'Button', type: SchemaType.NODE, fields: [{ name: 'x', kind: SchemaFieldKind.TEXT }] })).toBe(
      true
    );
  });

  it('ignores object key order in fields', () => {
    const existing: Schema = {
      type: SchemaType.NODE,
      fields: [{ name: 'label', kind: SchemaFieldKind.TEXT, required: true }],
      ...timestamps,
    };
    // same field, keys in a different order
    const imported = { id: 'Button', type: SchemaType.NODE, fields: [{ kind: SchemaFieldKind.TEXT, required: true, name: 'label' }] };
    expect(isSchemaChanged(existing, imported as never)).toBe(false);
  });

  it('returns true when the schema type itself changes', () => {
    const existing: Schema = { type: SchemaType.NODE, fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.ROOT, fields: [] })).toBe(true);
    const existingEnum: Schema = { type: SchemaType.ENUM, values: [], ...timestamps };
    expect(isSchemaChanged(existingEnum, { id: 'X', type: SchemaType.NODE, fields: [] })).toBe(true);
  });

  it('returns true when displayName changes, including undefined vs set', () => {
    const existing: Schema = { type: SchemaType.NODE, displayName: 'Button', fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, displayName: 'Buttons', fields: [] })).toBe(true);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, fields: [] })).toBe(true);
    const existingBare: Schema = { type: SchemaType.NODE, fields: [], ...timestamps };
    expect(isSchemaChanged(existingBare, { id: 'X', type: SchemaType.NODE, displayName: 'Button', fields: [] })).toBe(true);
  });

  it('returns true when description changes', () => {
    const existing: Schema = { type: SchemaType.NODE, description: 'Old', fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, description: 'New', fields: [] })).toBe(true);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, fields: [] })).toBe(true);
  });

  it('returns true when labels change (order-insensitive via isLabelsEqual)', () => {
    const existing: Schema = { type: SchemaType.NODE, labels: ['a', 'b'], fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, labels: ['b', 'a'], fields: [] })).toBe(false);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, labels: ['a', 'c'], fields: [] })).toBe(true);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.NODE, fields: [] })).toBe(true);
  });

  it('returns true when previewField changes on ROOT/NODE schemas', () => {
    const existing: Schema = { type: SchemaType.ROOT, previewField: 'title', fields: [], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.ROOT, previewField: 'title', fields: [] })).toBe(false);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.ROOT, previewField: 'subtitle', fields: [] })).toBe(true);
    expect(isSchemaChanged(existing, { id: 'X', type: SchemaType.ROOT, fields: [] })).toBe(true);
  });

  it('returns false for identical ROOT schemas (not just NODE)', () => {
    const existing: Schema = {
      type: SchemaType.ROOT,
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, required: true }],
      ...timestamps,
    };
    expect(
      isSchemaChanged(existing, { id: 'Page', type: SchemaType.ROOT, fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, required: true }] })
    ).toBe(false);
  });

  it('returns true when ENUM values change, false when identical modulo key order', () => {
    const existing: Schema = { type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }], ...timestamps };
    expect(isSchemaChanged(existing, { id: 'Kind', type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }] })).toBe(false);
    expect(isSchemaChanged(existing, { id: 'Kind', type: SchemaType.ENUM, values: [{ value: 'a', name: 'A' }] })).toBe(false);
    expect(isSchemaChanged(existing, { id: 'Kind', type: SchemaType.ENUM, values: [{ name: 'A', value: 'b' }] })).toBe(true);
    expect(isSchemaChanged(existing, { id: 'Kind', type: SchemaType.ENUM })).toBe(true);
  });

  it('returns false when both sides omit fields on a ROOT/NODE schema', () => {
    const existing: Schema = { type: SchemaType.NODE, ...timestamps };
    expect(isSchemaChanged(existing, { id: 'Button', type: SchemaType.NODE })).toBe(false);
  });

  it('returns false when both sides omit values on an ENUM schema', () => {
    const existing: Schema = { type: SchemaType.ENUM, ...timestamps };
    expect(isSchemaChanged(existing, { id: 'Kind', type: SchemaType.ENUM })).toBe(false);
  });
});

describe('docSchemaToExport', () => {
  it('maps a component and drops timestamps/absent optionals', () => {
    const schema: Schema = {
      type: SchemaType.ROOT,
      displayName: 'Page',
      previewField: 'title',
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, required: true }],
      ...timestamps,
    };
    expect(docSchemaToExport('Page', schema)).toEqual({
      id: 'Page',
      type: SchemaType.ROOT,
      displayName: 'Page',
      previewField: 'title',
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, required: true }],
    });
  });

  it('maps an enum', () => {
    const schema: Schema = { type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }], ...timestamps };
    expect(docSchemaToExport('Kind', schema)).toEqual({ id: 'Kind', type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }] });
  });

  it('maps a component including description and labels', () => {
    const schema: Schema = {
      type: SchemaType.NODE,
      description: 'A reusable button',
      labels: ['ui', 'button'],
      ...timestamps,
    };
    expect(docSchemaToExport('Button', schema)).toEqual({
      id: 'Button',
      type: SchemaType.NODE,
      description: 'A reusable button',
      labels: ['ui', 'button'],
    });
  });

  it('maps an enum including displayName, description and labels', () => {
    const schema: Schema = {
      type: SchemaType.ENUM,
      displayName: 'Button Type',
      description: 'Visual style options',
      labels: ['ui'],
      ...timestamps,
    };
    expect(docSchemaToExport('ButtonType', schema)).toEqual({
      id: 'ButtonType',
      type: SchemaType.ENUM,
      displayName: 'Button Type',
      description: 'Visual style options',
      labels: ['ui'],
    });
  });

  it('omits every absent optional on a bare component', () => {
    const schema: Schema = { type: SchemaType.NODE, ...timestamps };
    expect(docSchemaToExport('Bare', schema)).toEqual({ id: 'Bare', type: SchemaType.NODE });
  });

  it('omits every absent optional on a bare enum', () => {
    const schema: Schema = { type: SchemaType.ENUM, ...timestamps };
    expect(docSchemaToExport('BareEnum', schema)).toEqual({ id: 'BareEnum', type: SchemaType.ENUM });
  });
});

function componentDoc(fields: SchemaField[] = []): Schema {
  return { type: SchemaType.NODE, fields, ...timestamps };
}

describe('planSchemaPush', () => {
  it('classifies create / update / unchanged', () => {
    const existing = new Map<string, Schema>([
      ['Same', componentDoc([{ name: 'label', kind: SchemaFieldKind.TEXT }])],
      ['Changed', componentDoc([])],
    ]);
    const incoming: SchemaExport[] = [
      { id: 'Same', type: SchemaType.NODE, fields: [{ name: 'label', kind: SchemaFieldKind.TEXT }] },
      { id: 'Changed', type: SchemaType.NODE, fields: [{ name: 'extra', kind: SchemaFieldKind.TEXT }] },
      { id: 'Fresh', type: SchemaType.NODE },
    ];
    const plan = planSchemaPush(existing, incoming, 'upsert');
    expect(plan.creates.map(s => s.id)).toEqual(['Fresh']);
    expect(plan.updates.map(s => s.id)).toEqual(['Changed']);
    expect(plan.unchanged).toEqual(['Same']);
    expect(plan.deletes).toEqual([]);
    expect(plan.errors).toEqual([]);
  });

  it('upsert never deletes; sync deletes schemas absent from the payload', () => {
    const existing = new Map<string, Schema>([['Stale', componentDoc()]]);
    const incoming: SchemaExport[] = [{ id: 'Fresh', type: SchemaType.NODE }];
    expect(planSchemaPush(existing, incoming, 'upsert').deletes).toEqual([]);
    expect(planSchemaPush(existing, incoming, 'sync').deletes).toEqual(['Stale']);
  });

  it('sync refuses deleting a schema still referenced by a surviving SCHEMA/SCHEMAS field', () => {
    const existing = new Map<string, Schema>([['Button', componentDoc()]]);
    const incoming: SchemaExport[] = [
      { id: 'Page', type: SchemaType.ROOT, fields: [{ name: 'blocks', kind: SchemaFieldKind.SCHEMAS, schemas: ['Button'] }] },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain('Button');
    expect(plan.errors[0]).toContain('Page');
  });

  it('sync refuses deleting an enum still referenced by a surviving OPTION/OPTIONS source', () => {
    const existing = new Map<string, Schema>([['ButtonType', { type: SchemaType.ENUM, values: [], ...timestamps }]]);
    const incoming: SchemaExport[] = [
      { id: 'Button', type: SchemaType.NODE, fields: [{ name: 'kind', kind: SchemaFieldKind.OPTION, source: 'ButtonType' }] },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain('ButtonType');
  });

  it('classifies ENUM creates, updates and unchanged, same as components', () => {
    const existing = new Map<string, Schema>([
      ['SameEnum', { type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }], ...timestamps }],
      ['ChangedEnum', { type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }], ...timestamps }],
    ]);
    const incoming: SchemaExport[] = [
      { id: 'SameEnum', type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }] },
      { id: 'ChangedEnum', type: SchemaType.ENUM, values: [{ name: 'A', value: 'b' }] },
      { id: 'FreshEnum', type: SchemaType.ENUM, values: [{ name: 'X', value: 'x' }] },
    ];
    const plan = planSchemaPush(existing, incoming, 'upsert');
    expect(plan.creates.map(s => s.id)).toEqual(['FreshEnum']);
    expect(plan.updates.map(s => s.id)).toEqual(['ChangedEnum']);
    expect(plan.unchanged).toEqual(['SameEnum']);
  });

  it('sync with nothing stale produces no deletes and no errors', () => {
    const existing = new Map<string, Schema>([['Button', componentDoc([{ name: 'label', kind: SchemaFieldKind.TEXT }])]]);
    const incoming: SchemaExport[] = [{ id: 'Button', type: SchemaType.NODE, fields: [{ name: 'label', kind: SchemaFieldKind.TEXT }] }];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.deletes).toEqual([]);
    expect(plan.errors).toEqual([]);
    expect(plan.unchanged).toEqual(['Button']);
  });

  it('sync detects a singular SCHEMA field referencing a to-be-deleted schema', () => {
    const existing = new Map<string, Schema>([['Button', componentDoc()]]);
    const incoming: SchemaExport[] = [
      { id: 'Page', type: SchemaType.ROOT, fields: [{ name: 'hero', kind: SchemaFieldKind.SCHEMA, schemas: ['Button'] }] },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain('Button');
    expect(plan.errors[0]).toContain('Page');
  });

  it('sync detects a plural OPTIONS field referencing a to-be-deleted enum', () => {
    const existing = new Map<string, Schema>([['ButtonType', { type: SchemaType.ENUM, values: [], ...timestamps }]]);
    const incoming: SchemaExport[] = [
      {
        id: 'Button',
        type: SchemaType.NODE,
        fields: [{ name: 'kinds', kind: SchemaFieldKind.OPTIONS, source: 'ButtonType' }],
      },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain('ButtonType');
  });

  it('does not error when a reference points at a schema that is not being deleted', () => {
    const existing = new Map<string, Schema>([
      ['Button', componentDoc()],
      ['ButtonType', { type: SchemaType.ENUM, values: [], ...timestamps }],
    ]);
    const incoming: SchemaExport[] = [
      { id: 'Button', type: SchemaType.NODE },
      { id: 'ButtonType', type: SchemaType.ENUM },
      {
        id: 'Page',
        type: SchemaType.ROOT,
        fields: [
          { name: 'blocks', kind: SchemaFieldKind.SCHEMAS, schemas: ['Button'] },
          { name: 'kind', kind: SchemaFieldKind.OPTION, source: 'ButtonType' },
        ],
      },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it('does not crash on an unrestricted SCHEMA/SCHEMAS field (schemas omitted or empty)', () => {
    const existing = new Map<string, Schema>([['Stale', componentDoc()]]);
    const incoming: SchemaExport[] = [
      {
        id: 'Page',
        type: SchemaType.ROOT,
        fields: [
          { name: 'blocks', kind: SchemaFieldKind.SCHEMAS },
          { name: 'hero', kind: SchemaFieldKind.SCHEMA, schemas: [] },
        ],
      },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.deletes).toEqual(['Stale']);
    expect(plan.errors).toEqual([]);
  });

  it('skips ENUM entries in the incoming payload when scanning for reference violations during sync', () => {
    const existing = new Map<string, Schema>([['Stale', { type: SchemaType.ENUM, values: [], ...timestamps }]]);
    const incoming: SchemaExport[] = [{ id: 'JustAnEnum', type: SchemaType.ENUM, values: [{ name: 'A', value: 'a' }] }];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.deletes).toEqual(['Stale']);
    expect(plan.errors).toEqual([]);
  });

  it('reports one error per distinct violation when multiple references block a sync', () => {
    const existing = new Map<string, Schema>([
      ['Button', componentDoc()],
      ['ButtonType', { type: SchemaType.ENUM, values: [], ...timestamps }],
    ]);
    const incoming: SchemaExport[] = [
      {
        id: 'Page',
        type: SchemaType.ROOT,
        fields: [
          { name: 'blocks', kind: SchemaFieldKind.SCHEMAS, schemas: ['Button'] },
          { name: 'kind', kind: SchemaFieldKind.OPTION, source: 'ButtonType' },
        ],
      },
    ];
    const plan = planSchemaPush(existing, incoming, 'sync');
    expect(plan.errors).toHaveLength(2);
    expect(plan.errors.some(e => e.includes('Button') && !e.includes('ButtonType'))).toBe(true);
    expect(plan.errors.some(e => e.includes('ButtonType'))).toBe(true);
  });
});

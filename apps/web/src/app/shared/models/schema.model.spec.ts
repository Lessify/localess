import { isFieldTranslatable, SchemaField, SchemaFieldKind } from './schema.model';

describe('isFieldTranslatable', () => {
  it('follows the flag on kinds that can be translatable', () => {
    expect(isFieldTranslatable({ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true })).toBe(true);
    expect(isFieldTranslatable({ name: 'image', kind: SchemaFieldKind.ASSET, translatable: true })).toBe(true);
    expect(isFieldTranslatable({ name: 'title', kind: SchemaFieldKind.TEXT })).toBe(false);
  });

  // Schemas pushed through the API before the push started stripping it can still carry the flag.
  it.each([SchemaFieldKind.REFERENCE, SchemaFieldKind.REFERENCES, SchemaFieldKind.SCHEMA, SchemaFieldKind.SCHEMAS])(
    'is false for %s even with a leftover flag',
    kind => {
      expect(isFieldTranslatable({ name: 'field', kind, translatable: true } as unknown as SchemaField)).toBe(false);
    },
  );
});

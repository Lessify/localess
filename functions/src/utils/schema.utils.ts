import {
  Schema,
  SchemaComponent,
  SchemaComponentExport,
  SchemaEnum,
  SchemaEnumExport,
  SchemaExport,
  SchemaFieldKind,
  SchemaType,
} from '../models';
import { isLabelsEqual } from './import-utils';
import { stableStringify } from './stable-json';

/**
 * Result of planSchemaPush: the classified changes a schema push would apply.
 */
export interface SchemaPushPlan {
  /** Schemas not present on the server yet. */
  creates: SchemaExport[];
  /** Schemas present on the server with different content. */
  updates: SchemaExport[];
  /** Server schema ids absent from the payload (sync mode only). */
  deletes: string[];
  /** Schema ids present on both sides with identical content. */
  unchanged: string[];
  /** Referential-integrity violations that must block the push. */
  errors: string[];
}

/**
 * Convert a stored schema document into its export representation (no timestamps, no absent optionals).
 * @param {string} id schema document id
 * @param {Schema} schema stored schema document data
 * @return {SchemaExport} export representation
 */
export function docSchemaToExport(id: string, schema: Schema): SchemaExport {
  if (schema.type === SchemaType.ENUM) {
    const enumSchema = schema as SchemaEnum;
    const out: SchemaEnumExport = { id, type: enumSchema.type };
    if (enumSchema.displayName) out.displayName = enumSchema.displayName;
    if (enumSchema.description) out.description = enumSchema.description;
    if (enumSchema.labels) out.labels = enumSchema.labels;
    if (enumSchema.values) out.values = enumSchema.values;
    return out;
  }
  const component = schema as SchemaComponent;
  const out: SchemaComponentExport = { id, type: component.type };
  if (component.displayName) out.displayName = component.displayName;
  if (component.description) out.description = component.description;
  if (component.labels) out.labels = component.labels;
  if (component.previewField) out.previewField = component.previewField;
  if (component.fields) out.fields = component.fields;
  return out;
}

/**
 * Returns true if any imported field differs from the existing Firestore schema document.
 * Compares type, displayName, description, and labels for all schema types.
 * For ROOT/NODE schemas, also compares previewField and fields array (deep, key-order-insensitive).
 * For ENUM schemas, also compares the values array (deep, key-order-insensitive).
 * @param {Schema} existing - the current Firestore schema document
 * @param {SchemaExport} imported - the schema data parsed from the import file
 * @return {boolean} true if at least one field has changed
 */
export function isSchemaChanged(existing: Schema, imported: SchemaExport): boolean {
  if (existing.type !== imported.type) return true;
  if ((existing.displayName ?? undefined) !== (imported.displayName ?? undefined)) return true;
  if ((existing.description ?? undefined) !== (imported.description ?? undefined)) return true;
  if (!isLabelsEqual(existing.labels, imported.labels)) return true;
  if (
    (existing.type === SchemaType.ROOT || existing.type === SchemaType.NODE) &&
    (imported.type === SchemaType.ROOT || imported.type === SchemaType.NODE)
  ) {
    const e = existing as SchemaComponent;
    const i = imported as SchemaComponentExport;
    if ((e.previewField ?? undefined) !== (i.previewField ?? undefined)) return true;
    if (stableStringify(e.fields ?? []) !== stableStringify(i.fields ?? [])) return true;
  }
  if (existing.type === SchemaType.ENUM && imported.type === SchemaType.ENUM) {
    const e = existing as SchemaEnum;
    const i = imported as SchemaEnumExport;
    if (stableStringify(e.values ?? []) !== stableStringify(i.values ?? [])) return true;
  }
  return false;
}

/**
 * Compute the changes a schema push would apply, without touching Firestore.
 * @param {Map<string, Schema>} existing current schema documents keyed by id
 * @param {SchemaExport[]} incoming pushed schema definitions
 * @param {'upsert' | 'sync'} type push mode; sync additionally deletes schemas absent from incoming
 * @return {SchemaPushPlan} classified plan with referential-integrity errors
 */
export function planSchemaPush(existing: Map<string, Schema>, incoming: SchemaExport[], type: 'upsert' | 'sync'): SchemaPushPlan {
  const incomingIds = new Set(incoming.map(it => it.id));
  const creates: SchemaExport[] = [];
  const updates: SchemaExport[] = [];
  const unchanged: string[] = [];
  for (const schema of incoming) {
    const orig = existing.get(schema.id);
    if (!orig) creates.push(schema);
    else if (isSchemaChanged(orig, schema)) updates.push(schema);
    else unchanged.push(schema.id);
  }
  const deletes: string[] = [];
  const errors: string[] = [];
  if (type === 'sync') {
    for (const id of existing.keys()) {
      if (!incomingIds.has(id)) deletes.push(id);
    }
    const deleteSet = new Set(deletes);
    for (const schema of incoming) {
      if (schema.type !== SchemaType.ROOT && schema.type !== SchemaType.NODE) continue;
      for (const field of (schema as SchemaComponentExport).fields ?? []) {
        if ((field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) && field.schemas) {
          for (const ref of field.schemas) {
            if (deleteSet.has(ref)) {
              errors.push(`Cannot delete schema '${ref}': still referenced by '${schema.id}' field '${field.name}'`);
            }
          }
        }
        if ((field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) && deleteSet.has(field.source)) {
          errors.push(`Cannot delete schema '${field.source}': still referenced by '${schema.id}' field '${field.name}'`);
        }
      }
    }
  }
  return { creates, updates, deletes, unchanged, errors };
}

import {
  Schema,
  SchemaComponent,
  SchemaComponentExport,
  SchemaEnum,
  SchemaEnumExport,
  SchemaExport,
  SchemaField,
  SchemaFieldKind,
  SCHEMA_PREVIEW_FIELD_KINDS,
  SchemaType,
} from '@localess/shared';
import { isLabelsEqual } from './labels.utils.js';
import { stableStringify } from './stable-json.js';

/** Whether `field` refers to schema `name`: allows it as a block (`schemas`) or takes its options from it (`source`). */
export function fieldRefersTo(field: SchemaField, name: string): boolean {
  if (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) return field.schemas?.includes(name) ?? false;
  if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) return field.source === name;
  return false;
}

/** One problem of a reference: the schema it names is missing, or of another type than the field needs. */
function referenceProblem(target: string, types: ReadonlyMap<string, SchemaType>, wanted: SchemaType): string {
  return types.has(target) ? `'${target}', which is not ${wanted === SchemaType.ENUM ? 'an' : 'a'} ${wanted} schema` : `'${target}', which does not exist`;
}

/** The problems of one field's references: blocks (`schemas`) must be NODE schemas, options (`source`) an ENUM. */
export function fieldReferenceProblems(field: SchemaField, types: ReadonlyMap<string, SchemaType>): { target: string; problem: string }[] {
  if (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) {
    return (field.schemas ?? [])
      .filter(it => types.get(it) !== SchemaType.NODE)
      .map(it => ({ target: it, problem: `field '${field.name}' allows ${referenceProblem(it, types, SchemaType.NODE)}` }));
  }
  if ((field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) && types.get(field.source) !== SchemaType.ENUM) {
    return [{ target: field.source, problem: `field '${field.name}' takes its options from ${referenceProblem(field.source, types, SchemaType.ENUM)}` }];
  }
  return [];
}

/** Why `previewField` can not be the preview: not a field of the schema, or of a kind that can not be one. */
export function previewFieldProblem(previewField: string | undefined | null, fields: SchemaField[]): string | undefined {
  if (!previewField) return undefined;
  const field = fields.find(it => it.name === previewField);
  if (!field) return `preview field '${previewField}' is not a field of the schema`;
  if (!SCHEMA_PREVIEW_FIELD_KINDS.includes(field.kind)) return `preview field '${previewField}' is a ${field.kind} field, which can not be a preview`;
  return undefined;
}

/**
 * The rules across a ROOT/NODE schema's fields, against `types` (every schema of the space by name, as it will be):
 * field names unique (case-sensitive), the preview one of its fields of a previewable kind, blocks (`schemas`) NODE
 * schemas, options (`source`) an ENUM. Answers the problems, empty when there are none.
 */
export function checkSchemaFields(schema: { previewField?: string | null; fields?: SchemaField[] | null }, types: ReadonlyMap<string, SchemaType>): string[] {
  const fields = schema.fields ?? [];
  const names = fields.map(it => it.name);
  const problems = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))].map(name => `field '${name}' is defined more than once`);
  const preview = previewFieldProblem(schema.previewField, fields);
  if (preview) problems.push(preview);
  for (const field of fields) problems.push(...fieldReferenceProblems(field, types).map(it => it.problem));
  return problems;
}

/** The schema names `fields` refer to, by the type they need: blocks (`schemas`) NODE, options (`source`) ENUM. */
export function schemaReferences(fields: SchemaField[]): Map<string, SchemaType> {
  const references = new Map<string, SchemaType>();
  for (const field of fields) {
    if (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) for (const it of field.schemas ?? []) references.set(it, SchemaType.NODE);
    if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) references.set(field.source, SchemaType.ENUM);
  }
  return references;
}

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
 * Convert a stored schema into its export representation (no timestamps, no absent optionals). Exports, the SDK
 * and Code as Source identify a schema by its name, carried as `id`.
 * @param {string} id the schema's name
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
    for (const schema of incoming) {
      if (schema.type === SchemaType.ENUM) continue;
      for (const field of (schema as SchemaComponentExport).fields ?? []) {
        for (const name of deletes.filter(it => fieldRefersTo(field, it))) {
          errors.push(`Cannot delete schema '${name}': still referenced by '${schema.id}' field '${field.name}'`);
        }
      }
    }
  }
  // Fields are checked against the schemas as the push leaves them (deletes are refused above when referenced).
  const types = new Map([...existing].map(([name, schema]) => [name, schema.type]));
  for (const schema of incoming) types.set(schema.id, schema.type);
  for (const schema of [...creates, ...updates]) {
    if (schema.type === SchemaType.ENUM) continue;
    errors.push(...checkSchemaFields(schema, types).map(it => `Schema '${schema.id}': ${it}`));
  }
  return { creates, updates, deletes, unchanged, errors };
}

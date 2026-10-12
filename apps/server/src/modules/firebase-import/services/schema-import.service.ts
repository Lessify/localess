import { Injectable } from '@nestjs/common';
import { type SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';
import { schemaEnumValueSchema, schemaFieldSchema } from '@localess/shared/zod';
import type { z } from 'zod';
import { newUuid } from '../../../infra/database/id.js';
import { SchemaImportRepository } from '../repositories/schema-import.repository.js';
import { str, strings, timestamps, typeOf } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';
import { fieldReferenceProblems, previewFieldProblem } from '../../../shared/utils/schema.utils.js';

/**
 * Each item of a list that `schema` accepts, as parsed (keys it does not have dropped); the others are left out, with
 * a warning naming them by `name` or, without one, by position (from 1).
 */
function validItems<T>(list: unknown, schema: z.ZodType<T>, what: string, warn: (warning: string) => void): T[] | null {
  if (!Array.isArray(list)) return null;
  return list.flatMap((item, index) => {
    const parsed = schema.safeParse(item);
    if (parsed.success) return [parsed.data];
    const name = (item as { name?: unknown } | null)?.name;
    warn(`${what} ${typeof name === 'string' && name ? `'${name}'` : index + 1} is not valid, dropped`);
    return [];
  });
}

/**
 * A ROOT/NODE schema's fields and preview made to keep the rules across fields, saying what changed: a field name
 * defined again drops the later field, a block that is not a NODE leaves `schemas`, an option field whose `source` is
 * not an ENUM is dropped (it can not work), and a preview that is not one of the fields left, of a previewable kind,
 * is cleared.
 */
function keepFieldRules(
  previewField: string | undefined,
  fields: SchemaField[] | null,
  types: ReadonlyMap<string, SchemaType>,
  warn: (warning: string) => void,
): { previewField: string | null; fields: SchemaField[] | null } {
  let kept = fields;
  if (kept) {
    const seen = new Set<string>();
    const warned = new Set<string>();
    kept = kept.filter(field => {
      if (!seen.has(field.name)) return seen.add(field.name);
      if (!warned.has(field.name)) warn(`field '${field.name}' is defined more than once, the later one dropped`);
      warned.add(field.name);
      return false;
    });
    kept = kept.flatMap(field => {
      const problems = fieldReferenceProblems(field, types);
      if (!problems.length) return [field];
      if (field.kind === SchemaFieldKind.OPTION || field.kind === SchemaFieldKind.OPTIONS) {
        warn(`${problems[0].problem}, dropped`);
        return [];
      }
      if (field.kind !== SchemaFieldKind.SCHEMA && field.kind !== SchemaFieldKind.SCHEMAS) return [field];
      for (const it of problems) warn(`${it.problem}, removed`);
      const bad = new Set(problems.map(it => it.target));
      return [{ ...field, schemas: field.schemas?.filter(it => !bad.has(it)) }];
    });
  }
  const preview = previewFieldProblem(previewField, kept ?? []);
  if (preview) warn(`${preview}, cleared`);
  return { previewField: preview ? null : (previewField ?? null), fields: kept };
}

/**
 * Stage 7: the schemas (names are the references contents use). Fields and enum values are checked as the app checks
 * them; an invalid one is dropped with a warning, and a schema keeps only what its type has.
 */
@Injectable()
export class SchemaImportService {
  constructor(private readonly schemas: SchemaImportRepository) {}

  /** Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const schemaDocs = await stage.client.list(stage.sourceSpaceId, 'schemas');
    if (schemaDocs.length) {
      const rows = schemaDocs.map(doc => {
        const type = typeOf(SchemaType, SchemaType.ROOT, doc, warning => stage.warn(warning));
        const warn = (warning: string) => stage.warn(`${doc.id}: ${warning}`);
        const component = type !== SchemaType.ENUM;
        return {
          id: newUuid(timestamps(doc).createdAt),
          spaceId: stage.spaceId,
          name: doc.id,
          type,
          displayName: str(doc['displayName']),
          description: str(doc['description']),
          labels: strings(doc['labels']),
          previewField: component ? str(doc['previewField']) : null,
          fields: component ? validItems(doc['fields'], schemaFieldSchema, 'field', warn) : null,
          values: component ? null : validItems(doc['values'], schemaEnumValueSchema, 'enum value', warn),
          ...timestamps(doc),
        };
      });
      // References are checked once every schema of the space is known.
      const types = new Map(rows.map(it => [it.name, it.type]));
      for (const row of rows) {
        if (row.type === SchemaType.ENUM) continue;
        Object.assign(row, keepFieldRules(row.previewField ?? undefined, row.fields, types, warning => stage.warn(`${row.name}: ${warning}`)));
      }
      await this.schemas.insertMany(rows);
    }
    return schemaDocs.length;
  }
}

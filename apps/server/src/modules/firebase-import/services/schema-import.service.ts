import { type SchemaField, SchemaFieldKind, SchemaType } from '@localess/shared';
import { schemaEnumValueSchema, schemaFieldSchema } from '@localess/shared/zod';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import { newUuid } from '../../../infra/database/id.js';
import { fieldReferenceProblems, previewFieldProblem } from '../../../shared/utils/schema.utils.js';
import { SchemaImportRepository } from '../repositories/schema-import.repository.js';
import type { FirebaseDoc } from '../utils/firebase-client.js';
import { str, strings, timestamps, typeOf } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

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

const isOptionKind = (kind: unknown) => kind === SchemaFieldKind.OPTION || kind === SchemaFieldKind.OPTIONS;

/** A schema name not in `taken` (letters, digits, `-`, `_`, `.`; at most 50 characters), recorded in it. */
function freeName(base: string, taken: Set<string>): string {
  const clean = base.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 50);
  let name = clean;
  for (let n = 2; taken.has(name); n++) name = `${clean.slice(0, 50 - String(n).length)}${n}`;
  taken.add(name);
  return name;
}

/**
 * Option fields that held their own values (`source: 'self'` with `options`, which this install does not have) get
 * them from an ENUM schema made for each, `<schema><Field>`, so the field and the values contents hold keep working.
 * The ENUM schema docs are answered; `docs` are changed in place to take their options from them.
 */
function inlineOptionsToEnums(docs: FirebaseDoc[], warn: (warning: string) => void): FirebaseDoc[] {
  const taken = new Set(docs.map(doc => doc.id));
  const enums: FirebaseDoc[] = [];
  for (const doc of docs) {
    if (doc['type'] === SchemaType.ENUM || !Array.isArray(doc['fields'])) continue;
    doc['fields'] = doc['fields'].map((field: unknown) => {
      if (typeof field !== 'object' || field === null) return field;
      const { options, ...rest } = field as Record<string, unknown>;
      if (!isOptionKind(rest['kind']) || !Array.isArray(options) || (rest['source'] !== 'self' && rest['source'] !== undefined))
        return field;
      const fieldName = typeof rest['name'] === 'string' ? rest['name'] : '';
      const name = freeName(`${doc.id}${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`, taken);
      const label = (value: unknown, fallback: string) => (typeof value === 'string' && value ? value : fallback);
      enums.push({
        id: name,
        type: SchemaType.ENUM,
        displayName: `${label(doc['displayName'], doc.id)} ${label(rest['displayName'], fieldName)}`.slice(0, 50),
        description: `Options of the field '${fieldName}' of '${doc.id}', which held them itself in Firebase.`,
        values: options,
        createdAt: doc['createdAt'],
        updatedAt: doc['updatedAt'],
      });
      warn(`${doc.id}: field '${fieldName}' held its own options, now taken from the ENUM schema '${name}'`);
      return { ...rest, source: name };
    });
  }
  return enums;
}

/**
 * Stage 7: the schemas (names are the references contents use). Fields and enum values are checked as the app checks
 * them; an invalid one is dropped with a warning, and a schema keeps only what its type has. Option fields with their
 * own values get an ENUM schema of their own (`inlineOptionsToEnums`).
 */
@Injectable()
export class SchemaImportService {
  constructor(private readonly schemaImportRepository: SchemaImportRepository) {}

  /** Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const sourceDocs = await stage.client.list(stage.sourceSpaceId, 'schemas');
    const schemaDocs = [...sourceDocs, ...inlineOptionsToEnums(sourceDocs, warning => stage.warn(warning))];
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
        Object.assign(
          row,
          keepFieldRules(row.previewField ?? undefined, row.fields, types, warning => stage.warn(`${row.name}: ${warning}`)),
        );
      }
      await this.schemaImportRepository.insertMany(rows);
    }
    return schemaDocs.length;
  }
}

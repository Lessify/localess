import { Injectable } from '@nestjs/common';
import { SchemaType } from '@localess/shared';
import { schemaEnumValueSchema, schemaFieldSchema } from '@localess/shared/zod';
import type { z } from 'zod';
import { newUuid } from '../../../infra/database/id.js';
import { SchemaImportRepository } from '../repositories/schema-import.repository.js';
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
      await this.schemas.insertMany(
        schemaDocs.map(doc => {
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
        }),
      );
    }
    return schemaDocs.length;
  }
}

import { Injectable } from '@nestjs/common';
import { SchemaType } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { SchemaImportRepository } from '../repositories/schema-import.repository.js';
import { str, strings, timestamps, typeOf } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** Stage 7: the schemas, as stored (names are the references contents use). */
@Injectable()
export class SchemaImportService {
  constructor(private readonly schemas: SchemaImportRepository) {}

  /** Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const schemaDocs = await stage.client.list(stage.sourceSpaceId, 'schemas');
    if (schemaDocs.length) {
      await this.schemas.insertMany(
        schemaDocs.map(doc => ({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: stage.spaceId,
          name: doc.id,
          type: typeOf(SchemaType, SchemaType.ROOT, doc, warning => stage.warn(warning)),
          displayName: str(doc['displayName']),
          description: str(doc['description']),
          labels: strings(doc['labels']),
          previewField: str(doc['previewField']),
          fields: Array.isArray(doc['fields']) ? (doc['fields'] as unknown[]) : null,
          values: Array.isArray(doc['values']) ? (doc['values'] as { name: string; value: string }[]) : null,
          ...timestamps(doc),
        })),
      );
    }
    return schemaDocs.length;
  }
}

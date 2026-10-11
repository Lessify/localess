import { Injectable } from '@nestjs/common';
import { TranslationType } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { TranslationImportRepository } from '../repositories/translation-import.repository.js';
import { obj, str, strings, timestamps, typeOf } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** Stage 6: the translations, page by page, progress saved after each. */
@Injectable()
export class TranslationImportService {
  constructor(private readonly translations: TranslationImportRepository) {}

  /** Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    let translationCount = 0;
    for await (const page of stage.client.pages(stage.sourceSpaceId, 'translations')) {
      await this.translations.insertMany(
        page.map(doc => ({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: stage.spaceId,
          key: doc.id,
          type: typeOf(TranslationType, TranslationType.STRING, doc, warning => stage.warn(warning)),
          locales: obj<Record<string, string>>(doc['locales']) ?? {},
          labels: strings(doc['labels']),
          description: str(doc['description']),
          ...timestamps(doc),
        })),
      );
      translationCount += page.length;
      await stage.progress(translationCount);
    }
    return translationCount;
  }
}

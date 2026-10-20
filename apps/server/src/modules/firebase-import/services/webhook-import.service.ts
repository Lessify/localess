import { WebHookEvent } from '@localess/shared';
import { Injectable } from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { WebhookImportRepository } from '../repositories/webhook-import.repository.js';
import { knownValues, obj, str, timestamps } from '../utils/firebase-docs.js';
import type { ImportStage } from '../utils/firebase-import.utils.js';

/** Stage 5: the webhooks, disabled: both environments may run in parallel. */
@Injectable()
export class WebhookImportService {
  constructor(private readonly webhookImportRepository: WebhookImportRepository) {}

  /** Answers the count. */
  async import(stage: ImportStage): Promise<number> {
    const hookDocs = await stage.client.list(stage.sourceSpaceId, 'webhooks');
    for (const doc of hookDocs) {
      const events = knownValues(WebHookEvent, doc['events']);
      for (const it of events.dropped) stage.warn(`${str(doc['name']) ?? doc.id}: unknown event ${it}, dropped`);
      await this.webhookImportRepository.insert({
        id: newUuid(timestamps(doc).createdAt),
        spaceId: stage.spaceId,
        name: str(doc['name']) ?? 'Webhook',
        url: str(doc['url']) ?? '',
        enabled: false,
        events: events.kept,
        headers: obj<Record<string, string>>(doc['headers']),
        secret: str(doc['secret']),
        ...timestamps(doc),
      });
    }
    return hookDocs.length;
  }
}

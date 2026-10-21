import { WebhookEvent } from '@localess/shared';
import { Injectable } from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { toWebhookSecret } from '../../../shared/utils/webhook-signature.js';
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
      const events = knownValues(WebhookEvent, doc['events']);
      for (const it of events.dropped) stage.warn(`${str(doc['name']) ?? doc.id}: unknown event ${it}, dropped`);
      // Signed deliveries now follow Standard Webhooks: the same key, a new signature format.
      const secret = str(doc['secret']);
      if (secret) stage.warn(`${str(doc['name']) ?? doc.id}: signed; regenerate its secret and update the receiver (new signature format)`);
      await this.webhookImportRepository.insert({
        id: newUuid(timestamps(doc).createdAt),
        spaceId: stage.spaceId,
        name: str(doc['name']) ?? 'Webhook',
        url: str(doc['url']) ?? '',
        enabled: false,
        events: events.kept,
        headers: obj<Record<string, string>>(doc['headers']),
        secret: secret ? toWebhookSecret(secret) : undefined,
        ...timestamps(doc),
      });
    }
    return hookDocs.length;
  }
}

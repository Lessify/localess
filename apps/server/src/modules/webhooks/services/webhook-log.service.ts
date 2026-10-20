import { Injectable, NotFoundException } from '@nestjs/common';

import { toWebhookLog } from '../../../shared/transformers/webhook.transformer.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';
import { WebhookLogRepository } from '../repositories/webhook-log.repository.js';

/** A webhook's delivery logs. */
@Injectable()
export class WebhookLogService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly webhookLogRepository: WebhookLogRepository,
  ) {}

  /** Newest first: 100 unless another `limit` (1–1000) is asked for. */
  async findAll(spaceId: string, webhookId: string, limit = 100) {
    if (!(await this.webhookRepository.findById(spaceId, webhookId))) throw new NotFoundException('Webhook not found');
    return (await this.webhookLogRepository.findAll(webhookId, limit)).map(toWebhookLog);
  }
}

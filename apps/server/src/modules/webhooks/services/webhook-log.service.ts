import type { Page, WebHookLog, WebHookLogPageable } from '@localess/shared';
import { Injectable, NotFoundException } from '@nestjs/common';

import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { toWebhookLog } from '../../../shared/transformers/webhook.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';
import { WebhookLogRepository } from '../repositories/webhook-log.repository.js';

/** A webhook's delivery logs. */
@Injectable()
export class WebhookLogService {
  constructor(
    private readonly spaceLookupRepository: SpaceLookupRepository,
    private readonly webhookRepository: WebhookRepository,
    private readonly webhookLogRepository: WebhookLogRepository,
  ) {}

  /** One page, newest first: every delivery kept (`LOCALESS_WEBHOOK_LOG_DAYS`) can be reached. */
  async findAll(spaceId: string, webhookId: string, query: WebHookLogPageable): Promise<Page<WebHookLog>> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
    if (!(await this.webhookRepository.exists(spaceId, webhookId))) throw new NotFoundException('Webhook not found');
    const [rows, total] = await Promise.all([
      this.webhookLogRepository.findAll(webhookId, query),
      this.webhookLogRepository.findAllCount(webhookId, query),
    ]);
    return toPage(rows, total, query, toWebhookLog);
  }
}

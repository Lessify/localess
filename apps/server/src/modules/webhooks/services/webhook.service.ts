import type { WebHookEvent } from '@localess/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import type { WebhookEntity } from '../../../shared/entities/webhook.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { toWebhook } from '../../../shared/transformers/webhook.transformer.js';
import { checkWebhookUrl } from '../../../shared/utils/webhook-request.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';

export interface WebhookInput {
  name: string;
  url: string;
  events: WebHookEvent[];
  headers?: Record<string, string>;
  secret?: string;
}

function found(entity: WebhookEntity | undefined) {
  if (!entity) throw new NotFoundException('Webhook not found');
  return toWebhook(entity);
}

/**
 * Webhook configuration (the delivery logs: `WebhookLogService`); delivery is `WebhookDispatcher` (shared). Every route
 * checks the space first (404 "Space not found" before "Webhook not found").
 */
@Injectable()
export class WebhookService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    private readonly webhookRepository: WebhookRepository,
  ) {}

  /**
   * The rule delivery applies (`WebhookDispatcher`), said when saving: otherwise a URL delivery refuses
   * (http, a local or private host without LOCALESS_WEBHOOK_ALLOW_INTERNAL) is saved and every delivery fails.
   * The resolved-address check still runs at delivery (DNS can change).
   */
  private assertDeliverable(url: string): void {
    const checked = checkWebhookUrl(url, this.config.webhookAllowInternal);
    if (!checked.ok) throw new BadRequestException(`Webhook URL is not allowed: ${checked.reason}`);
  }

  async findAll(spaceId: string) {
    await this.requireSpace(spaceId);
    return (await this.webhookRepository.findAll(spaceId)).map(toWebhook);
  }

  async findOne(spaceId: string, webhookId: string) {
    await this.requireSpace(spaceId);
    return found(await this.webhookRepository.findById(spaceId, webhookId));
  }

  async create(spaceId: string, input: WebhookInput) {
    this.assertDeliverable(input.url);
    await this.requireSpace(spaceId);
    return toWebhook(await this.webhookRepository.create(spaceId, input));
  }

  /** Headers and secret are only replaced when sent (the form leaves them out to keep them). */
  async update(spaceId: string, webhookId: string, input: WebhookInput) {
    this.assertDeliverable(input.url);
    await this.requireSpace(spaceId);
    return found(
      await this.webhookRepository.update(spaceId, webhookId, {
        name: input.name,
        url: input.url,
        events: input.events,
        ...(input.headers ? { headers: input.headers } : {}),
        ...(input.secret ? { secret: input.secret } : {}),
      }),
    );
  }

  async updateStatus(spaceId: string, webhookId: string, enabled: boolean) {
    await this.requireSpace(spaceId);
    return found(await this.webhookRepository.update(spaceId, webhookId, { enabled }));
  }

  async remove(spaceId: string, webhookId: string): Promise<void> {
    await this.requireSpace(spaceId);
    if (!(await this.webhookRepository.delete(spaceId, webhookId))) throw new NotFoundException('Webhook not found');
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}

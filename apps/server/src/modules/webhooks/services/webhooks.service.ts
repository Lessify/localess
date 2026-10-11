import { Injectable, NotFoundException } from '@nestjs/common';
import type { WebHookEvent } from '@localess/shared';
import { toWebhook, toWebhookLog } from '../../../shared/transformers/webhook.transformer.js';
import { type WebhookEntity, WebhooksRepository } from '../repositories/webhooks.repository.js';

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

/** Webhook configuration and delivery logs (was `spaces/{s}/webhooks`); delivery is `WebhookDispatcher` (shared). */
@Injectable()
export class WebhooksService {
  constructor(private readonly webhooks: WebhooksRepository) {}

  async list(spaceId: string) {
    return (await this.webhooks.findAll(spaceId)).map(toWebhook);
  }

  async get(spaceId: string, id: string) {
    return found(await this.webhooks.findById(spaceId, id));
  }

  async logs(spaceId: string, id: string, limit?: number) {
    await this.get(spaceId, id);
    return (await this.webhooks.findLogs(id, limit)).map(toWebhookLog);
  }

  async create(spaceId: string, input: WebhookInput) {
    const entity = await this.webhooks.create(spaceId, input);
    if (!entity) throw new NotFoundException('Space not found');
    return toWebhook(entity);
  }

  /** Headers and secret are only replaced when sent (the form leaves them out to keep them). */
  async update(spaceId: string, id: string, input: WebhookInput) {
    return found(
      await this.webhooks.update(spaceId, id, {
        name: input.name,
        url: input.url,
        events: input.events,
        ...(input.headers ? { headers: input.headers } : {}),
        ...(input.secret ? { secret: input.secret } : {}),
      }),
    );
  }

  async setEnabled(spaceId: string, id: string, enabled: boolean) {
    return found(await this.webhooks.update(spaceId, id, { enabled }));
  }

  async delete(spaceId: string, id: string): Promise<void> {
    if (!(await this.webhooks.delete(spaceId, id))) throw new NotFoundException('Webhook not found');
  }
}

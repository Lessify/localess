import type { Page, WebHook, WebHookCreate, WebHookPageable, WebHookUpdate } from '@localess/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import type { WebhookEntity } from '../../../shared/entities/webhook.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { toWebhook } from '../../../shared/transformers/webhook.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { checkWebhookUrl, isReservedWebhookHeader } from '../../../shared/utils/webhook-request.js';
import { newWebhookSecret } from '../../../shared/utils/webhook-signature.js';
import { WebhookRepository } from '../repositories/webhook.repository.js';

/** No headers is `null` (the column), not `{}`. */
const nonEmpty = (headers: Record<string, string>): Record<string, string> | null => (Object.keys(headers).length ? headers : null);

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

  /** One page, by name unless sorted otherwise. */
  async findAll(spaceId: string, query: WebHookPageable): Promise<Page<WebHook>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.webhookRepository.findAll(spaceId, query),
      this.webhookRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toWebhook);
  }

  async findOne(spaceId: string, webhookId: string): Promise<WebHook> {
    return toWebhook(await this.requireWebhook(spaceId, webhookId));
  }

  async create(spaceId: string, input: WebHookCreate): Promise<WebHook> {
    this.assertDeliverable(input.url);
    await this.requireSpace(spaceId);
    this.assertHeaders(Object.keys(input.headers ?? {}));
    const secret = input.signed ? newWebhookSecret() : null;
    const webhookId = await this.webhookRepository.create(spaceId, {
      name: input.name,
      url: input.url,
      events: input.events,
      headers: nonEmpty(input.headers ?? {}),
      secret,
    });
    const webhook = toWebhook(await this.findWebhook(spaceId, webhookId));
    return secret ? { ...webhook, secret } : webhook;
  }

  /**
   * `headers` is every header the webhook keeps: a value replaces, `null` keeps the current value, one left out goes;
   * without `headers` all are kept. The secret has its own routes.
   */
  async update(spaceId: string, webhookId: string, input: WebHookUpdate): Promise<WebHook> {
    this.assertDeliverable(input.url);
    const current = await this.requireWebhook(spaceId, webhookId);
    await this.webhookRepository.update(spaceId, webhookId, {
      name: input.name,
      url: input.url,
      events: input.events,
      ...(input.headers ? { headers: this.mergeHeaders(current.headers ?? {}, input.headers) } : {}),
    });
    return toWebhook(await this.findWebhook(spaceId, webhookId));
  }

  async updateStatus(spaceId: string, webhookId: string, enabled: boolean): Promise<WebHook> {
    await this.requireWebhook(spaceId, webhookId);
    await this.webhookRepository.update(spaceId, webhookId, { enabled });
    return toWebhook(await this.findWebhook(spaceId, webhookId));
  }

  /**
   * A new signing secret, which the answer holds: the only time it is shown. The one before (if any) stops at once;
   * a webhook without one starts signing.
   */
  async createSecret(spaceId: string, webhookId: string): Promise<WebHook> {
    await this.requireWebhook(spaceId, webhookId);
    const secret = newWebhookSecret();
    await this.webhookRepository.update(spaceId, webhookId, { secret });
    return { ...toWebhook(await this.findWebhook(spaceId, webhookId)), secret };
  }

  /** Deliveries are no longer signed. */
  async removeSecret(spaceId: string, webhookId: string): Promise<void> {
    await this.requireWebhook(spaceId, webhookId);
    await this.webhookRepository.update(spaceId, webhookId, { secret: null });
  }

  /** Its logs cascade. */
  async remove(spaceId: string, webhookId: string): Promise<void> {
    await this.requireWebhook(spaceId, webhookId);
    await this.webhookRepository.delete(spaceId, webhookId);
  }

  /** The headers to store: a `null` value keeps the one the header has (a 400 when it has none). */
  private mergeHeaders(current: Record<string, string>, input: Record<string, string | null>): Record<string, string> | null {
    this.assertHeaders(Object.keys(input));
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(input)) {
      const kept = value ?? Object.entries(current).find(([it]) => it.toLowerCase() === name.toLowerCase())?.[1];
      if (kept === undefined) throw new BadRequestException(`Header ${name} has no value to keep`);
      headers[name] = kept;
    }
    return nonEmpty(headers);
  }

  /** Names Localess sets itself are refused, and a name given twice (headers are case-insensitive). */
  private assertHeaders(names: string[]): void {
    const reserved = names.find(isReservedWebhookHeader);
    if (reserved) throw new BadRequestException(`Header ${reserved} is set by Localess`);
    const lower = names.map(it => it.toLowerCase());
    const twice = names.find((_, index) => lower.indexOf(lower[index]) !== index);
    if (twice) throw new BadRequestException(`Header ${twice} is given twice`);
  }

  /** The space first: its 404 comes before the webhook's. */
  private async requireWebhook(spaceId: string, webhookId: string): Promise<WebhookEntity> {
    await this.requireSpace(spaceId);
    return this.findWebhook(spaceId, webhookId);
  }

  /** The webhook alone, the space already checked (the re-read after a write). */
  private async findWebhook(spaceId: string, webhookId: string): Promise<WebhookEntity> {
    const webhook = await this.webhookRepository.findOne(spaceId, webhookId);
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}

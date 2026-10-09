import { createHmac, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { and, arrayContains, eq } from 'drizzle-orm';
import { WebHookEvent } from '@localess/shared';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { webhookLogs, webhooks } from '../../infra/database/schema.js';
import { checkWebhookUrl, postWebhook, sanitizeWebhookHeaders } from './webhook-request.js';
import { EventsService } from '../../infra/events/events.service.js';

const MAX_RESPONSE_BODY_LENGTH = 4096;
const TIMEOUT_MS = 30_000;

export interface WebhookPayload {
  event: WebHookEvent;
  spaceId: string;
  timestamp: string;
  data: { id: string; fullSlug: string } | Record<string, never>;
}

type WebhookRow = typeof webhooks.$inferSelect;

export function generateSignature(secret: string, payload: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Delivers webhook events (ported from functions/src/utils/webhook-utils.ts): one POST per enabled
 * webhook subscribed to the event, signed with HMAC when it has a secret, SSRF-checked, logged to
 * `webhook_logs`. Deliveries run after the request that caused them has answered; shutdown waits for
 * the ones in flight.
 */
@Injectable()
export class WebhookDispatcher implements OnApplicationShutdown {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private readonly inFlight = new Set<Promise<void>>();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly events: EventsService,
  ) {}

  /** Fire-and-forget: never throws, never delays the caller. */
  dispatch(spaceId: string, event: WebHookEvent, data: WebhookPayload['data'] = {}): void {
    const payload: WebhookPayload = { event, spaceId, timestamp: new Date().toISOString(), data };
    const delivery = this.deliverAll(payload)
      .catch(error => this.logger.error(`Webhook dispatch for ${event} failed: ${error}`))
      .finally(() => this.inFlight.delete(delivery));
    this.inFlight.add(delivery);
  }

  /** Resolves when every dispatched delivery has finished (tests, shutdown). */
  async whenIdle(): Promise<void> {
    while (this.inFlight.size) await Promise.allSettled([...this.inFlight]);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.whenIdle();
  }

  private async deliverAll(payload: WebhookPayload): Promise<void> {
    const targets = await this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.spaceId, payload.spaceId), eq(webhooks.enabled, true), arrayContains(webhooks.events, [payload.event])));
    await Promise.allSettled(targets.map(webhook => this.deliver(webhook, payload)));
  }

  private async deliver(webhook: WebhookRow, payload: WebhookPayload): Promise<void> {
    const startTime = Date.now();
    const deliveryId = randomUUID();
    const payloadJson = JSON.stringify(payload);
    const requestSize = Buffer.byteLength(payloadJson, 'utf8');
    const headers: Record<string, string> = {
      ...sanitizeWebhookHeaders(webhook.headers ?? undefined),
      'Content-Type': 'application/json',
      'User-Agent': 'Localess-WebHook/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Delivery': deliveryId,
    };
    if (webhook.secret) headers['X-Webhook-Signature'] = generateSignature(webhook.secret, payloadJson);
    const base = { webhookId: webhook.id, event: payload.event, url: webhook.url, requestSize, deliveryId, data: payload.data };

    let log: typeof webhookLogs.$inferInsert;
    try {
      const checked = checkWebhookUrl(webhook.url, this.config.webhookAllowInternal);
      if (!checked.ok) throw Object.assign(new Error(`Webhook URL is not allowed: ${checked.reason}`), { code: 'EBLOCKEDURL' });
      const response = await postWebhook(checked.url, {
        headers,
        body: payloadJson,
        timeoutMs: TIMEOUT_MS,
        maxBodyBytes: MAX_RESPONSE_BODY_LENGTH,
        allowInternal: this.config.webhookAllowInternal,
      });
      // A 3xx is a failure: redirects are not followed, so the log shows where it pointed.
      const ok = response.status >= 200 && response.status < 300;
      log = {
        ...base,
        status: ok ? 'success' : 'failure',
        errorType: ok ? null : 'http',
        statusCode: response.status,
        statusText: response.statusText,
        duration: Date.now() - startTime,
        ...(response.body ? { responseBody: response.body, responseBodyTruncated: response.bodyTruncated } : {}),
      };
    } catch (error) {
      const err = error as Error;
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      log = {
        ...base,
        status: 'failure',
        errorType: isTimeout ? 'timeout' : 'network',
        errorMessage: err.message,
        duration: Date.now() - startTime,
      };
    }
    try {
      await this.db.insert(webhookLogs).values(log);
      await this.events.publish({ spaceId: payload.spaceId, entity: 'webhook_logs', id: webhook.id, op: 'created' });
    } catch (error) {
      this.logger.error(`Could not log webhook delivery ${deliveryId}: ${error}`);
    }
  }
}

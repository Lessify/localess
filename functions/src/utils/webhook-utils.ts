import { createHmac } from 'crypto';
import { logger } from 'firebase-functions/v2';
import { WebHook, WebHookPayload, WebHookLog, WebHookStatus } from '../models';
import { FieldValue, WithFieldValue } from 'firebase-admin/firestore';
import { findEnabledWebHooksByEvent } from '../services';
import { firestoreService } from '../config';

/**
 * Generate HMAC signature for webhook payload
 * @param {string} secret Secret key
 * @param {string} payload JSON payload
 * @return {string} HMAC signature
 */
export function generateSignature(secret: string, payload: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Trigger webhook with retry logic
 * @param {string} spaceId Space identifier
 * @param {string} webhookId WebHook identifier
 * @param {WebHook} webhook WebHook configuration
 * @param {WebHookPayload} payload Payload to send
 */
export async function triggerWebHook(spaceId: string, webhookId: string, webhook: WebHook, payload: WebHookPayload): Promise<void> {
  const startTime = Date.now();
  const payloadJson = JSON.stringify(payload);

  // Add signature if secret is configured
  if (webhook.secret) {
    payload.signature = generateSignature(webhook.secret, payloadJson);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Localess-WebHook/1.0',
    'X-Webhook-Event': payload.event,
    ...(webhook.headers || {}),
  };

  if (payload.signature) {
    headers['X-Webhook-Signature'] = payload.signature;
  }

  try {
    logger.info(`[triggerWebHook] Sending webhook to ${webhook.url}`);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadJson,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const status: WebHookStatus = response.ok ? 'success' : 'failure';

    // Log the webhook execution
    await logWebHookExecution(spaceId, webhookId, {
      webhookId: webhookId,
      event: payload.event,
      url: webhook.url,
      status: status,
      statusCode: response.status,
      responseTime: responseTime,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (response.ok) {
      logger.info(`[triggerWebHook] Webhook succeeded (${responseTime}ms)`);
    } else {
      logger.error(`[triggerWebHook] Webhook failed: HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    logger.error(`[triggerWebHook] Webhook error: ${error.message}`);

    // Log the failed execution
    await logWebHookExecution(spaceId, webhookId, {
      webhookId: webhookId,
      event: payload.event,
      url: webhook.url,
      status: 'failure',
      responseTime: responseTime,
      errorMessage: error.message,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Log webhook execution
 * @param {string} spaceId Space identifier
 * @param {string} webhookId WebHook identifier
 * @param {WebHookLog} log Log entry
 */
async function logWebHookExecution(spaceId: string, webhookId: string, log: WithFieldValue<WebHookLog>): Promise<void> {
  try {
    await firestoreService.collection(`spaces/${spaceId}/webhooks/${webhookId}/logs`).add(log);
  } catch (error: any) {
    logger.error(`[logWebHookExecution] Failed to log webhook execution: ${error.message}`);
  }
}

/**
 * Trigger all webhooks for a specific event
 * @param {string} spaceId Space identifier
 * @param {WebHookPayload} payload Webhook payload
 */
export async function triggerWebHooksForEvent(spaceId: string, payload: WebHookPayload): Promise<void> {
  try {
    const webhooksSnapshot = await findEnabledWebHooksByEvent(spaceId, payload.event).get();

    if (webhooksSnapshot.empty) {
      logger.info(`[triggerWebHooksForEvent] No webhooks configured for event ${payload.event}`);
      return;
    }

    logger.info(`[triggerWebHooksForEvent] Triggering ${webhooksSnapshot.size} webhook(s) for event ${payload.event}`);

    const promises = webhooksSnapshot.docs.map(doc => {
      const webhook = doc.data() as WebHook;
      return triggerWebHook(spaceId, doc.id, webhook, payload);
    });

    await Promise.allSettled(promises);
  } catch (error: any) {
    logger.error(`[triggerWebHooksForEvent] Error triggering webhooks: ${error.message}`);
  }
}

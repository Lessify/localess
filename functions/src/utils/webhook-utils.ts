import { createHmac, randomUUID } from 'crypto';
import { logger } from 'firebase-functions/v2';
import { WebHook, WebHookPayload, WebHookLog, WebHookLogSuccess, WebHookLogFailure, WebHookStatus, WebHookErrorType } from '../models';
import { FieldValue, WithFieldValue } from 'firebase-admin/firestore';
import { findEnabledWebHooksByEvent } from '../services';
import { firestoreService } from '../config';

const MAX_RESPONSE_BODY_LENGTH = 4096;

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
  const deliveryId = randomUUID();
  const payloadJson = JSON.stringify(payload);
  const requestSize = Buffer.byteLength(payloadJson, 'utf8');

  // Add signature if secret is configured
  if (webhook.secret) {
    payload.signature = generateSignature(webhook.secret, payloadJson);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Localess-WebHook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Delivery': deliveryId,
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

    const duration = Date.now() - startTime; // in milliseconds
    const responseTime = duration / 1000; // in seconds

    // Read response body (truncated) for debugging
    let responseBody: string | undefined;
    let responseBodyTruncated = false;
    try {
      const text = await response.text();
      if (text) {
        responseBody = text.slice(0, MAX_RESPONSE_BODY_LENGTH);
        responseBodyTruncated = text.length > MAX_RESPONSE_BODY_LENGTH;
      }
    } catch (bodyError: any) {
      logger.warn(`[triggerWebHook] Failed to read response body: ${bodyError.message}`);
    }

    if (response.ok) {
      // Log the successful execution
      const log: WithFieldValue<WebHookLogSuccess> = {
        event: payload.event,
        status: WebHookStatus.SUCCESS,
        url: webhook.url,
        statusCode: response.status,
        statusText: response.statusText,
        requestSize: requestSize,
        deliveryId: deliveryId,
        data: payload.data,
        duration: duration,
        createdAt: FieldValue.serverTimestamp(),
      };
      if (responseBody !== undefined) {
        log.responseBody = responseBody;
        log.responseBodyTruncated = responseBodyTruncated;
      }
      await logWebHookExecution(spaceId, webhookId, log);
      logger.info(`[triggerWebHook] Webhook succeeded (${responseTime}s)`);
    } else {
      // Log the failed execution (HTTP error response received)
      const log: WithFieldValue<WebHookLogFailure> = {
        event: payload.event,
        status: WebHookStatus.FAILURE,
        errorType: WebHookErrorType.HTTP,
        url: webhook.url,
        statusCode: response.status,
        statusText: response.statusText,
        requestSize: requestSize,
        deliveryId: deliveryId,
        data: payload.data,
        duration: duration,
        createdAt: FieldValue.serverTimestamp(),
      };
      if (responseBody !== undefined) {
        log.responseBody = responseBody;
        log.responseBodyTruncated = responseBodyTruncated;
      }
      await logWebHookExecution(spaceId, webhookId, log);
      logger.error(`[triggerWebHook] Webhook failed: HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime; // in milliseconds
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    logger.error(`[triggerWebHook] Webhook error: ${error.message}`);

    // Log the failed execution (no response received)
    const log: WithFieldValue<WebHookLogFailure> = {
      event: payload.event,
      status: WebHookStatus.FAILURE,
      errorType: isTimeout ? WebHookErrorType.TIMEOUT : WebHookErrorType.NETWORK,
      url: webhook.url,
      requestSize: requestSize,
      errorMessage: error.message,
      deliveryId: deliveryId,
      data: payload.data,
      duration: duration,
      createdAt: FieldValue.serverTimestamp(),
    };
    await logWebHookExecution(spaceId, webhookId, log);
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

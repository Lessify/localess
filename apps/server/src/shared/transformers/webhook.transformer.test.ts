import { describe, expect, it } from 'vitest';

import type { WebhookEntity } from '../entities/webhook.entity.js';
import type { WebhookLogEntity } from '../entities/webhook-log.entity.js';
import { toWebhook, toWebhookLog } from './webhook.transformer.js';

const at = new Date('2026-10-21T08:00:00.000Z');

const webhook: WebhookEntity = {
  id: 'w1',
  spaceId: 's1',
  name: 'Site',
  url: 'https://example.com/hook',
  enabled: true,
  events: ['content.published'],
  headers: null,
  secret: 's3cret',
  createdAt: at,
  updatedAt: at,
};

const log: WebhookLogEntity = {
  id: 'l1',
  webhookId: 'w1',
  event: 'content.published',
  url: 'https://example.com/hook',
  status: 'SUCCESS',
  statusCode: 200,
  statusText: 'OK',
  errorType: null,
  errorMessage: null,
  requestSize: 10,
  data: {},
  deliveryId: 'd1',
  duration: 5,
  responseBody: null,
  responseBodyTruncated: null,
  createdAt: at,
};

describe('webhook transformers', () => {
  it('answers a webhook with hasSecret, never the secret, the space or a null', () => {
    expect(toWebhook(webhook)).toEqual({
      id: 'w1',
      name: 'Site',
      url: 'https://example.com/hook',
      enabled: true,
      events: ['content.published'],
      hasSecret: true,
      createdAt: '2026-10-21T08:00:00.000Z',
      updatedAt: '2026-10-21T08:00:00.000Z',
    });
    const withHeaders = toWebhook({ ...webhook, secret: null, headers: { Authorization: 'Bearer t', 'X-Site': 'a' } });
    expect(withHeaders).not.toHaveProperty('headers');
    expect(JSON.stringify(withHeaders)).not.toContain('Bearer');
    expect(withHeaders).toMatchObject({
      hasSecret: false,
      headerNames: ['Authorization', 'X-Site'],
    });
  });

  it('answers a successful delivery with its status, without the webhook id or nulls', () => {
    expect(toWebhookLog(log)).toEqual({
      id: 'l1',
      event: 'content.published',
      url: 'https://example.com/hook',
      status: 'SUCCESS',
      statusCode: 200,
      statusText: 'OK',
      requestSize: 10,
      data: {},
      deliveryId: 'd1',
      duration: 5,
      createdAt: '2026-10-21T08:00:00.000Z',
    });
  });

  it('answers a failed delivery with its error and only the response fields it had', () => {
    const failed = toWebhookLog({
      ...log,
      status: 'FAILURE',
      statusCode: null,
      statusText: null,
      errorType: 'TIMEOUT',
      errorMessage: 'The operation was aborted',
    });
    expect(failed).toMatchObject({ status: 'FAILURE', errorType: 'TIMEOUT', errorMessage: 'The operation was aborted' });
    expect(failed).not.toHaveProperty('statusCode');
    expect(
      toWebhookLog({ ...log, status: 'FAILURE', statusCode: 500, errorType: 'HTTP', responseBody: 'boom', responseBodyTruncated: false }),
    ).toMatchObject({ status: 'FAILURE', errorType: 'HTTP', statusCode: 500, responseBody: 'boom', responseBodyTruncated: false });
  });
});

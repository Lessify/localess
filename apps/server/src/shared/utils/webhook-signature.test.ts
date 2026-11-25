import { Webhook } from 'standardwebhooks';
import { describe, expect, it } from 'vitest';

import { newWebhookSecret, signWebhook, toWebhookSecret } from './webhook-signature.js';

describe('webhook signature (Standard Webhooks)', () => {
  const body = JSON.stringify({ event: 'content.published', spaceId: 's1', timestamp: '2026-10-21T08:00:00.000Z', data: {} });

  it('makes a strong whsec_ secret, a new one each time', () => {
    const secret = newWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]{43}=$/);
    expect(Buffer.from(secret.slice(6), 'base64')).toHaveLength(32);
    expect(newWebhookSecret()).not.toBe(secret);
  });

  it('signs as the standardwebhooks library verifies', () => {
    const secret = newWebhookSecret();
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = {
      'webhook-id': 'd1',
      'webhook-timestamp': String(timestamp),
      'webhook-signature': signWebhook(secret, 'd1', timestamp, body),
    };
    expect(new Webhook(secret).verify(body, headers)).toEqual(JSON.parse(body));
    expect(() => new Webhook(newWebhookSecret()).verify(body, headers)).toThrow();
    expect(() => new Webhook(secret).verify(body.replace('s1', 's2'), headers)).toThrow();
  });

  it('refuses an old delivery (replay)', () => {
    const secret = newWebhookSecret();
    const old = Math.floor(Date.now() / 1000) - 10 * 60;
    const headers = { 'webhook-id': 'd1', 'webhook-timestamp': String(old), 'webhook-signature': signWebhook(secret, 'd1', old, body) };
    expect(() => new Webhook(secret).verify(body, headers)).toThrow();
  });

  it('keeps a secret from before as the same key, in the whsec_ form', () => {
    const legacy = toWebhookSecret('shh');
    expect(legacy).toBe(`whsec_${Buffer.from('shh').toString('base64')}`);
    expect(toWebhookSecret(legacy)).toBe(legacy);
    const timestamp = Math.floor(Date.now() / 1000);
    const headers = {
      'webhook-id': 'd1',
      'webhook-timestamp': String(timestamp),
      'webhook-signature': signWebhook(legacy, 'd1', timestamp, body),
    };
    expect(new Webhook(legacy).verify(body, headers)).toBeTruthy();
  });
});

import { createHmac, randomBytes } from 'node:crypto';

/** What a webhook secret starts with (Standard Webhooks): `whsec_` then the key, base64. */
const SECRET_PREFIX = 'whsec_';

/** A new signing secret: 32 random bytes, `whsec_<base64>` (https://www.standardwebhooks.com). */
export function newWebhookSecret(): string {
  return SECRET_PREFIX + randomBytes(32).toString('base64');
}

/**
 * A secret kept from before (the Firebase import: any string) in the `whsec_` form, signing with the same bytes. A secret
 * already in that form is answered as it is.
 */
export function toWebhookSecret(secret: string): string {
  return secret.startsWith(SECRET_PREFIX) ? secret : SECRET_PREFIX + Buffer.from(secret, 'utf8').toString('base64');
}

/**
 * The `webhook-signature` header of a delivery (Standard Webhooks): `v1,` and the base64 HMAC-SHA256, keyed with the
 * secret's bytes, of `<id>.<timestamp>.<body>`. The receiver checks it with the `standardwebhooks` library, which also
 * refuses a timestamp more than 5 minutes off (a replayed delivery).
 */
export function signWebhook(secret: string, id: string, timestamp: number, body: string): string {
  const key = Buffer.from(secret.slice(SECRET_PREFIX.length), 'base64');
  return 'v1,' + createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
}

import { lookup as dnsLookup, LookupAddress } from 'dns';
import http from 'http';
import https from 'https';
import { BlockList, isIP } from 'net';

/**
 * Outbound requests for webhooks. The URL and headers come from a space manager, and the request
 * runs inside the project with the Functions service account, so it must not be able to reach
 * anything that is not a public internet host: the metadata server (169.254.169.254, which hands
 * out that service account's OAuth token), loopback, private networks. The check is done in the
 * socket's DNS lookup, on the exact address being connected to, so DNS rebinding cannot swap in
 * an internal address after validation. Redirects are never followed.
 */

/** Address ranges a webhook may never connect to. */
const BLOCKED = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. the GCP metadata server
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. broadcast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64, embeds IPv4
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6');
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata', 'metadata.google.internal']);

/** Headers a webhook's custom headers may not set; Localess owns these. */
const RESERVED_HEADERS = new Set([
  'host',
  'metadata-flavor',
  'content-length',
  'transfer-encoding',
  'connection',
  'content-type',
  'user-agent',
]);

/**
 * @param {string} address an IPv4 or IPv6 address, without brackets
 * @return {boolean} true when a webhook must not connect to it
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, 'ipv4');
  if (family === 6) {
    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible forms reach the IPv4 address they embed.
    const mapped = address.toLowerCase().match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    const hexMapped = address.toLowerCase().match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hexMapped) {
      const high = parseInt(hexMapped[1], 16);
      const low = parseInt(hexMapped[2], 16);
      return isBlockedAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return BLOCKED.check(address, 'ipv6');
  }
  return true; // not an IP address at all
}

export type WebhookUrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Validates a webhook URL before any connection is made.
 *
 * @param {string} raw the configured webhook URL
 * @param {boolean} allowInternal true in the emulator, where webhooks point at local servers
 * @return {WebhookUrlCheck} the parsed URL, or why it is refused
 */
export function checkWebhookUrl(raw: unknown, allowInternal: boolean): WebhookUrlCheck {
  if (typeof raw !== 'string') return { ok: false, reason: 'missing URL' };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'invalid URL' };
  }
  if (allowInternal) {
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? { ok: true, url }
      : { ok: false, reason: 'only http(s) URLs are allowed' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'only https URLs are allowed' };
  if (url.username || url.password) return { ok: false, reason: 'credentials in the URL are not allowed' };
  if (url.port && url.port !== '443') return { ok: false, reason: 'only the default https port is allowed' };
  // WHATWG URL parsing already normalises IPv4 shorthands (0x7f.1, 2130706433, …) to dotted form.
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, reason: 'internal host' };
  }
  if (isIP(host) && isBlockedAddress(host)) return { ok: false, reason: 'private address' };
  return { ok: true, url };
}

/**
 * Drops custom headers that would override transport or Localess headers.
 *
 * @param {Record<string, string> | undefined} headers custom headers from the webhook
 * @return {Record<string, string>} headers safe to send
 */
export function sanitizeWebhookHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    const lower = name.toLowerCase();
    if (RESERVED_HEADERS.has(lower) || lower.startsWith('x-webhook-')) continue;
    if (typeof value !== 'string') continue;
    safe[name] = value;
  }
  return safe;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup that refuses internal addresses; used as the socket's `lookup` so the check applies
 * to the address actually connected to.
 * @param {string} hostname host to resolve
 * @param {object} options lookup options from the socket
 * @param {Function} callback node-style lookup callback
 */
function guardedLookup(hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback): void {
  dnsLookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some(entry => isBlockedAddress(entry.address))) {
      const error: NodeJS.ErrnoException = new Error(`Webhook URL is not allowed: '${hostname}' resolves to a private address`);
      error.code = 'EBLOCKEDADDRESS';
      return callback(error, []);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

export interface WebhookResponse {
  status: number;
  statusText: string;
  body: string;
  bodyTruncated: boolean;
}

export interface WebhookRequestOptions {
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
  maxBodyBytes: number;
  allowInternal: boolean;
}

/**
 * POSTs a webhook. Resolves with the response (any status, including 3xx, which is not followed)
 * and rejects on a refused URL, network error or timeout. At most `maxBodyBytes` of the response
 * body are read.
 *
 * @param {URL} url a URL that passed {@link checkWebhookUrl}
 * @param {WebhookRequestOptions} options request settings
 * @return {Promise<WebhookResponse>} status line and (truncated) body
 */
export function postWebhook(url: URL, options: WebhookRequestOptions): Promise<WebhookResponse> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'http:' ? http : https;
    const req = transport.request(
      url,
      {
        method: 'POST',
        headers: { ...options.headers, 'Content-Length': Buffer.byteLength(options.body, 'utf8').toString() },
        lookup: options.allowInternal ? undefined : (guardedLookup as never),
        signal: AbortSignal.timeout(options.timeoutMs),
      },
      res => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const finish = () =>
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            body: Buffer.concat(chunks).toString('utf8'),
            bodyTruncated: truncated,
          });
        res.on('data', (chunk: Buffer) => {
          if (truncated) return;
          const remaining = options.maxBodyBytes - size;
          if (chunk.length > remaining) {
            chunks.push(chunk.subarray(0, remaining));
            size = options.maxBodyBytes;
            truncated = true;
            // Enough for the log; stop downloading an arbitrarily large or endless body.
            finish();
            res.destroy();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        res.on('end', () => {
          if (!truncated) finish();
        });
        res.on('error', error => {
          if (!truncated) reject(error);
        });
      }
    );
    req.on('error', reject);
    req.end(options.body);
  });
}

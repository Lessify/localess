import http from 'http';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebHook, WebHookPayload } from '../models';

/**
 * `triggerWebHook` against a real local HTTP server. `FUNCTIONS_EMULATOR` is set so http and
 * loopback targets are allowed, and `FIREBASE_CONFIG` so `config.ts` can load; the Firestore log
 * write is spied on the real exported service.
 */
let triggerWebHook: typeof import('./webhook-utils').triggerWebHook;
let generateSignature: typeof import('./webhook-utils').generateSignature;
let logs: Record<string, unknown>[];
let server: http.Server;
let base: string;
const received: { headers: http.IncomingHttpHeaders; body: string }[] = [];

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  process.env['FUNCTIONS_EMULATOR'] = 'true';
  const config = await import('../config');
  vi.spyOn(config.firestoreService, 'collection').mockReturnValue({
    add: async (log: Record<string, unknown>) => {
      logs.push(log);
    },
  } as never);
  ({ triggerWebHook, generateSignature } = await import('./webhook-utils'));

  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      received.push({ headers: req.headers, body });
      res.writeHead(200).end('ok');
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

beforeEach(() => {
  logs = [];
  received.length = 0;
});

const payload = (): WebHookPayload =>
  ({ event: 'content.published', spaceId: 'S', timestamp: 't', data: { id: 'C', fullSlug: 'c' } }) as WebHookPayload;
const webhook = (overrides: Partial<WebHook>): WebHook =>
  ({ name: 'w', url: `${base}/hook`, enabled: true, events: [], ...overrides }) as WebHook;

describe('triggerWebHook', () => {
  it('signs each webhook separately and never leaks one signature to another', async () => {
    const shared = payload();

    await triggerWebHook('S', 'w1', webhook({ secret: 'secret-1' }), shared);
    await triggerWebHook('S', 'w2', webhook({}), shared);

    const [first, second] = received;
    expect(first.headers['x-webhook-signature']).toBe(generateSignature('secret-1', first.body));
    expect(JSON.parse(first.body).signature).toBeUndefined();
    expect(second.headers['x-webhook-signature']).toBeUndefined();
    expect(JSON.parse(second.body).signature).toBeUndefined();
    expect(shared.signature).toBeUndefined();
  });

  it('does not let custom headers override Localess or transport headers', async () => {
    await triggerWebHook(
      'S',
      'w1',
      webhook({ secret: 's', headers: { 'X-Webhook-Signature': 'forged', 'Metadata-Flavor': 'Google', 'X-Custom': 'kept' } }),
      payload()
    );

    const [{ headers }] = received;
    expect(headers['x-webhook-signature']).not.toBe('forged');
    expect(headers['metadata-flavor']).toBeUndefined();
    expect(headers['x-custom']).toBe('kept');
  });

  it('logs a refused URL as a network failure without sending anything', async () => {
    await triggerWebHook('S', 'w1', webhook({ url: 'ftp://example.com/' }), payload());

    expect(received).toHaveLength(0);
    expect(logs[0]).toMatchObject({
      status: 'failure',
      errorType: 'network',
      errorMessage: 'Webhook URL is not allowed: only http(s) URLs are allowed',
    });
  });
});

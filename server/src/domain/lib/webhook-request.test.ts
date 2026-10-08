import http from 'http';
import { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkWebhookUrl, isBlockedAddress, postWebhook, sanitizeWebhookHeaders } from './webhook-request.js';

describe('isBlockedAddress', () => {
  it.each([
    ['127.0.0.1'],
    ['10.1.2.3'],
    ['172.16.0.1'],
    ['192.168.1.1'],
    ['169.254.169.254'],
    ['100.64.0.1'],
    ['0.0.0.0'],
    ['224.0.0.1'],
    ['::1'],
    ['::'],
    ['fc00::1'],
    ['fd12:3456::1'],
    ['fe80::1'],
    ['::ffff:169.254.169.254'],
    ['::ffff:a9fe:a9fe'],
    ['::ffff:127.0.0.1'],
  ])('blocks %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([['8.8.8.8'], ['1.1.1.1'], ['2606:4700:4700::1111'], ['::ffff:8.8.8.8']])('allows public %s', address => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it('blocks anything that is not an IP', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
  });
});

describe('checkWebhookUrl', () => {
  it('accepts a public https URL', () => {
    expect(checkWebhookUrl('https://hooks.example.com/localess?x=1', false).ok).toBe(true);
    expect(checkWebhookUrl('https://hooks.example.com:443/', false).ok).toBe(true);
  });

  it.each([
    ['http://hooks.example.com/', 'only https URLs are allowed'],
    ['ftp://hooks.example.com/', 'only https URLs are allowed'],
    ['https://user:pass@hooks.example.com/', 'credentials in the URL are not allowed'],
    ['https://hooks.example.com:8080/', 'only the default https port is allowed'],
    ['https://localhost/', 'internal host'],
    ['https://metadata.google.internal/computeMetadata/v1/', 'internal host'],
    ['https://169.254.169.254/', 'private address'],
    ['https://0x7f.1/', 'private address'],
    ['https://2130706433/', 'private address'],
    ['https://[::1]/', 'private address'],
    ['https://[::ffff:169.254.169.254]/', 'private address'],
    ['not a url', 'invalid URL'],
  ])('refuses %s', (url, reason) => {
    expect(checkWebhookUrl(url, false)).toEqual({ ok: false, reason });
  });

  it('allows http and local hosts in the emulator', () => {
    expect(checkWebhookUrl('http://localhost:3000/hook', true).ok).toBe(true);
    expect(checkWebhookUrl('ftp://localhost/', true).ok).toBe(false);
  });
});

describe('sanitizeWebhookHeaders', () => {
  it('drops transport, metadata and Localess headers but keeps the rest', () => {
    expect(
      sanitizeWebhookHeaders({
        Authorization: 'Bearer x',
        'X-Custom': 'y',
        Host: 'internal',
        'Metadata-Flavor': 'Google',
        'content-length': '1',
        'X-Webhook-Signature': 'forged',
        'User-Agent': 'spoof',
      }),
    ).toEqual({ Authorization: 'Bearer x', 'X-Custom': 'y' });
  });

  it('handles missing headers', () => {
    expect(sanitizeWebhookHeaders(undefined)).toEqual({});
  });
});

describe('postWebhook', () => {
  let server: http.Server;
  let base: string;
  const hits: string[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits.push(req.url ?? '');
      if (req.url === '/redirect') {
        res.writeHead(302, { Location: '/target' }).end();
      } else if (req.url === '/big') {
        res.writeHead(200).end('x'.repeat(10_000));
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
      }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

  const options = { headers: {}, body: '{}', timeoutMs: 5000, maxBodyBytes: 4096, allowInternal: true };

  it('does not follow redirects', async () => {
    const res = await postWebhook(new URL(`${base}/redirect`), options);

    expect(res.status).toBe(302);
    expect(hits).not.toContain('/target');
  });

  it('reads at most maxBodyBytes of the response', async () => {
    const res = await postWebhook(new URL(`${base}/big`), options);

    expect(res.body.length).toBe(4096);
    expect(res.bodyTruncated).toBe(true);
  });

  it('refuses a hostname that resolves to a private address, at connect time', async () => {
    const port = (server.address() as AddressInfo).port;

    await expect(postWebhook(new URL(`http://localhost:${port}/`), { ...options, allowInternal: false })).rejects.toThrow(
      'resolves to a private address',
    );
  });
});

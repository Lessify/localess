import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeFirebase } from '../../../test/fake-firebase.js';
import { FirebaseClient, FirebaseConnectionError, normalizeOrigin } from './firebase-client.js';

let fake: Awaited<ReturnType<typeof fakeFirebase>>;

beforeAll(async () => {
  fake = await fakeFirebase(
    [
      {
        id: 's1',
        name: 'Site',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        tokens: [{ id: 'TOKEN000000000000001', name: 'web' }],
        translations: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        files: { a1: Buffer.from('bytes') },
      },
    ],
    { pageSize: 2 },
  );
});
afterAll(() => fake.close());

describe('normalizeOrigin', () => {
  it('accepts public https origins, with or without a path, without trailing slashes', () => {
    expect(normalizeOrigin('https://cms.example.com/')).toBe('https://cms.example.com');
    expect(normalizeOrigin('https://example.com/localess/')).toBe('https://example.com/localess');
  });

  it('refuses what a webhook URL may not be: http, internal hosts, private addresses, credentials, other ports', () => {
    for (const origin of [
      'http://cms.example.com',
      'ftp://x',
      'https://localhost',
      'https://127.0.0.1',
      'https://10.0.0.5',
      'https://169.254.169.254',
      'https://metadata.google.internal',
      'https://user:pass@cms.example.com',
      'https://cms.example.com:8443',
    ]) {
      expect(() => normalizeOrigin(origin), origin).toThrow(FirebaseConnectionError);
    }
  });

  it('allows local http only when internal hosts are allowed (LOCALESS_WEBHOOK_ALLOW_INTERNAL)', () => {
    expect(normalizeOrigin('http://localhost:5000', true)).toBe('http://localhost:5000');
  });
});

describe('FirebaseClient', () => {
  const client = () => new FirebaseClient(`${fake.url}/`, 'migration-secret', { allowInternal: true });

  it('joins paths under an origin with a trailing slash', async () => {
    expect(await client().spaces()).toEqual([{ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' }]);
    expect(fake.requests.at(-1)).toBe('/api/migration/spaces');
  });

  it('reads a space and a small collection', async () => {
    expect(await client().space('s1')).toMatchObject({ id: 's1', name: 'Site' });
    expect(await client().list('s1', 'tokens')).toEqual([{ id: 'TOKEN000000000000001', name: 'web' }]);
  });

  it('follows cursors until the last page', async () => {
    const pages: string[][] = [];
    for await (const page of client().pages('s1', 'translations')) pages.push(page.map(it => it.id));
    expect(pages).toEqual([['a', 'b'], ['c']]);
  });

  it('streams asset files, null when missing', async () => {
    const stream = await client().assetFile('s1', 'a1');
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('bytes');
    expect(await client().assetFile('s1', 'missing')).toBeNull();
  });

  it('names the failure: wrong token, disabled API, unreachable', async () => {
    const local = { allowInternal: true };
    await expect(new FirebaseClient(fake.url, 'wrong', local).spaces()).rejects.toMatchObject({ reason: 'unauthorized' });
    await expect(new FirebaseClient(`${fake.url}/nothing-here`, 'migration-secret', local).spaces()).rejects.toMatchObject({ reason: 'disabled' });
    await expect(new FirebaseClient('http://127.0.0.1:1', 'x', local).spaces()).rejects.toBeInstanceOf(FirebaseConnectionError);
  });

  it('reports a site without the migration API (its app answering 200 with HTML) as not enabled', async () => {
    const spa = await fakeFirebase([], { spa: true });
    try {
      await expect(new FirebaseClient(spa.url, 'migration-secret', { allowInternal: true }).spaces()).rejects.toMatchObject({ reason: 'disabled' });
    } finally {
      await spa.close();
    }
  });

  it('does not follow redirects', async () => {
    await expect(new FirebaseClient(`${fake.url}/moved`, 'migration-secret', { allowInternal: true }).spaces()).rejects.toMatchObject({
      reason: 'failed',
    });
  });
});

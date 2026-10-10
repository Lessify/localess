import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spaces, tokens, translations, webhooks } from '../src/infra/database/schema.js';
import { WebhookDispatcher } from '../src/modules/webhooks/webhook-dispatcher.service.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';

/** A local HTTP server recording requests and answering with `respond`. */
async function fakeServer(respond: (request: IncomingMessage) => { status: number; body: unknown; headers?: Record<string, string> }) {
  const requests: { url: string; headers: IncomingMessage['headers']; body: string }[] = [];
  const server: Server = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => (body += chunk));
    request.on('end', () => {
      requests.push({ url: request.url ?? '', headers: request.headers, body });
      const answer = respond(request);
      response.writeHead(answer.status, { 'content-type': 'application/json', ...answer.headers }).end(JSON.stringify(answer.body));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

describe('app API: translations, machine translation, Unsplash', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let hooks: Awaited<ReturnType<typeof fakeServer>>;
  let unsplash: Awaited<ReturnType<typeof fakeServer>>;
  const base = `/api/app/spaces/${S1}/translations`;
  const TOKEN = 'TTTTTTTTTTTTTTTTTTTT';

  beforeAll(async () => {
    hooks = await fakeServer(() => ({ status: 204, body: '' }));
    unsplash = await fakeServer(request => ({
      status: 200,
      body: request.url?.startsWith('/search') ? { total: 1, results: [{ id: 'p1' }] } : [{ id: 'r1' }],
      headers: { 'X-RateLimit-Limit': '50', 'X-RateLimit-Remaining': '49' },
    }));
    t = await createTestApp({
      LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true',
      LOCALESS_TRANSLATE_PROVIDER: 'stub',
      UNSPLASH_API_KEY: 'unsplash-key',
      LOCALESS_UNSPLASH_API_URL: unsplash.url,
    });
    await t.db.insert(spaces).values({
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      localeFallback: { id: 'en', name: 'English' },
    });
    await t.db
      .insert(tokens)
      .values({ id: newUuid(), token: TOKEN, spaceId: S1, name: 't', version: 2, permissions: ['TRANSLATION_PUBLIC', 'TRANSLATION_DRAFT'] });
    await t.db
      .insert(webhooks)
      .values({ id: newUuid(), spaceId: S1, name: 'h', url: `${hooks.url}/hook`, events: ['translation.changed', 'translation.published'] });
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'custom',
        permissions: [
          'TRANSLATION_READ',
          'TRANSLATION_CREATE',
          'TRANSLATION_UPDATE',
          'TRANSLATION_DELETE',
          'TRANSLATION_PUBLISH',
          'CONTENT_UPDATE',
          'ASSET_CREATE',
        ],
      }),
    );
    reader = api(
      t,
      await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['TRANSLATION_READ', 'TRANSLATION_UPDATE'] }),
    );
  });

  afterAll(async () => {
    await t?.close();
    await hooks?.close();
    await unsplash?.close();
  });

  beforeEach(async () => {
    await t.app.get(WebhookDispatcher).whenIdle();
    hooks.requests.length = 0;
  });

  const events = async () => {
    await t.app.get(WebhookDispatcher).whenIdle();
    return hooks.requests.map(it => JSON.parse(it.body).event);
  };
  const space = async () => (await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0];
  const stored = async (key: string) =>
    (
      await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, S1), eq(translations.key, key)))
    )[0];
  // Routes take the row UUID; tests name translations by key.
  const ids: Record<string, string> = {};
  const url = (key: string) => `${base}/${ids[key]}`;

  describe('keys', () => {
    it('creates keys with a UUIDv7 id, refusing duplicates, with translation.changed and a version bump', async () => {
      const before = (await space()).translationVersion;
      const response = await editor.post(base, { key: 'home.title', type: 'STRING', locales: { en: 'Welcome' }, labels: ['home'] });
      expect(response.statusCode).toBe(201);
      ids['home.title'] = response.json().id;
      expect(response.json()).toMatchObject({
        id: expect.stringMatching(UUID_V7),
        key: 'home.title',
        locales: { en: 'Welcome' },
        labels: ['home'],
        updatedBy: { email: 'editor@example.com' },
      });
      expect((await space()).translationVersion).toBe(before + 1);
      expect(await events()).toEqual(['translation.changed']);
      expect((await editor.post(base, { key: 'home.title', type: 'STRING', locales: {} })).statusCode).toBe(409);
      expect((await reader.post(base, { key: 'x', type: 'STRING', locales: {} })).statusCode).toBe(403);
      // Routes take the UUID, not the key.
      expect((await reader.get(`${base}/home.title`)).statusCode).toBe(404);
    });

    it('sets and removes one locale value without touching the others', async () => {
      await editor.put(`${url('home.title')}/locales/de`, { value: 'Willkommen' });
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome', de: 'Willkommen' });
      await editor.put(`${url('home.title')}/locales/de`, { value: '' });
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome' });
    });

    it('updates labels and description, clearing them when empty', async () => {
      expect((await editor.patch(url('home.title'), { description: 'Hero heading' })).json()).toMatchObject({
        description: 'Hero heading',
      });
      expect((await editor.patch(url('home.title'), {})).json()).not.toHaveProperty('labels');
    });

    it('renames: a new key under the same id, refusing a taken key', async () => {
      ids['taken'] = (await editor.post(base, { key: 'taken', type: 'STRING', locales: { en: 'x' } })).json().id;
      expect((await editor.put(`${url('home.title')}/key`, { key: 'taken' })).statusCode).toBe(409);
      const renamed = (await editor.put(`${url('home.title')}/key`, { key: 'hero.title' })).json();
      expect(renamed).toMatchObject({ id: ids['home.title'], key: 'hero.title' });
      ids['hero.title'] = renamed.id;
      expect(await stored('home.title')).toBeUndefined();
    });

    it('lists by key and counts', async () => {
      expect((await reader.get(base)).json().map((it: { key: string }) => it.key)).toEqual(['hero.title', 'taken']);
      expect((await reader.get(`${base}/count`)).json()).toEqual({ count: 2 });
    });
  });

  describe('publishing', () => {
    it('publishes every locale with fallback filling, records progress, and the public API serves it', async () => {
      await editor.put(`${url('taken')}/locales/de`, { value: 'genommen' });
      await t.app.get(WebhookDispatcher).whenIdle();
      hooks.requests.length = 0;
      expect((await editor.post(`${base}/publish`)).statusCode).toBe(204);
      expect((await space()).progress).toEqual({ translations: { en: 2, de: 1 } });
      expect(await events()).toEqual(['translation.published']);

      const redirect = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/translations/de?token=${TOKEN}` });
      const published = await t.request({ method: 'GET', url: redirect.headers.location as string });
      expect(published.json()).toEqual({ 'hero.title': 'Welcome', taken: 'genommen' });
    });

    it('requires TRANSLATION_PUBLISH', async () => {
      expect((await reader.post(`${base}/publish`)).statusCode).toBe(403);
    });
  });

  describe('machine translation (stub provider)', () => {
    it('translates a locale: only keys missing the target, unless overwrite', async () => {
      const response = await editor.post(`${base}/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'de' });
      expect(response.json()).toEqual({ translated: 1, failed: 0 });
      expect((await stored('hero.title')).locales.de).toBe('Welcome : en -> de');
      expect((await stored('taken')).locales.de).toBe('genommen');

      expect(
        (await editor.post(`${base}/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'de', overwrite: true })).json(),
      ).toEqual({
        translated: 2,
        failed: 0,
      });
      expect((await stored('taken')).locales.de).toBe('x : en -> de');
    });

    it('translates single strings and batches for editors with both permissions', async () => {
      expect(
        (await editor.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: '<p>Hi</p>', format: 'html' })).json(),
      ).toEqual({
        content: '<p>Hi</p><p><em>en -&gt; de</em></p>',
      });
      expect(
        (await editor.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', items: [{ id: 'a', content: 'One' }] })).json(),
      ).toEqual({
        items: [{ id: 'a', content: 'One : en -> de' }],
        failed: [],
      });
      // TRANSLATION_UPDATE alone is not enough: the callable required CONTENT_UPDATE too.
      expect((await reader.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'x' })).statusCode).toBe(403);
    });
  });

  describe('Unsplash', () => {
    it('proxies search and random with the server-side key, passing rate limits through', async () => {
      const search = await editor.get('/api/app/plugins/unsplash/search?query=cats&perPage=5&orientation=landscape');
      expect(search.json()).toEqual({ limit: '50', remaining: '49', total: 1, results: [{ id: 'p1' }] });
      const request = unsplash.requests.at(-1)!;
      expect(request.headers.authorization).toBe('Client-ID unsplash-key');
      expect(new URL(request.url, unsplash.url).searchParams.get('orientation')).toBe('landscape');
      expect((await editor.get('/api/app/plugins/unsplash/random')).json()).toEqual({
        limit: '50',
        remaining: '49',
        results: [{ id: 'r1' }],
      });
      expect((await reader.get('/api/app/plugins/unsplash/random')).statusCode).toBe(403);
    });
  });

  describe('deleting', () => {
    it('deletes one key, or all keys with SPACE_MANAGEMENT', async () => {
      expect((await editor.delete(url('taken'))).statusCode).toBe(204);
      expect((await editor.delete(base)).statusCode).toBe(403);
      const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
      expect((await admin.delete(base)).statusCode).toBe(204);
      expect((await reader.get(`${base}/count`)).json()).toEqual({ count: 0 });
    });
  });
});

describe('app API: without a translation provider or Unsplash key', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await t.db.insert(spaces).values({
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      localeFallback: { id: 'en', name: 'English' },
    });
  });

  afterAll(() => t?.close());

  it('answers 412 with an explanation, so the UI can tell the user why', async () => {
    const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
    expect((await admin.get('/api/app/translate/status')).json()).toEqual({ enabled: false, provider: 'none' });
    const single = await admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'x' });
    expect(single.statusCode).toBe(412);
    expect(single.json().message).toMatch(/not configured on this environment/);
    const batch = await admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', items: [{ id: 'a', content: 'x' }] });
    expect(batch.statusCode).toBe(412);
    // Even with nothing to translate: the user learns translation is unavailable, not "0 translated".
    const locale = await admin.post(`/api/app/spaces/${S1}/translations/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'de' });
    expect(locale.statusCode).toBe(412);
    expect((await admin.get('/api/app/plugins/unsplash/random')).statusCode).toBe(501);
  });
});

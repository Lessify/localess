import { TokenType, TRANSLATION_VALUE_MAX_LENGTH } from '@localess/shared';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { tokens, translations, webhooks } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { TaskWorker } from '../src/modules/tasks/workers/task-worker.service.js';
import { IntegrationService } from '../src/shared/services/integration.service.js';
import { TranslateService } from '../src/shared/services/translate.service.js';
import { WebhookDispatcher } from '../src/shared/services/webhook-dispatcher.service.js';
import { newApiToken } from '../src/shared/utils/api-token-format.js';
import { fakeServer } from './fake-server.js';
import { S1, UUID_V7 } from './ids.js';
import { tokenRow } from './seed.js';
import { api, buildDrafts, createTestApp, createUser, draftSnapshots, insertSpace, TestApp, userWithAccess } from './test-app.js';

describe('app API: translations, machine translation, Unsplash', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let hooks: Awaited<ReturnType<typeof fakeServer>>;
  let unsplash: Awaited<ReturnType<typeof fakeServer>>;
  const base = `/api/app/spaces/${S1}/translations`;
  const TOKEN = newApiToken(TokenType.PREVIEW);

  beforeAll(async () => {
    hooks = await fakeServer(() => ({ status: 204, body: '' }));
    unsplash = await fakeServer(request => ({
      status: request.url?.includes('query=refused') ? 401 : 200,
      body: request.url?.startsWith('/search') ? { total: 1, results: [{ id: 'p1' }] } : [{ id: 'r1' }],
      headers: { 'X-RateLimit-Limit': '50', 'X-RateLimit-Remaining': '49' },
    }));
    t = await createTestApp({
      LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true',
      LOCALESS_TRANSLATE_PROVIDER: 'stub',
      UNSPLASH_API_KEY: 'unsplash-key',
      LOCALESS_UNSPLASH_API_URL: unsplash.url,
    });
    await insertSpace(t.db, {
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      defaultLocale: { id: 'en', name: 'English' },
    });
    await t.db.insert(tokens).values(tokenRow(S1, TokenType.PREVIEW, TOKEN, 't'));
    await t.db.insert(webhooks).values({
      id: newUuid(),
      spaceId: S1,
      name: 'h',
      url: `${hooks.url}/hook`,
      events: ['translation.changed', 'translation.published'],
      enabled: true,
    });
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'EDITOR',
      }),
    );
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'TRANSLATOR' }));
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
    it('creates keys with a UUIDv7 id, refusing duplicates, with translation.changed, dropping the draft maps', async () => {
      await buildDrafts(t, S1);
      const response = await editor.post(base, { key: 'home.title', locales: { en: 'Welcome' }, labels: ['home'] });
      expect(response.statusCode).toBe(201);
      ids['home.title'] = response.json().id;
      expect(response.json()).toMatchObject({
        id: expect.stringMatching(UUID_V7),
        key: 'home.title',
        locales: { en: 'Welcome' },
        labels: ['home'],
      });
      expect(response.json()).not.toHaveProperty('updatedBy');
      // Plain text only: no type.
      expect(response.json()).not.toHaveProperty('type');
      expect(await draftSnapshots(t.db, S1)).toEqual([]);
      expect(await events()).toEqual(['translation.changed']);
      expect((await editor.post(base, { key: 'home.title', locales: {} })).statusCode).toBe(409);
      expect((await reader.post(base, { key: 'x', locales: {} })).statusCode).toBe(403);
      // Routes take the UUID, not the key.
      expect((await reader.get(`${base}/home.title`)).statusCode).toBe(404);
    });

    it('sets and removes one locale value without touching the others', async () => {
      await editor.put(`${url('home.title')}/locales/de`, { value: 'Willkommen' });
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome', de: 'Willkommen' });
      await editor.put(`${url('home.title')}/locales/de`, { value: '' });
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome' });
    });

    it("writes values only for the space's locales; removing a value is allowed for any locale", async () => {
      const refused = await editor.post(base, { key: 'stray', locales: { en: 'Hi', fr: 'Salut' } });
      expect(refused.statusCode).toBe(400);
      expect(refused.json().message).toMatch(/fr/);
      expect((await reader.get(base)).json().items.map((it: { key: string }) => it.key)).not.toContain('stray');

      expect((await editor.put(`${url('home.title')}/locales/fr`, { value: 'Bienvenue' })).statusCode).toBe(400);
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome' });

      // A value left behind by a removed locale can still be cleared.
      await t.db
        .update(translations)
        .set({ locales: { en: 'Welcome', fr: 'Bienvenue' } })
        .where(eq(translations.id, ids['home.title']));
      expect((await editor.put(`${url('home.title')}/locales/fr`, { value: '' })).statusCode).toBe(200);
      expect((await stored('home.title')).locales).toEqual({ en: 'Welcome' });
    });

    it('updates labels and description, clearing them when empty', async () => {
      expect((await editor.patch(url('home.title'), { description: 'Hero heading' })).json()).toMatchObject({
        description: 'Hero heading',
      });
      expect((await editor.patch(url('home.title'), {})).json()).not.toHaveProperty('labels');
    });

    it('renames: a new key under the same id, refusing a taken key', async () => {
      ids['taken'] = (await editor.post(base, { key: 'taken', locales: { en: 'x' } })).json().id;
      expect((await editor.put(`${url('home.title')}/key`, { key: 'taken' })).statusCode).toBe(409);
      const renamed = (await editor.put(`${url('home.title')}/key`, { key: 'hero.title' })).json();
      expect(renamed).toMatchObject({ id: ids['home.title'], key: 'hero.title' });
      ids['hero.title'] = renamed.id;
      expect(await stored('home.title')).toBeUndefined();
    });

    it('refuses keys outside the key rule and values over the limit', async () => {
      for (const key of ['has space', 'trailing.', '1st', 'x'.repeat(151)]) {
        expect((await editor.post(base, { key, locales: { en: 'x' } })).statusCode).toBe(400);
        expect((await editor.put(`${url('hero.title')}/key`, { key })).statusCode).toBe(400);
      }
      const long = 'x'.repeat(TRANSLATION_VALUE_MAX_LENGTH + 1);
      expect((await editor.post(base, { key: 'long', locales: { en: long } })).statusCode).toBe(400);
      expect((await editor.put(`${url('hero.title')}/locales/en`, { value: long })).statusCode).toBe(400);
      expect((await stored('hero.title')).locales).toEqual({ en: 'Welcome' });
    });

    it('lists by key', async () => {
      expect((await reader.get(base)).json().items.map((it: { key: string }) => it.key)).toEqual(['hero.title', 'taken']);
    });
  });

  describe('publishing', () => {
    it('publishes every locale with default-locale filling, and the public API serves it', async () => {
      await editor.put(`${url('taken')}/locales/de`, { value: 'genommen' });
      await t.app.get(WebhookDispatcher).whenIdle();
      hooks.requests.length = 0;
      expect((await editor.post(`${base}/publish`)).statusCode).toBe(204);
      expect(await events()).toEqual(['translation.published']);

      const redirect = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/translations/de?token=${TOKEN}` });
      const published = await t.request({ method: 'GET', url: redirect.headers.location });
      expect(published.json()).toEqual({ 'hero.title': 'Welcome', taken: 'genommen' });
    });

    it('requires TRANSLATION_PUBLISH', async () => {
      expect((await reader.post(`${base}/publish`)).statusCode).toBe(403);
    });
  });

  describe('machine translation (stub provider)', () => {
    const tasksBase = `/api/app/spaces/${S1}/tasks`;
    /**
     * Waits until a task has ended. The worker takes a task when its `created` event arrives (Postgres LISTEN,
     * asynchronous): until then it is idle, so `whenIdle()` alone may return before the task even started.
     */
    const ended = async (user: ReturnType<typeof api>, id: string) => {
      for (let i = 0; i < 200; i++) {
        await t.app.get(TaskWorker).whenIdle();
        const task = (await user.get(`${tasksBase}/${id}`)).json();
        if (task.status === 'FINISHED' || task.status === 'ERROR') return task;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`task ${id} never ended`);
    };
    /** Starts a translate-locale task and waits for its end. */
    const translateLocale = async (user: ReturnType<typeof api>, params: object) => {
      const created = await user.post(tasksBase, { kind: 'TRANSLATION_TRANSLATE', params: { type: 'translation-translate', ...params } });
      expect(created.statusCode, created.body).toBe(201);
      const task = await ended(user, created.json().id);
      // What it did is in its logs: the counts line, and a WARN line per key the provider failed on.
      const lines = (await user.get(`${tasksBase}/${task.id}/logs`)).json<{ level: string; message: string }[]>();
      const numbers =
        lines
          .find(it => / created · /.test(it.message))
          ?.message.match(/\d+/g)
          ?.map(Number) ?? [];
      const counts = { created: numbers[0], updated: numbers[1], unchanged: numbers[2], skipped: numbers[3] };
      const problems = lines.filter(it => it.level === 'WARN').map(it => it.message);
      return { ...task, counts, problems };
    };

    it('translates a locale as a task: only keys missing the target, unless overwrite', async () => {
      expect(await translateLocale(editor, { sourceLocale: 'en', targetLocale: 'de' })).toMatchObject({
        status: 'FINISHED',
        params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: false },
        counts: { created: 0, updated: 1, unchanged: 0, skipped: 0 },
      });
      expect((await stored('hero.title')).locales.de).toBe('Welcome : en -> de');
      expect((await stored('taken')).locales.de).toBe('genommen');
      expect((await events()).filter(it => it === 'translation.changed')).toHaveLength(1);

      expect((await translateLocale(editor, { sourceLocale: 'en', targetLocale: 'de', overwrite: true })).counts).toMatchObject({
        updated: 2,
        skipped: 0,
      });
      expect((await stored('taken')).locales.de).toBe('x : en -> de');
    });

    it('reports its steps: Translating, then Writing while it saves (not a finished "Translating" all along)', async () => {
      const publish = vi.spyOn(t.app.get(EventService), 'publish');
      await translateLocale(editor, { sourceLocale: 'en', targetLocale: 'de', overwrite: true });
      const steps = publish.mock.calls
        .map(([event]) => event)
        .filter(it => it.entity === 'tasks' && it.op === 'progress')
        .map(it => (it as { progress: { step: string; done: number; total?: number } }).progress);
      publish.mockRestore();
      expect(steps[0]).toMatchObject({ step: 'Translating', done: 0, total: 2 });
      expect(steps.slice(-2)).toEqual([
        { step: 'Writing', done: 0, total: 2 },
        { step: 'Writing', done: 2, total: 2 },
      ]);
    });

    it('a translator may start it, and follow it', async () => {
      expect(await translateLocale(reader, { sourceLocale: 'en', targetLocale: 'de' })).toMatchObject({ status: 'FINISHED' });
    });

    it('keys the provider failed on are skipped and listed, the rest written', async () => {
      const service = t.app.get(TranslateService);
      const spy = vi.spyOn(service, 'translateItems').mockImplementation(async items => ({
        items: items.slice(1).map(it => ({ id: it.id, content: `${it.content} (spied)` })),
        failed: items.slice(0, 1).map(it => ({ id: it.id, reason: 'quota' })),
      }));
      const task = await translateLocale(editor, { sourceLocale: 'en', targetLocale: 'de', overwrite: true });
      spy.mockRestore();
      expect(task).toMatchObject({ status: 'FINISHED', counts: { updated: 1, skipped: 1 } });
      expect(task.problems).toEqual([expect.stringMatching(/^[\w.]+: quota$/)]);
    });

    it('without overwrite, keeps a target value typed while the task runs', async () => {
      await t.db.insert(translations).values({ id: newUuid(), spaceId: S1, key: 'typed.meanwhile', locales: { en: 'Typed' } });
      const service = t.app.get(TranslateService);
      const original = service.translateItems.bind(service);
      const spy = vi.spyOn(service, 'translateItems').mockImplementation(async (...args) => {
        await t.db
          .update(translations)
          .set({ locales: { en: 'Typed', de: 'Von Hand' } })
          .where(and(eq(translations.spaceId, S1), eq(translations.key, 'typed.meanwhile')));
        return original(...args);
      });
      await translateLocale(editor, { sourceLocale: 'en', targetLocale: 'de' });
      spy.mockRestore();
      expect((await stored('typed.meanwhile')).locales.de).toBe('Von Hand');
    });

    it('keeps its log lines in the order written: 100 problem lines, then the end', async () => {
      await t.db
        .insert(translations)
        .values(Array.from({ length: 150 }, (_, i) => ({ id: newUuid(), spaceId: S1, key: `order.k${i}`, locales: { en: `v${i}` } })));
      const service = t.app.get(TranslateService);
      const spy = vi.spyOn(service, 'translateItems').mockImplementation(async items => ({
        items: [],
        failed: items.map(it => ({ id: it.id, reason: 'quota' })),
      }));
      const created = await editor.post(tasksBase, {
        kind: 'TRANSLATION_TRANSLATE',
        params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: true },
      });
      await ended(editor, created.json().id);
      spy.mockRestore();
      const lines = (await editor.get(`${tasksBase}/${created.json().id}/logs`)).json<{ level: string; message: string }[]>();
      expect(lines.filter(it => it.level === 'WARN')).toHaveLength(100);
      expect(lines.at(-1)?.message).toBe('Task finished successfully');
      const firstWarn = lines.findIndex(it => it.level === 'WARN');
      expect(lines.slice(firstWarn, firstWarn + 100).every(it => it.level === 'WARN')).toBe(true);
      await t.db.delete(translations).where(and(eq(translations.spaceId, S1), like(translations.key, 'order.%')));
    });

    it("translates only between the space's locales, refused when it is created", async () => {
      expect(
        (
          await editor.post(tasksBase, {
            kind: 'TRANSLATION_TRANSLATE',
            params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'fr' },
          })
        ).statusCode,
      ).toBe(400);
      const unknown = await editor.post(tasksBase, {
        kind: 'TRANSLATION_TRANSLATE',
        params: { type: 'translation-translate', sourceLocale: 'fr', targetLocale: 'de' },
      });
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json().message).toBe('Locale fr is not in the space locales.');
      expect((await stored('taken')).locales).not.toHaveProperty('fr');
    });

    it('the old endpoint is gone', async () => {
      expect((await editor.post(`${base}/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'de' })).statusCode).toBe(404);
    });

    it('translates single strings and batches for translators and up, not for a viewer', async () => {
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
      expect((await reader.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'x' })).statusCode).toBe(200);
      const viewer = api(t, await userWithAccess(t, 'viewer@example.com', { role: 'VIEWER' }));
      expect((await viewer.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'x' })).statusCode).toBe(403);
    });
  });

  describe('Unsplash', () => {
    it('proxies search and random with the server-side key, passing rate limits through', async () => {
      const search = await editor.get('/api/app/plugins/unsplash/search?query=cats&perPage=5&orientation=landscape');
      expect(search.json()).toEqual({ limit: 50, remaining: 49, total: 1, results: [{ id: 'p1' }] });
      const request = unsplash.requests.at(-1)!;
      expect(request.headers.authorization).toBe('Client-ID unsplash-key');
      expect(new URL(request.url, unsplash.url).searchParams.get('orientation')).toBe('landscape');
      expect((await editor.get('/api/app/plugins/unsplash/random')).json()).toEqual({
        limit: 50,
        remaining: 49,
        results: [{ id: 'r1' }],
      });
      expect((await reader.get('/api/app/plugins/unsplash/random')).statusCode).toBe(403);
    });

    it('refuses a search without a query (400) and answers 424 when Unsplash refuses the key', async () => {
      expect((await editor.get('/api/app/plugins/unsplash/search')).statusCode).toBe(400);
      expect((await editor.get('/api/app/plugins/unsplash/search?orientation=round&query=cats')).statusCode).toBe(400);
      const refused = await editor.get('/api/app/plugins/unsplash/search?query=refused');
      expect(refused.statusCode).toBe(424);
      expect(refused.json()).toMatchObject({ message: 'Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.' });
    });
  });

  describe('key-value export', () => {
    it("downloads one locale's draft values by key, without the keys that have none", async () => {
      await t.db.insert(translations).values([
        { id: newUuid(), spaceId: S1, key: 'kv.zeta', locales: { en: 'Z', de: 'Zett' } },
        { id: newUuid(), spaceId: S1, key: 'kv.alpha', locales: { en: 'A' } },
      ]);
      const response = await editor.get(`${base}/export/de`);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="s-de.json"/);
      expect(response.headers['cache-control']).toBe('private, no-store');
      const values = response.json<Record<string, string>>();
      expect(values['kv.zeta']).toBe('Zett');
      expect(values).not.toHaveProperty('kv.alpha');
      expect(Object.keys(values)).toEqual([...Object.keys(values)].sort((a, b) => (Buffer.from(a) < Buffer.from(b) ? -1 : 1)));
    });

    it('is for content writers, and only for a locale of the space', async () => {
      expect((await reader.get(`${base}/export/de`)).statusCode).toBe(403);
      const unknown = await editor.get(`${base}/export/fr`);
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json().message).toBe('Locale fr is not in the space locales.');
      expect((await editor.get(`/api/app/spaces/${newUuid()}/translations/export/de`)).statusCode).toBe(404);
    });
  });

  describe('deleting', () => {
    it('deletes one key, or all keys as a developer', async () => {
      expect((await editor.delete(url('taken'))).statusCode).toBe(204);
      expect((await editor.delete(base)).statusCode).toBe(403);
      const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
      expect((await admin.delete(base)).statusCode).toBe(204);
      expect((await reader.get(base)).json()).toMatchObject({ items: [], total: 0 });
    });
  });
});

describe('app API: without a translation provider or Unsplash key', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await insertSpace(t.db, {
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      defaultLocale: { id: 'en', name: 'English' },
    });
  });

  afterAll(() => t?.close());

  it('answers 412 with an explanation, so the UI can tell the user why', async () => {
    const admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    expect((await admin.get('/api/config')).json().translate).toEqual({ enabled: false, sourceLocales: [], targetLocales: [] });
    expect((await admin.get('/api/app/translate/status')).statusCode).toBe(404);
    const single = await admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'x' });
    expect(single.statusCode).toBe(412);
    expect(single.json().message).toBe(
      'Machine translation is not set up. Ask an admin to connect DeepL or Google in Admin → Settings → Integrations.',
    );
    const batch = await admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', items: [{ id: 'a', content: 'x' }] });
    expect(batch.statusCode).toBe(412);
    // Even with nothing to translate: the user learns translation is unavailable, not "0 translated".
    const locale = await admin.post(`/api/app/spaces/${S1}/tasks`, {
      kind: 'TRANSLATION_TRANSLATE',
      params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de' },
    });
    expect(locale.statusCode).toBe(412);
    const unsplash = await admin.get('/api/app/plugins/unsplash/random');
    expect(unsplash.statusCode).toBe(424);
    expect(unsplash.json().message).toBe('Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.');
  });
});

describe('app API: Unsplash with a key saved in Admin → Settings', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let unsplash: Awaited<ReturnType<typeof fakeServer>>;
  let answer = 200;

  beforeAll(async () => {
    unsplash = await fakeServer(() => ({ status: answer, body: answer === 200 ? [{ id: 'r1' }] : { errors: ['invalid'] } }));
    t = await createTestApp({ LOCALESS_UNSPLASH_API_URL: unsplash.url });
    editor = api(t, await userWithAccess(t, 'editor@example.com', { role: 'EDITOR' }));
    const admin = await createUser(t, { email: 'admin@example.com', role: 'ADMIN' });
    await t.app.get(IntegrationService).save('unsplash', { apiKey: 'saved-key' }, 'unverified', admin.id);
  });

  afterAll(async () => {
    await t?.close();
    await unsplash?.close();
  });

  const status = async () => (await t.app.get(IntegrationService).findAll()).find(it => it.id === 'unsplash')?.status;

  it('calls Unsplash with the saved key and marks it verified', async () => {
    answer = 200;
    expect((await editor.get('/api/app/plugins/unsplash/random')).statusCode).toBe(200);
    expect(unsplash.requests.at(-1)?.headers.authorization).toBe('Client-ID saved-key');
    expect(await status()).toBe('verified');
  });

  it('marks the key rejected on a 401, and verified again on the next success', async () => {
    answer = 401;
    const refused = await editor.get('/api/app/plugins/unsplash/random');
    expect(refused.statusCode).toBe(424);
    expect(refused.json().message).toBe('Unsplash is unavailable. Ask an admin to check Admin → Settings → Integrations.');
    expect(await status()).toBe('rejected');
    answer = 200;
    await editor.get('/api/app/plugins/unsplash/random');
    expect(await status()).toBe('verified');
  });
});

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationSettings } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { createSecretBox } from '../src/infra/secrets/secret-box.js';
import { IntegrationService } from '../src/shared/services/integration.service.js';
import { fakeServer } from './fake-server.js';
import { api, createTestApp, createUser, TestApp, userWithAccess } from './test-app.js';

/** Polls until `check` passes (events travel through LISTEN/NOTIFY, so effects are asynchronous). */
async function eventually(check: () => Promise<void>, timeoutMs = 3000): Promise<void> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() > until) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

describe('IntegrationService', () => {
  let t: TestApp;
  let service: IntegrationService;
  let adminId: string;

  beforeAll(async () => {
    t = await createTestApp();
    service = t.app.get(IntegrationService);
    adminId = (await createUser(t, { email: 'admin@example.com', role: 'ADMIN' })).id;
  });

  afterAll(async () => {
    await t?.close();
  });

  beforeEach(async () => {
    await t.db.delete(integrationSettings);
    await service.setTranslatePrimary(undefined, adminId);
    vi.restoreAllMocks();
  });

  it('is off when nothing is configured', async () => {
    expect(await service.resolve('unsplash')).toBeUndefined();
    expect((await service.findAll()).find(it => it.id === 'unsplash')).toMatchObject({ source: 'none', enabled: false, hints: {} });
  });

  it('resolves a key saved in the UI, stored encrypted and listed by its hint only', async () => {
    await service.save('unsplash', { apiKey: 'ui-key-1234abcd' }, 'verified', adminId);
    expect(await service.resolve('unsplash')).toEqual({ id: 'unsplash', source: 'ui', values: { apiKey: 'ui-key-1234abcd' } });

    const [row] = await t.db.select().from(integrationSettings).where(eq(integrationSettings.id, 'unsplash'));
    expect(row.secrets).not.toContain('ui-key-1234abcd');
    expect(JSON.stringify(row.hints)).not.toContain('ui-key');

    const listed = (await service.findAll()).find(it => it.id === 'unsplash');
    expect(listed).toMatchObject({
      source: 'ui',
      enabled: true,
      status: 'verified',
      hints: { apiKey: '••••abcd' },
      updatedBy: 'admin@example.com',
    });
    expect(JSON.stringify(await service.findAll())).not.toContain('ui-key');
  });

  it('shows text values and fills a missing one from its default', async () => {
    const json = JSON.stringify({ project_id: 'p', client_email: 'a@p.iam', private_key: 'PRIVATE' });
    await service.save('google-translate', { serviceAccount: json }, 'unverified', adminId);
    expect((await service.resolve('google-translate'))?.values).toEqual({ serviceAccount: json, location: 'global' });
    const listed = (await service.findAll()).find(it => it.id === 'google-translate');
    expect(listed?.hints.location).toBe('global');
    expect(JSON.stringify(listed)).not.toContain('PRIVATE');
  });

  it('keeps the key when switched off, and deletes it on remove', async () => {
    await service.save('unsplash', { apiKey: 'k-1234' }, 'verified', adminId);
    await service.setEnabled('unsplash', false, adminId);
    expect(await service.resolve('unsplash')).toBeUndefined();
    expect((await service.findAll()).find(it => it.id === 'unsplash')).toMatchObject({ source: 'ui', enabled: false });
    await service.setEnabled('unsplash', true, adminId);
    expect(await service.resolve('unsplash')).toBeDefined();
    await service.remove('unsplash');
    expect(await t.db.select().from(integrationSettings)).toHaveLength(0);
  });

  it('lists a row sealed with another key as unreadable, treats it as off and leaves it as it is', async () => {
    const other = await createSecretBox({ secretKey: 'another-secret-key-another-secret-key', dataDir: '/nonexistent' });
    await t.db.insert(integrationSettings).values({
      id: 'deepl',
      enabled: true,
      secrets: other.seal(JSON.stringify({ apiKey: 'k' }), 'deepl'),
      hints: { apiKey: '••••k' },
      status: 'verified',
    });
    const [before] = await t.db.select().from(integrationSettings);
    expect((await service.findAll()).find(it => it.id === 'deepl')).toMatchObject({ source: 'ui', status: 'unreadable' });
    expect(await service.resolve('deepl')).toBeUndefined();
    const [after] = await t.db.select().from(integrationSettings);
    expect(after).toEqual(before);
  });

  it('publishes an integrations event without values on every change', async () => {
    const publish = vi.spyOn(t.app.get(EventService), 'publish');
    await service.save('unsplash', { apiKey: 'secret-value' }, 'verified', adminId);
    expect(publish).toHaveBeenCalledWith({ spaceId: null, entity: 'integrations', id: 'unsplash', op: 'updated' }, expect.anything());
    expect(JSON.stringify(publish.mock.calls.map(([event]) => event))).not.toContain('secret-value');
  });

  it('records outcomes of real calls only when the status changes', async () => {
    await service.save('unsplash', { apiKey: 'k' }, 'unverified', adminId);
    const publish = vi.spyOn(t.app.get(EventService), 'publish');
    await service.recordOutcome('unsplash', { ok: false, reason: 'auth', message: 'Unsplash rejected the key (401).' });
    await service.recordOutcome('unsplash', { ok: false, reason: 'auth', message: 'Unsplash rejected the key (401).' });
    expect(publish).toHaveBeenCalledTimes(1);
    expect((await service.findAll()).find(it => it.id === 'unsplash')).toMatchObject({
      status: 'rejected',
      statusMessage: 'Unsplash rejected the key (401).',
    });
    // Still on: one failure doesn't hide the picker for everyone.
    expect(await service.resolve('unsplash')).toBeDefined();
    await service.recordOutcome('unsplash', { ok: false, reason: 'quota', message: 'Rate limit reached.' });
    expect((await service.findAll()).find(it => it.id === 'unsplash')?.status).toBe('quota');
    await service.recordOutcome('unsplash', { ok: true });
    expect((await service.findAll()).find(it => it.id === 'unsplash')).toMatchObject({ status: 'verified' });
    expect((await service.findAll()).find(it => it.id === 'unsplash')?.statusMessage).toBeUndefined();
  });

  it('sees a change written by another instance once its event arrives', async () => {
    await service.save('unsplash', { apiKey: 'first' }, 'verified', adminId);
    expect((await service.resolve('unsplash'))?.values.apiKey).toBe('first');
    // Another instance: writes the row and publishes the event, this instance's cache knows nothing of it.
    const box = await createSecretBox({ secretKey: 'test-secret-key-test-secret-key-0123', dataDir: '/nonexistent' });
    await t.db
      .update(integrationSettings)
      .set({ secrets: box.seal(JSON.stringify({ apiKey: 'second' }), 'unsplash') })
      .where(eq(integrationSettings.id, 'unsplash'));
    await t.app.get(EventService).publish({ spaceId: null, entity: 'integrations', id: 'unsplash', op: 'updated' });
    await eventually(async () => expect((await service.resolve('unsplash'))?.values.apiKey).toBe('second'));
  });

  it('defaults the primary provider to DeepL and keeps the UI choice', async () => {
    expect(await service.translatePrimary()).toEqual({ value: 'deepl', source: 'default' });
    await service.setTranslatePrimary('google-translate', adminId);
    expect(await service.translatePrimary()).toEqual({ value: 'google-translate', source: 'ui' });
  });
});

describe('IntegrationService with env', () => {
  let t: TestApp;
  let service: IntegrationService;
  let adminId: string;

  beforeAll(async () => {
    t = await createTestApp({
      UNSPLASH_API_KEY: 'env-key',
      LOCALESS_GOOGLE_TRANSLATE_LOCATION: 'eu',
      LOCALESS_TRANSLATE_PRIMARY: 'google',
    });
    service = t.app.get(IntegrationService);
    adminId = (await createUser(t, { email: 'admin@example.com', role: 'ADMIN' })).id;
  });

  afterAll(async () => {
    await t?.close();
  });

  it('prefers the environment over a key saved in the UI', async () => {
    await service.save('unsplash', { apiKey: 'ui-key' }, 'verified', adminId);
    expect(await service.resolve('unsplash')).toEqual({ id: 'unsplash', source: 'env', values: { apiKey: 'env-key' } });
    expect((await service.findAll()).find(it => it.id === 'unsplash')).toMatchObject({
      source: 'env',
      enabled: true,
      envVars: ['UNSPLASH_API_KEY'],
      hints: {},
    });
  });

  it('never mixes a non-locking env value into values saved in the UI', async () => {
    const json = JSON.stringify({ project_id: 'p', client_email: 'a@p.iam', private_key: 'k' });
    await service.save('google-translate', { serviceAccount: json, location: 'global' }, 'verified', adminId);
    expect(await service.resolve('google-translate')).toEqual({
      id: 'google-translate',
      source: 'ui',
      values: { serviceAccount: json, location: 'global' },
    });
  });

  it('records no outcome for an env integration', async () => {
    await service.recordOutcome('unsplash', { ok: false, reason: 'auth', message: 'rejected' });
    const [row] = await t.db.select().from(integrationSettings).where(eq(integrationSettings.id, 'unsplash'));
    expect(row.status).toBe('verified');
  });

  it('takes the primary provider from the environment', async () => {
    await service.setTranslatePrimary('deepl', adminId);
    expect(await service.translatePrimary()).toEqual({ value: 'google-translate', source: 'env' });
  });
});

describe('App API: Admin → Settings → Integrations', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let developer: ReturnType<typeof api>;
  let unsplash: Awaited<ReturnType<typeof fakeServer>>;
  const BASE = '/api/app/admin/integrations';
  const GOOD = 'good-unsplash-key';

  beforeAll(async () => {
    unsplash = await fakeServer(request =>
      request.headers.authorization === `Client-ID ${GOOD}`
        ? { status: 200, body: [{ id: 'p' }], headers: { 'X-RateLimit-Limit': '50' } }
        : { status: 401, body: { errors: ['invalid'] } },
    );
    t = await createTestApp({ LOCALESS_UNSPLASH_API_URL: unsplash.url, LOCALESS_DEEPL_API_URL: 'http://127.0.0.1:1' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    developer = api(t, await userWithAccess(t, 'dev@example.com', { role: 'DEVELOPER' }));
  });

  afterAll(async () => {
    await t?.close();
    await unsplash?.close();
  });

  beforeEach(async () => {
    await t.db.delete(integrationSettings);
  });

  it('is for admins only', async () => {
    expect((await developer.get(BASE)).statusCode).toBe(403);
    expect((await developer.put(`${BASE}/unsplash`, { values: { apiKey: GOOD } })).statusCode).toBe(403);
    expect((await developer.post(`${BASE}/unsplash/test`, {})).statusCode).toBe(403);
    expect((await developer.patch(`${BASE}/unsplash/enabled`, { enabled: false })).statusCode).toBe(403);
    expect((await developer.delete(`${BASE}/unsplash`)).statusCode).toBe(403);
    expect((await developer.put(`${BASE}/translate-primary`, { value: 'deepl' })).statusCode).toBe(403);
  });

  it('answers 404 for an unknown integration', async () => {
    expect((await admin.put(`${BASE}/bing`, { values: { apiKey: 'x' } })).statusCode).toBe(404);
  });

  it('never saves a rejected key', async () => {
    const response = await admin.put(`${BASE}/unsplash`, { values: { apiKey: 'wrong' } });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ ok: false, reason: 'auth' });
    expect(await t.db.select().from(integrationSettings)).toHaveLength(0);
  });

  it('refuses values that are missing before calling the provider', async () => {
    const response = await admin.put(`${BASE}/unsplash`, { values: {} });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe('Enter the Access Key.');
  });

  it('saves a working key, answers only its hint, and turns the picker on at once', async () => {
    expect((await admin.get('/api/config')).json().plugins.unsplash).toBe(false);
    const response = await admin.put(`${BASE}/unsplash`, { values: { apiKey: GOOD } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: 'unsplash', source: 'ui', status: 'verified', hints: { apiKey: '••••-key' } });
    expect(response.body).not.toContain(GOOD);
    expect((await admin.get(BASE)).body).not.toContain(GOOD);
    expect((await admin.get('/api/config')).json().plugins.unsplash).toBe(true);
  });

  it('saves without testing only when asked, after the provider could not be reached', async () => {
    const unreachable = await admin.put(`${BASE}/deepl`, { values: { apiKey: 'some-deepl-key' } });
    expect(unreachable.statusCode).toBe(422);
    expect(unreachable.json()).toMatchObject({ reason: 'unreachable' });
    const saved = await admin.put(`${BASE}/deepl`, { values: { apiKey: 'some-deepl-key' }, skipTest: true });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().status).toBe('unverified');
  });

  it('tests values without saving them, and the saved key on demand', async () => {
    const result = await admin.post(`${BASE}/unsplash/test`, { values: { apiKey: GOOD } });
    expect(result.json()).toMatchObject({ ok: true });
    expect(await t.db.select().from(integrationSettings)).toHaveLength(0);
    expect((await admin.post(`${BASE}/unsplash/test`, {})).statusCode).toBe(404);
  });

  it('switches off, back on, and disconnects', async () => {
    await admin.put(`${BASE}/unsplash`, { values: { apiKey: GOOD } });
    const off = await admin.patch(`${BASE}/unsplash/enabled`, { enabled: false });
    expect(off.json()).toMatchObject({ enabled: false });
    expect((await admin.get('/api/config')).json().plugins.unsplash).toBe(false);
    await admin.patch(`${BASE}/unsplash/enabled`, { enabled: true });
    expect((await admin.delete(`${BASE}/unsplash`)).statusCode).toBe(204);
    expect((await admin.get(BASE)).json().integrations.find((it: { id: string }) => it.id === 'unsplash')).toMatchObject({
      source: 'none',
    });
    expect((await admin.patch(`${BASE}/unsplash/enabled`, { enabled: true })).statusCode).toBe(404);
  });

  it('sets the primary translation provider', async () => {
    const response = await admin.put(`${BASE}/translate-primary`, { value: 'google-translate' });
    expect(response.json()).toEqual({ value: 'google-translate', source: 'ui' });
    expect((await admin.get(BASE)).json().translatePrimary).toEqual({ value: 'google-translate', source: 'ui' });
  });
});

describe('App API: integrations locked by the environment', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  const BASE = '/api/app/admin/integrations';

  beforeAll(async () => {
    t = await createTestApp({ UNSPLASH_API_KEY: 'env-key', GOOGLE_CLOUD_PROJECT: 'acme', LOCALESS_TRANSLATE_PRIMARY: 'deepl' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
  });

  afterAll(async () => {
    await t?.close();
  });

  it('refuses every change to an env-locked integration, and shows its variable', async () => {
    expect((await admin.put(`${BASE}/unsplash`, { values: { apiKey: 'x' } })).statusCode).toBe(409);
    expect((await admin.patch(`${BASE}/unsplash/enabled`, { enabled: false })).statusCode).toBe(409);
    expect((await admin.delete(`${BASE}/unsplash`)).statusCode).toBe(409);
    expect((await admin.put(`${BASE}/translate-primary`, { value: 'google-translate' })).statusCode).toBe(409);
    expect((await admin.get(BASE)).json().integrations.find((it: { id: string }) => it.id === 'unsplash')).toMatchObject({
      source: 'env',
      envVars: ['UNSPLASH_API_KEY'],
    });
  });

  it("reports the env providers' locales in the public config", async () => {
    const config = (await admin.get('/api/config')).json();
    expect(config.plugins.unsplash).toBe(true);
    expect(config.translate.enabled).toBe(true);
    expect(config.translate.targetLocales).toContain('ka');
  });
});

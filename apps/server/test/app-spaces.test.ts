import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, schemas, spaces, translations } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { newUuid } from '../src/infra/database/id.js';
import { S2, UUID_V7 } from './ids.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

describe('app API: spaces, locales, settings', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let noRole: ReturnType<typeof api>;
  let readerCookie: string;
  let managerCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    t = await createTestApp();
    adminCookie = await userWithAccess(t, 'admin@example.com', { role: 'admin' });
    admin = api(t, adminCookie);
    managerCookie = await userWithAccess(t, 'manager@example.com', { role: 'custom', permissions: ['SPACE_MANAGEMENT'] });
    manager = api(t, managerCookie);
    readerCookie = await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['CONTENT_READ'] });
    reader = api(t, readerCookie);
    noRole = api(t, await userWithAccess(t, 'new@example.com', { role: null }));
  });

  afterAll(() => t?.close());

  describe('spaces', () => {
    let spaceId: string;

    it('lets SPACE_MANAGEMENT create a space with the default locale', async () => {
      expect((await reader.post('/api/app/spaces', { name: 'Nope' })).statusCode).toBe(403);
      const response = await manager.post('/api/app/spaces', { name: 'Marketing' });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        name: 'Marketing',
        locales: [{ id: 'en', name: 'English' }],
        defaultLocale: { id: 'en', name: 'English' },
        createdAt: expect.stringMatching(/^\d{4}-/),
      });
      expect(response.json()).not.toHaveProperty('contentVersion');
      expect(response.json().environments).toEqual([]);
      spaceId = response.json().id;
      expect(spaceId).toMatch(UUID_V7);
    });

    it('lists spaces by name for any role, but not for users without one', async () => {
      await admin.post('/api/app/spaces', { name: 'alpha' });
      await admin.post('/api/app/spaces', { name: 'Beta' });
      // Case-insensitive, whatever the database collation.
      expect((await reader.get('/api/app/spaces')).json().map((s: { name: string }) => s.name)).toEqual(['alpha', 'Beta', 'Marketing']);
      expect((await noRole.get('/api/app/spaces')).statusCode).toBe(403);
      expect((await reader.get(`/api/app/spaces/${spaceId}`)).json().name).toBe('Marketing');
      expect((await reader.get('/api/app/spaces/missing')).statusCode).toBe(404);
      expect((await reader.get(`/api/app/spaces/${S2}`)).statusCode).toBe(404);
      expect((await reader.get('/api/app/spaces/a%2Fb')).statusCode).toBe(404);
    });

    it('takes only UUIDs, not the Firestore id of an imported space, which it shows as legacyId', async () => {
      await insertSpace(t.db, {
        id: S2,
        legacyId: 'Firestore20charsId01',
        name: 'Imported',
        locales: [{ id: 'en', name: 'English' }],
        defaultLocale: { id: 'en', name: 'English' },
      });
      expect((await reader.get('/api/app/spaces/Firestore20charsId01')).statusCode).toBe(404);
      expect((await admin.get('/api/app/spaces/Firestore20charsId01/tokens')).statusCode).toBe(404);
      const response = await reader.get(`/api/app/spaces/${S2}`);
      expect(response.json()).toMatchObject({ id: S2, legacyId: 'Firestore20charsId01', name: 'Imported' });
      await t.db.delete(spaces).where(eq(spaces.id, S2));
    });

    it('refuses to delete a space while it is being imported, allows it once the import failed', async () => {
      const id = newUuid();
      await insertSpace(t.db, {
        id,
        name: 'Importing',
        locales: [{ id: 'en', name: 'English' }],
        defaultLocale: { id: 'en', name: 'English' },
        importStatus: 'IMPORTING',
      });
      expect((await admin.get(`/api/app/spaces/${id}`)).json()).toMatchObject({ importStatus: 'IMPORTING' });
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(409);
      await t.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, id));
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(204);
    });

    it('renames', async () => {
      const response = await manager.patch(`/api/app/spaces/${spaceId}`, { name: 'Marketing Site' });
      expect(response.json()).toMatchObject({ name: 'Marketing Site' });
      expect((await manager.patch(`/api/app/spaces/${spaceId}`, {})).statusCode).toBe(400);
      expect((await reader.patch(`/api/app/spaces/${spaceId}`, { name: 'x' })).statusCode).toBe(403);
    });

    it('manages environments one by one: create, update, reorder, delete; names may repeat', async () => {
      const base = `/api/app/spaces/${spaceId}/environments`;
      expect((await reader.get(`/api/app/spaces/${spaceId}`)).json().environments).toEqual([]);

      const created = await manager.post(base, { name: 'Preview', url: 'https://preview.example.com' });
      expect(created.statusCode).toBe(201);
      const preview = created.json().environments[0];
      expect(preview).toEqual({ id: expect.stringMatching(UUID_V7), name: 'Preview', url: 'https://preview.example.com' });
      const twin = (await manager.post(base, { name: 'Preview', url: 'https://twin.example.com' })).json().environments[1];
      const staging = (await manager.post(base, { name: 'Staging', url: 'https://staging.example.com' })).json().environments[2];
      expect(twin.name).toBe('Preview');

      const updated = await manager.patch(`${base}/${twin.id}`, { name: 'Twin', url: 'https://{locale}.example.com/{fullSlug}' });
      expect(updated.statusCode).toBe(200);
      expect(updated.json().environments[1]).toEqual({ id: twin.id, name: 'Twin', url: 'https://{locale}.example.com/{fullSlug}' });

      const reordered = await manager.put(`${base}/order`, { ids: [staging.id, preview.id, twin.id] });
      expect(reordered.json().environments.map((it: { name: string }) => it.name)).toEqual(['Staging', 'Preview', 'Twin']);
      for (const ids of [[staging.id, preview.id], [staging.id, preview.id, twin.id, twin.id], [staging.id, preview.id, newUuid()]]) {
        expect((await manager.put(`${base}/order`, { ids })).statusCode).toBe(400);
      }

      const deleted = await manager.delete(`${base}/${staging.id}`);
      expect(deleted.statusCode).toBe(200);
      expect(deleted.json().environments.map((it: { id: string }) => it.id)).toEqual([preview.id, twin.id]);
      // A new environment goes last.
      const last = (await manager.post(base, { name: 'Last', url: 'https://last.example.com' })).json().environments;
      expect(last.map((it: { name: string }) => it.name)).toEqual(['Preview', 'Twin', 'Last']);

      expect((await manager.patch(`${base}/${staging.id}`, { name: 'Gone', url: 'https://gone.example.com' })).statusCode).toBe(404);
      expect((await manager.delete(`${base}/${staging.id}`)).statusCode).toBe(404);
      expect((await manager.delete(`${base}/not-a-uuid`)).statusCode).toBe(404);
      expect((await reader.post(base, { name: 'x', url: 'https://x.example.com' })).statusCode).toBe(403);
      // The old way to set them is gone.
      expect((await manager.patch(`/api/app/spaces/${spaceId}`, { environments: [] })).statusCode).toBe(400);
    });

    it('accepts only absolute http(s) environment URLs, placeholders allowed anywhere', async () => {
      const base = `/api/app/spaces/${spaceId}/environments`;
      // Loaded into a trusted preview iframe.
      for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', '/relative/{slug}', 'ftp://example.com']) {
        expect((await manager.post(base, { name: 'Bad', url })).statusCode, url).toBe(400);
      }
      const [first] = (await reader.get(`/api/app/spaces/${spaceId}`)).json().environments;
      expect((await manager.patch(`${base}/${first.id}`, { name: 'Bad', url: 'javascript:alert(1)' })).statusCode).toBe(400);
      expect((await manager.post(base, { name: '', url: 'https://x.example.com' })).statusCode).toBe(400);
    });

    it('keeps environments of other spaces out of reach', async () => {
      const other = (await manager.post('/api/app/spaces', { name: 'Other' })).json().id;
      const [first] = (await reader.get(`/api/app/spaces/${spaceId}`)).json().environments;
      expect((await manager.patch(`/api/app/spaces/${other}/environments/${first.id}`, { name: 'x', url: 'https://x.example.com' })).statusCode).toBe(404);
      expect((await manager.delete(`/api/app/spaces/${other}/environments/${first.id}`)).statusCode).toBe(404);
      expect((await manager.put(`/api/app/spaces/${other}/environments/order`, { ids: [first.id] })).statusCode).toBe(400);
      await manager.delete(`/api/app/spaces/${other}`);
    });

    it('manages locales: add by id (idempotent, known locales only), set the default, refuse removing it, remove', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      expect((await manager.post(`${base}/locales`, { id: 'xx-unknown' })).statusCode).toBe(400);
      await manager.post(`${base}/locales`, { id: 'de' });
      const twice = await manager.post(`${base}/locales`, { id: 'de' });
      expect(twice.json().locales).toEqual([
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ]);
      expect((await manager.put(`${base}/default-locale`, { id: 'de' })).json().defaultLocale).toEqual({ id: 'de', name: 'German' });
      expect((await manager.put(`${base}/default-locale`, { id: 'fr' })).statusCode).toBe(400);
      expect((await manager.delete(`${base}/locales/de`)).statusCode).toBe(400);
      await manager.put(`${base}/default-locale`, { id: 'en' });
      expect((await manager.delete(`${base}/locales/de`)).json().locales).toEqual([{ id: 'en', name: 'English' }]);
      expect((await reader.post(`${base}/locales`, { id: 'de' })).statusCode).toBe(403);
    });

    it('reorders locales: every locale of the space, each once', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      await manager.post(`${base}/locales`, { id: 'de' });
      await manager.post(`${base}/locales`, { id: 'fr' });
      const reordered = await manager.put(`${base}/locales/order`, { ids: ['fr', 'en', 'de'] });
      expect(reordered.statusCode).toBe(200);
      expect(reordered.json().locales.map((it: { id: string }) => it.id)).toEqual(['fr', 'en', 'de']);
      expect((await reader.get(base)).json().locales.map((it: { id: string }) => it.id)).toEqual(['fr', 'en', 'de']);
      // A locale added later goes last.
      await manager.post(`${base}/locales`, { id: 'it' });
      expect((await reader.get(base)).json().locales.map((it: { id: string }) => it.id)).toEqual(['fr', 'en', 'de', 'it']);
      for (const ids of [['fr', 'en', 'de'], ['fr', 'en', 'de', 'it', 'it'], ['fr', 'en', 'de', 'es']]) {
        expect((await manager.put(`${base}/locales/order`, { ids })).statusCode, ids.join()).toBe(400);
      }
      expect((await reader.put(`${base}/locales/order`, { ids: ['en', 'fr', 'de', 'it'] })).statusCode).toBe(403);
      for (const id of ['fr', 'de', 'it']) await manager.delete(`${base}/locales/${id}`);
    });

    it('lists every locale a space can add, read-only', async () => {
      const response = await reader.get('/api/app/locales');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(expect.arrayContaining([{ id: 'en', name: 'English' }, { id: 'de-AT', name: 'German (Austria)' }]));
      expect(response.json().length).toBeGreaterThan(400);
      expect((await noRole.get('/api/app/locales')).statusCode).toBe(403);
      expect((await admin.post('/api/app/locales', { id: 'xx', name: 'X' })).statusCode).toBe(404);
    });

    it('computes the overview on request for any role: counts, asset storage, translation progress', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      await manager.post(`${base}/locales`, { id: 'de' });
      await manager.post(`${base}/locales`, { id: 'fr' });
      await t.db.insert(translations).values([
        { id: newUuid(), spaceId, key: 'hello', type: 'STRING', locales: { en: 'Hello', de: 'Hallo' } },
        { id: newUuid(), spaceId, key: 'bye', type: 'STRING', locales: { en: 'Bye', de: '' } },
        { id: newUuid(), spaceId, key: 'later', type: 'STRING', locales: {} },
      ]);
      await t.db.insert(contents).values([
        { spaceId, id: newUuid(), kind: 'DOCUMENT', name: 'Home', slug: 'home', fullSlug: 'home' },
        { spaceId, id: newUuid(), kind: 'FOLDER', name: 'Blog', slug: 'blog', fullSlug: 'blog' },
      ]);
      await t.db.insert(assets).values([
        { spaceId, id: newUuid(), kind: 'FILE', name: 'a', size: 1000 },
        { spaceId, id: newUuid(), kind: 'FILE', name: 'b', size: 24 },
        // Imported from Firebase without its file: counted, size unknown.
        { spaceId, id: newUuid(), kind: 'FILE', name: 'c', size: null },
        { spaceId, id: newUuid(), kind: 'FOLDER', name: 'f' },
      ]);
      await t.db.insert(schemas).values({ id: newUuid(), spaceId, name: 'page', type: 'ROOT', fields: [] });
      // Read from the table, not the storage folder.
      await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${spaceId}/assets/x/original`, Buffer.alloc(5000));

      const response = await reader.get(`${base}/overview`);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        counts: { locales: 3, translations: 3, assets: 3, contents: 1, schemas: 1 },
        storage: { assets: 1024, assetsWithoutSize: 1 },
        progress: {
          total: 3,
          // In the space's locale order; an empty value is not translated.
          locales: [
            { id: 'en', name: 'English', translated: 2 },
            { id: 'de', name: 'German', translated: 1 },
            { id: 'fr', name: 'French', translated: 0 },
          ],
        },
      });
      expect((await noRole.get(`${base}/overview`)).statusCode).toBe(403);
      expect((await reader.get(`/api/app/spaces/${newUuid()}/overview`)).statusCode).toBe(404);
      // The stored overview and its recalculation are gone.
      expect((await admin.post(`${base}/overview`)).statusCode).toBe(404);
      expect((await reader.get(base)).json()).not.toHaveProperty('overview');
      expect((await reader.get(base)).json()).not.toHaveProperty('progress');
      for (const id of ['de', 'fr']) await manager.delete(`${base}/locales/${id}`);
    });

    it('counts an empty space as zeros', async () => {
      const empty = (await manager.post('/api/app/spaces', { name: 'Empty' })).json().id;
      expect((await reader.get(`/api/app/spaces/${empty}/overview`)).json()).toEqual({
        counts: { locales: 1, translations: 0, assets: 0, contents: 0, schemas: 0 },
        storage: { assets: 0, assetsWithoutSize: 0 },
        progress: { total: 0, locales: [{ id: 'en', name: 'English', translated: 0 }] },
      });
      await manager.delete(`/api/app/spaces/${empty}`);
    });

    it('accepts body-less actions sent with Content-Type: application/json', async () => {
      const response = await t.request({
        method: 'POST',
        url: `/api/app/spaces/${spaceId}/translations/publish`,
        headers: { cookie: adminCookie, 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' },
      });
      expect(response.statusCode).toBe(204);
      const malformed = await t.request({
        method: 'PATCH',
        url: `/api/app/spaces/${spaceId}`,
        headers: { cookie: readerCookie, 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' },
        payload: '{"name":',
      });
      expect(malformed.statusCode).toBe(400);
      const poisoned = await t.request({
        method: 'PATCH',
        url: `/api/app/spaces/${spaceId}`,
        headers: { cookie: managerCookie, 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' },
        payload: '{"name":"x","__proto__":{"admin":true}}',
      });
      expect(poisoned.statusCode).toBe(400);
    });

    it('deletes a space with all its rows and files', async () => {
      expect((await reader.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(403);
      expect((await manager.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(204);
      expect(await t.db.select().from(spaces).where(eq(spaces.id, spaceId))).toEqual([]);
      expect(await t.db.select().from(contents).where(eq(contents.spaceId, spaceId))).toEqual([]);
      await expect(readdir(join(t.storageDir, 'spaces', spaceId))).rejects.toThrow();
      expect((await manager.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(404);
    });
  });

  describe('settings', () => {
    it('is readable by every role and writable with SETTINGS_MANAGEMENT', async () => {
      expect((await reader.get('/api/app/settings')).json()).toEqual({});
      expect((await reader.patch('/api/app/settings/ui', { text: 'Hi' })).statusCode).toBe(403);
      const updated = await admin.patch('/api/app/settings/ui', { text: 'Maintenance tonight', color: 'destructive' });
      expect(updated.json()).toMatchObject({ ui: { text: 'Maintenance tonight', color: 'destructive' }, updatedAt: expect.any(String) });
      expect((await reader.get('/api/app/settings')).json().ui.text).toBe('Maintenance tonight');
      expect((await admin.patch('/api/app/settings/ui', { color: 'neon' })).statusCode).toBe(400);
    });
  });
});

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, firebaseImports, schemas, spaces, tokens, translations } from '../src/infra/database/schema.js';
import { transaction } from '../src/infra/database/transaction.js';
import { SpaceRepository } from '../src/modules/spaces/repositories/space.repository.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { newUuid } from '../src/infra/database/id.js';
import { S2, UUID_V7 } from './ids.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { api, createTestApp, insertSpace, setImport, TestApp, userWithAccess } from './test-app.js';

type SpaceBody = { spaceLocales: { position: number; locale: { id: string; name: string } }[] };
/** A space's locales as the selected-space endpoint answers them: `spaceLocales[].locale`, in position order. */
const localesOf = (body: SpaceBody) => body.spaceLocales.map(it => it.locale);

describe('app API: spaces, locales, instance label', () => {
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
    adminCookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    admin = api(t, adminCookie);
    managerCookie = await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] });
    manager = api(t, managerCookie);
    readerCookie = await userWithAccess(t, 'reader@example.com', { role: 'CUSTOM', permissions: ['CONTENT_READ'] });
    reader = api(t, readerCookie);
    noRole = api(t, await userWithAccess(t, 'new@example.com', { role: null }));
  });

  afterAll(() => t?.close());

  describe('spaces', () => {
    it('gives a new space one preview token, "Auto Generated Preview Token", that reads drafts', async () => {
      const space = (await admin.post('/api/app/spaces', { name: 'With token' })).json();
      const list = (await admin.get(`/api/app/spaces/${space.id}/tokens`)).json();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ type: 'preview', name: 'Auto Generated Preview Token' });
      expect(list[0].token).toMatch(/^prv_/);
      const draft = await t.request({ method: 'GET', url: `/api/v1/spaces/${space.id}/links?version=draft&token=${list[0].token}` });
      expect(draft.statusCode).not.toBe(401);
      expect(draft.statusCode).not.toBe(403);
      await t.db.delete(spaces).where(eq(spaces.id, space.id)); // the listing tests below count spaces
    });

    it('leaves no token behind when the space is rolled back', async () => {
      const before = (await t.db.select({ id: tokens.id }).from(tokens)).length;
      await expect(
        transaction(t.db, undefined, async tx => {
          await t.app.get(SpaceRepository).create('Rolled back', 'en', tx);
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      expect((await t.db.select({ id: tokens.id }).from(tokens)).length).toBe(before);
    });

    let spaceId: string;

    it('lets SPACE_MANAGEMENT create a space with the default locale', async () => {
      expect((await reader.post('/api/app/spaces', { name: 'Nope' })).statusCode).toBe(403);
      const response = await manager.post('/api/app/spaces', { name: 'Marketing' });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        name: 'Marketing',
        defaultLocaleId: 'en',
        defaultLocale: { id: 'en', name: 'English' },
        spaceLocales: [{ localeId: 'en', position: 0, locale: { id: 'en', name: 'English' } }],
        createdAt: expect.stringMatching(/^\d{4}-/),
      });
      // The selected space carries its locales, not its environments (their own endpoint) nor computed fields.
      for (const key of ['contentVersion', 'environments', 'locales', 'legacyId', 'importStatus', 'firebaseImport']) {
        expect(response.json(), key).not.toHaveProperty(key);
      }
      spaceId = response.json().id;
      expect(spaceId).toMatch(UUID_V7);
    });

    it('lists spaces by name for SPACE_MANAGEMENT, and their names for any role, but not for users without one', async () => {
      await admin.post('/api/app/spaces', { name: 'alpha' });
      await admin.post('/api/app/spaces', { name: 'Beta' });
      // Case-insensitive, whatever the database collation. Admin → Spaces only: each item carries its Firebase import
      // (who ran it, from where), admin data; everyone else reads the sidebar list.
      expect((await manager.get('/api/app/spaces')).json().items.map((s: { name: string }) => s.name)).toEqual(['alpha', 'Beta', 'Marketing']);
      expect((await reader.get('/api/app/spaces')).statusCode).toBe(403);
      expect((await noRole.get('/api/app/spaces')).statusCode).toBe(403);
      expect((await reader.get(`/api/app/spaces/${spaceId}`)).json().name).toBe('Marketing');
      // The sidebar list: every space as `{ id, name }`, by name whatever the case.
      const names = (await reader.get('/api/app/spaces/names')).json();
      expect(names.map((s: { name: string }) => s.name)).toEqual(['alpha', 'Beta', 'Marketing']);
      expect(Object.keys(names[0]).sort()).toEqual(['id', 'name']);
      expect((await noRole.get('/api/app/spaces/names')).statusCode).toBe(403);
      expect((await reader.get('/api/app/spaces/missing')).statusCode).toBe(404);
      expect((await reader.get(`/api/app/spaces/${S2}`)).statusCode).toBe(404);
      expect((await reader.get('/api/app/spaces/a%2Fb')).statusCode).toBe(404);
    });

    it('takes only UUIDs, not the Firestore id of an imported space, which Admin → Spaces shows from its firebaseImport', async () => {
      await insertSpace(t.db, {
        id: S2,
        name: 'Imported',
        locales: [{ id: 'en', name: 'English' }],
        defaultLocale: { id: 'en', name: 'English' },
      });
      await setImport(t.db, S2, { legacyId: 'Firestore20charsId01' });
      expect((await reader.get('/api/app/spaces/Firestore20charsId01')).statusCode).toBe(404);
      expect((await admin.get('/api/app/spaces/Firestore20charsId01/tokens')).statusCode).toBe(404);
      expect((await reader.get(`/api/app/spaces/${S2}`)).json()).not.toHaveProperty('firebaseImport');
      const [item] = (await manager.get('/api/app/spaces?search=Imported')).json().items;
      expect(item).toMatchObject({ id: S2, name: 'Imported', firebaseImport: { sourceSpaceId: 'Firestore20charsId01', status: 'FINISHED' } });
      // Finished, so it is in the sidebar list.
      expect((await reader.get('/api/app/spaces/names')).json().map((s: { id: string }) => s.id)).toContain(S2);
      await t.db.delete(spaces).where(eq(spaces.id, S2));
    });

    it('refuses to delete a space while it is being imported, allows it once the import failed, and deletes the import with it', async () => {
      const id = newUuid();
      await insertSpace(t.db, {
        id,
        name: 'Importing',
        locales: [{ id: 'en', name: 'English' }],
        defaultLocale: { id: 'en', name: 'English' },
      });
      const item = async () => (await admin.get('/api/app/spaces?search=Importing')).json().items[0];
      await setImport(t.db, id, { legacyId: 'FirestoreImporting01', status: 'RUNNING' });
      expect(await item()).toMatchObject({ firebaseImport: { status: 'RUNNING', sourceSpaceId: 'FirestoreImporting01' } });
      expect((await admin.get('/api/app/spaces/names')).json().map((s: { id: string }) => s.id)).not.toContain(id);
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(409);
      await setImport(t.db, id, { legacyId: 'FirestoreImporting01', status: 'FAILED' });
      expect(await item()).toMatchObject({ firebaseImport: { status: 'FAILED' } });
      expect((await admin.get('/api/app/spaces/names')).json().map((s: { id: string }) => s.id)).not.toContain(id);
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(firebaseImports).where(eq(firebaseImports.sourceSpaceId, 'FirestoreImporting01'))).toEqual([]);
    });

    it('lists a space created here without firebaseImport, and one imported with it', async () => {
      const id = newUuid();
      await insertSpace(t.db, { id, name: 'Done', locales: [{ id: 'en', name: 'English' }] });
      const item = async () => (await admin.get('/api/app/spaces?search=Done')).json().items[0];
      expect(await item()).not.toHaveProperty('firebaseImport');
      await setImport(t.db, id, { legacyId: 'FirestoreFinished001' });
      expect(await item()).toMatchObject({ firebaseImport: { sourceSpaceId: 'FirestoreFinished001', status: 'FINISHED' } });
      await t.db.delete(spaces).where(eq(spaces.id, id));
    });

    it('links a space to one import at most', async () => {
      const id = newUuid();
      await insertSpace(t.db, { id, name: 'Once', locales: [{ id: 'en', name: 'English' }] });
      await setImport(t.db, id, { legacyId: 'FirestoreOnce0000001' });
      const again = t.db.insert(firebaseImports).values({
        id: newUuid(), origin: 'https://firebase.example.com', sourceSpaceId: 'FirestoreOnce0000002', sourceSpaceName: 'x',
        spaceId: id, status: 'FINISHED', stages: [], startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await expect(again).rejects.toThrow();
      await t.db.delete(spaces).where(eq(spaces.id, id));
    });

    it('renames', async () => {
      const response = await manager.patch(`/api/app/spaces/${spaceId}`, { name: 'Marketing Site' });
      expect(response.json()).toMatchObject({ name: 'Marketing Site' });
      expect((await manager.patch(`/api/app/spaces/${spaceId}`, {})).statusCode).toBe(400);
      expect((await reader.patch(`/api/app/spaces/${spaceId}`, { name: 'x' })).statusCode).toBe(403);
    });

    it('manages environments one by one: create, update, reorder, delete; names may repeat', async () => {
      const base = `/api/app/spaces/${spaceId}/environments`;
      /** The space's environments in its order (every one: they are few). */
      const names = async () => (await reader.get(base)).json().items.map((it: { name: string }) => it.name);
      expect((await reader.get(base)).json()).toEqual({ items: [], page: 0, size: 20, total: 0 });
      expect((await noRole.get(base)).statusCode).toBe(403);

      // Adding and updating answer the environment; removing and reordering answer nothing.
      const created = await manager.post(base, { name: 'Preview', url: 'https://preview.example.com' });
      expect(created.statusCode).toBe(201);
      const preview = created.json();
      expect(preview).toMatchObject({ id: expect.stringMatching(UUID_V7), spaceId, name: 'Preview', url: 'https://preview.example.com', position: 0 });
      const twin = (await manager.post(base, { name: 'Preview', url: 'https://twin.example.com' })).json();
      const staging = (await manager.post(base, { name: 'Staging', url: 'https://staging.example.com' })).json();
      expect(twin).toMatchObject({ name: 'Preview', position: 1 });

      const updated = await manager.patch(`${base}/${twin.id}`, { name: 'Twin', url: 'https://{locale}.example.com/{fullSlug}' });
      expect(updated.statusCode).toBe(200);
      expect(updated.json()).toMatchObject({ id: twin.id, name: 'Twin', url: 'https://{locale}.example.com/{fullSlug}', position: 1 });

      const reordered = await manager.put(`${base}/order`, { ids: [staging.id, preview.id, twin.id] });
      expect(reordered.statusCode).toBe(204);
      expect(await names()).toEqual(['Staging', 'Preview', 'Twin']);
      expect((await reader.get(`${base}/names`)).json()).toEqual([
        { id: staging.id, name: 'Staging', url: 'https://staging.example.com' },
        { id: preview.id, name: 'Preview', url: 'https://preview.example.com' },
        { id: twin.id, name: 'Twin', url: 'https://{locale}.example.com/{fullSlug}' },
      ]);
      for (const ids of [[staging.id, preview.id], [staging.id, preview.id, twin.id, twin.id], [staging.id, preview.id, newUuid()]]) {
        expect((await manager.put(`${base}/order`, { ids })).statusCode).toBe(400);
      }

      const deleted = await manager.delete(`${base}/${staging.id}`);
      expect(deleted.statusCode).toBe(204);
      expect(deleted.body).toBe('');
      expect(await names()).toEqual(['Preview', 'Twin']);
      // A new environment goes last.
      // Positions are not renumbered on delete: after the highest.
      expect((await manager.post(base, { name: 'Last', url: 'https://last.example.com' })).json()).toMatchObject({ name: 'Last', position: 3 });
      expect(await names()).toEqual(['Preview', 'Twin', 'Last']);

      expect((await manager.patch(`${base}/${staging.id}`, { name: 'Gone', url: 'https://gone.example.com' })).statusCode).toBe(404);
      expect((await manager.delete(`${base}/${staging.id}`)).statusCode).toBe(404);
      expect((await manager.delete(`${base}/not-a-uuid`)).statusCode).toBe(404);
      expect((await reader.post(base, { name: 'x', url: 'https://x.example.com' })).statusCode).toBe(403);
      expect((await reader.get(`/api/app/spaces/${S2}/environments`)).statusCode).toBe(404);
      expect((await reader.get(`/api/app/spaces/${S2}/environments/names`)).statusCode).toBe(404);
      expect((await manager.post(`/api/app/spaces/${S2}/environments`, { name: 'x', url: 'https://x.example.com' })).statusCode).toBe(404);
      // The old way to set them is gone.
      expect((await manager.patch(`/api/app/spaces/${spaceId}`, { environments: [] })).statusCode).toBe(400);
    });

    it('accepts only absolute http(s) environment URLs, placeholders allowed anywhere', async () => {
      const base = `/api/app/spaces/${spaceId}/environments`;
      // Loaded into a trusted preview iframe.
      for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', '/relative/{slug}', 'ftp://example.com']) {
        expect((await manager.post(base, { name: 'Bad', url })).statusCode, url).toBe(400);
      }
      const [first] = (await reader.get(`/api/app/spaces/${spaceId}/environments`)).json().items;
      expect((await manager.patch(`${base}/${first.id}`, { name: 'Bad', url: 'javascript:alert(1)' })).statusCode).toBe(400);
      expect((await manager.post(base, { name: '', url: 'https://x.example.com' })).statusCode).toBe(400);
    });

    it('keeps environments of other spaces out of reach', async () => {
      const other = (await manager.post('/api/app/spaces', { name: 'Other' })).json().id;
      const [first] = (await reader.get(`/api/app/spaces/${spaceId}/environments`)).json().items;
      expect((await manager.patch(`/api/app/spaces/${other}/environments/${first.id}`, { name: 'x', url: 'https://x.example.com' })).statusCode).toBe(404);
      expect((await manager.delete(`/api/app/spaces/${other}/environments/${first.id}`)).statusCode).toBe(404);
      expect((await manager.put(`/api/app/spaces/${other}/environments/order`, { ids: [first.id] })).statusCode).toBe(400);
      await manager.delete(`/api/app/spaces/${other}`);
    });

    it('manages locales: add by id (idempotent, known locales only), set the default, refuse removing it, remove', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      expect((await manager.post(`${base}/locales`, { id: 'xx-unknown' })).statusCode).toBe(400);
      const added = await manager.post(`${base}/locales`, { id: 'de' });
      expect(added.statusCode).toBe(201);
      expect(added.json()).toMatchObject({ spaceId, localeId: 'de', position: 1, locale: { id: 'de', name: 'German' } });
      // Again: the same space locale, not a second one.
      expect((await manager.post(`${base}/locales`, { id: 'de' })).json()).toEqual(added.json());
      expect(localesOf((await reader.get(base)).json())).toEqual([
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ]);
      const setDefault = await manager.put(`${base}/default-locale`, { id: 'de' });
      expect(setDefault.json()).toMatchObject({ defaultLocaleId: 'de', defaultLocale: { id: 'de', name: 'German' } });
      expect((await manager.put(`${base}/default-locale`, { id: 'fr' })).statusCode).toBe(400);
      // Its own route only: the space's update takes the name alone.
      expect((await manager.patch(base, { name: 'Space', defaultLocaleId: 'en' })).statusCode).toBe(400);
      expect((await reader.put(`${base}/default-locale`, { id: 'en' })).statusCode).toBe(403);
      expect((await manager.delete(`${base}/locales/de`)).statusCode).toBe(400);
      await manager.put(`${base}/default-locale`, { id: 'en' });
      const removed = await manager.delete(`${base}/locales/de`);
      expect(removed.statusCode).toBe(204);
      expect(removed.body).toBe('');
      expect(localesOf((await reader.get(base)).json())).toEqual([{ id: 'en', name: 'English' }]);
      // One the space does not have: a 404 that changes nothing (no touch, no event).
      const before = (await reader.get(base)).json().updatedAt;
      expect((await manager.delete(`${base}/locales/de`)).statusCode).toBe(404);
      expect((await manager.delete(`${base}/locales/xx`)).statusCode).toBe(404);
      expect((await reader.get(base)).json().updatedAt).toBe(before);
      expect((await manager.post(`/api/app/spaces/${S2}/locales`, { id: 'de' })).statusCode).toBe(404);
      expect((await reader.post(`${base}/locales`, { id: 'de' })).statusCode).toBe(403);
    });

    it('reorders locales: every locale of the space, each once', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      await manager.post(`${base}/locales`, { id: 'de' });
      await manager.post(`${base}/locales`, { id: 'fr' });
      const reordered = await manager.put(`${base}/locales/order`, { ids: ['fr', 'en', 'de'] });
      expect(reordered.statusCode).toBe(204);
      expect(localesOf((await reader.get(base)).json()).map(it => it.id)).toEqual(['fr', 'en', 'de']);
      expect((await reader.get(`${base}/locales/names`)).json()).toEqual([
        { id: 'fr', name: 'French' },
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ]);
      // A locale added later goes last.
      await manager.post(`${base}/locales`, { id: 'it' });
      expect(localesOf((await reader.get(base)).json()).map(it => it.id)).toEqual(['fr', 'en', 'de', 'it']);
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
        { id: newUuid(), spaceId, key: 'hello', locales: { en: 'Hello', de: 'Hallo' } },
        { id: newUuid(), spaceId, key: 'bye', locales: { en: 'Bye', de: '' } },
        { id: newUuid(), spaceId, key: 'later', locales: {} },
      ]);
      await t.db.insert(contents).values([
        { spaceId, id: newUuid(), kind: 'DOCUMENT', name: 'Home', slug: 'home' },
        { spaceId, id: newUuid(), kind: 'FOLDER', name: 'Blog', slug: 'blog' },
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

    it('answers 404 for a space id that is not a UUID, on every route', async () => {
      const base = '/api/app/spaces/not-a-uuid';
      const requests = [
        reader.get(base),
        reader.get(`${base}/overview`),
        reader.get(`${base}/locales`),
        reader.get(`${base}/locales/names`),
        reader.get(`${base}/environments`),
        reader.get(`${base}/environments/names`),
        manager.patch(base, { name: 'X' }),
        manager.put(`${base}/default-locale`, { id: 'en' }),
        manager.post(`${base}/locales`, { id: 'de' }),
        manager.put(`${base}/locales/order`, { ids: ['en'] }),
        manager.delete(`${base}/locales/en`),
        manager.post(`${base}/environments`, { name: 'A', url: 'https://a.example.com' }),
        manager.put(`${base}/environments/order`, { ids: [newUuid()] }),
        manager.delete(base),
      ];
      for (const response of await Promise.all(requests)) expect(response.statusCode, response.body).toBe(404);
    });

    it('deletes a space with all its rows and files', async () => {
      expect((await reader.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(403);
      expect((await manager.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(204);
      // Its files are queued in the delete and swept right after the commit.
      await t.app.get(StorageSweeperService).whenIdle();
      expect(await t.db.select().from(spaces).where(eq(spaces.id, spaceId))).toEqual([]);
      expect(await t.db.select().from(contents).where(eq(contents.spaceId, spaceId))).toEqual([]);
      await expect(readdir(join(t.storageDir, 'spaces', spaceId))).rejects.toThrow();
      expect((await manager.delete(`/api/app/spaces/${spaceId}`)).statusCode).toBe(404);
    });
  });

  describe('instance label', () => {
    it('comes from the environment through the public runtime config; the settings API is gone', async () => {
      const labelled = await createTestApp({ LOCALESS_INSTANCE_NAME: 'Test', LOCALESS_INSTANCE_COLOR: 'destructive' });
      try {
        const response = await labelled.request({ method: 'GET', url: '/api/config' });
        expect(response.json().instance).toEqual({ name: 'Test', color: 'destructive' });
      } finally {
        await labelled.close();
      }
      expect((await admin.get('/api/app/settings')).statusCode).toBe(404);
      expect((await admin.patch('/api/app/settings/ui', { text: 'Hi' })).statusCode).toBe(404);
    });
  });
});

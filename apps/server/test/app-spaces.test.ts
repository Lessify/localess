import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contents, spaces, translations } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

describe('app API: spaces, locales, settings', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let noRole: ReturnType<typeof api>;
  let readerCookie: string;
  let managerCookie: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
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
        localeFallback: { id: 'en', name: 'English' },
        createdAt: expect.stringMatching(/^\d{4}-/),
      });
      expect(response.json()).not.toHaveProperty('contentVersion');
      expect(response.json()).not.toHaveProperty('environments');
      spaceId = response.json().id;
      expect(spaceId).toMatch(/^[A-Za-z0-9]{20}$/);
    });

    it('lists spaces by name for any role, but not for users without one', async () => {
      await admin.post('/api/app/spaces', { name: 'Alpha' });
      expect((await reader.get('/api/app/spaces')).json().map((s: { name: string }) => s.name)).toEqual(['Alpha', 'Marketing']);
      expect((await noRole.get('/api/app/spaces')).statusCode).toBe(403);
      expect((await reader.get(`/api/app/spaces/${spaceId}`)).json().name).toBe('Marketing');
      expect((await reader.get('/api/app/spaces/missing')).statusCode).toBe(404);
    });

    it('renames and sets environments', async () => {
      const response = await manager.patch(`/api/app/spaces/${spaceId}`, {
        name: 'Marketing Site',
        environments: [{ name: 'Preview', url: 'https://preview.example.com' }],
      });
      expect(response.json()).toMatchObject({
        name: 'Marketing Site',
        environments: [{ name: 'Preview', url: 'https://preview.example.com' }],
      });
      expect((await manager.patch(`/api/app/spaces/${spaceId}`, {})).statusCode).toBe(400);
      // Loaded into a trusted preview iframe: only absolute http(s), placeholders allowed anywhere.
      const env = (url: string) => manager.patch(`/api/app/spaces/${spaceId}`, { environments: [{ name: 'Preview', url }] });
      expect((await env('https://{locale}.example.com/{fullSlug}')).statusCode).toBe(200);
      for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', '/relative/{slug}', 'ftp://example.com']) {
        expect((await env(url)).statusCode, url).toBe(400);
      }
      await env('https://preview.example.com');
      expect((await reader.patch(`/api/app/spaces/${spaceId}`, { name: 'x' })).statusCode).toBe(403);
    });

    it('manages locales: add (idempotent), mark fallback, refuse removing the fallback, remove', async () => {
      const base = `/api/app/spaces/${spaceId}`;
      await manager.post(`${base}/locales`, { id: 'de', name: 'German' });
      const twice = await manager.post(`${base}/locales`, { id: 'de', name: 'German' });
      expect(twice.json().locales).toEqual([
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ]);
      expect((await manager.put(`${base}/locale-fallback`, { id: 'de' })).json().localeFallback).toEqual({ id: 'de', name: 'German' });
      expect((await manager.put(`${base}/locale-fallback`, { id: 'fr' })).statusCode).toBe(400);
      expect((await manager.delete(`${base}/locales/de`)).statusCode).toBe(400);
      await manager.put(`${base}/locale-fallback`, { id: 'en' });
      expect((await manager.delete(`${base}/locales/de`)).json().locales).toEqual([{ id: 'en', name: 'English' }]);
    });

    it('calculates the overview for any role', async () => {
      await t.db.insert(translations).values({ spaceId, id: 'hello', type: 'STRING', locales: { en: 'Hello' } });
      await t.db.insert(contents).values({ spaceId, id: 'c1', kind: 'DOCUMENT', name: 'Home', slug: 'home', fullSlug: 'home' });
      await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${spaceId}/assets/a1/original`, Buffer.alloc(1000));
      const response = await reader.post(`/api/app/spaces/${spaceId}/overview`);
      expect(response.statusCode).toBe(200);
      expect(response.json().overview).toMatchObject({
        translationsCount: 1,
        contentsCount: 1,
        assetsCount: 0,
        assetsSize: 1000,
        schemasCount: 0,
        tasksCount: 0,
        totalSize: 1000,
      });
    });

    it('accepts body-less actions sent with Content-Type: application/json', async () => {
      const response = await t.request({
        method: 'POST',
        url: `/api/app/spaces/${spaceId}/overview`,
        headers: { cookie: readerCookie, 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' },
      });
      expect(response.statusCode).toBe(200);
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

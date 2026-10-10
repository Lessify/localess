import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemas, spaces, translations } from '../src/infra/database/schema.js';
import { seedContent, seedSpace, seedTranslations, TOKEN_DEV, TOKEN_PUBLIC } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';
import { S1 } from './ids.js';

describe('v1 dev tools and manage API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
    await seedTranslations(t);
  });

  afterAll(() => t?.close());

  const get = (url: string) => t.request({ method: 'GET', url });
  /** `apiKey: null` sends no header. */
  const post = (url: string, payload: unknown, apiKey: string | null = TOKEN_DEV) =>
    t.request({ method: 'POST', url, payload: payload as object, headers: apiKey ? { 'x-api-key': apiKey } : {} });
  const space = async () => (await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0];
  const translation = async (key: string) =>
    (
      await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, S1), eq(translations.key, key)))
    )[0];

  describe('dev tools (?token= with DEV_TOOLS)', () => {
    it('describes the space', async () => {
      const response = await get(`/api/v1/spaces/${S1}?token=${TOKEN_DEV}`);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: S1,
        name: 'Space',
        locales: [
          { id: 'en', name: 'English' },
          { id: 'de', name: 'German' },
        ],
        localeFallback: { id: 'en', name: 'English' },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('refuses tokens without DEV_TOOLS', async () => {
      expect((await get(`/api/v1/spaces/${S1}?token=${TOKEN_PUBLIC}`)).statusCode).toBe(403);
    });

    it('generates an OpenAPI document from the schemas', async () => {
      const body = (await get(`/api/v1/spaces/${S1}/open-api?token=${TOKEN_DEV}`)).json();
      expect(body.openapi).toMatch(/^3\./);
      expect(JSON.stringify(body.components)).toContain('page');
    });

    it('returns stored values for one locale without fallback filling', async () => {
      const response = await get(`/api/v1/spaces/${S1}/translations/de/values?token=${TOKEN_DEV}`);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.json()).toEqual({ greeting: 'Hallo' });
      const unknown = await get(`/api/v1/spaces/${S1}/translations/fr/values?token=${TOKEN_DEV}`);
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json()).toEqual({
        details: 'Locale fr is not in space locales',
        message: 'Locale not supported by this space',
        status: 'INVALID_ARGUMENT',
      });
    });

    it('exports schemas without timestamps or nulls', async () => {
      expect((await get(`/api/v1/spaces/${S1}/schemas?token=${TOKEN_DEV}`)).json()).toEqual([
        {
          id: 'page',
          type: 'ROOT',
          fields: [
            { name: 'title', kind: 'TEXT', translatable: true },
            { name: 'author', kind: 'REFERENCE' },
            { name: 'cta', kind: 'LINK' },
          ],
        },
      ]);
    });

    it.each([
      ['space id on the dev-tools route', '/api/v1/spaces/S1%2Fx'],
      ['space id on the translation values route', '/api/v1/spaces/S1%2Fx/translations/en/values'],
    ])('rejects a %s with 400 (ported)', async (_name, url) => {
      expect((await get(url)).statusCode).toBe(400);
    });
  });

  describe('translation push (X-API-KEY with DEV_TOOLS)', () => {
    const push = (payload: unknown, apiKey: string | null = TOKEN_DEV) => post(`/api/v1/spaces/${S1}/translations/de`, payload, apiKey);

    it('authenticates with the X-API-KEY header only', async () => {
      expect((await post(`/api/v1/spaces/${S1}/translations/de`, { type: 'add-missing', values: {} }, null)).statusCode).toBe(401);
      expect(
        (await post(`/api/v1/spaces/${S1}/translations/de?token=${TOKEN_DEV}`, { type: 'add-missing', values: {} }, null)).statusCode,
      ).toBe(401);
      expect((await push({ type: 'add-missing', values: {} }, TOKEN_PUBLIC)).statusCode).toBe(403);
    });

    it('rejects a malformed space id (ported)', async () => {
      expect((await post('/api/v1/spaces/S1%2Fx/translations/en', {})).statusCode).toBe(400);
    });

    it('validates the body and the locale', async () => {
      const bad = await push({ type: 'replace-everything', values: {} });
      expect(bad.statusCode).toBe(400);
      expect(bad.json()).toMatchObject({ message: 'Bad request body', status: 'INVALID_ARGUMENT', details: expect.anything() });
      expect((await post(`/api/v1/spaces/${S1}/translations/fr`, { type: 'add-missing', values: {} })).statusCode).toBe(400);
    });

    it('reports a dry run without writing, with status 200 like the Express endpoint', async () => {
      const before = await space();
      const response = await push({ type: 'add-missing', values: { 'brand.new': 'Neu' }, dryRun: true });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: '[DryRun] Would add 1 translation', ids: ['brand.new'], dryRun: true });
      expect(await translation('brand.new')).toBeUndefined();
      expect((await space()).translationVersion).toBe(before.translationVersion);
    });

    it('adds missing keys and bumps the translation version', async () => {
      const before = await space();
      const response = await push({ type: 'add-missing', values: { 'brand.new': 'Neu', greeting: 'ignored, exists' } });
      expect(response.json()).toEqual({ message: 'Added 1 translation', ids: ['brand.new'] });
      expect(await translation('brand.new')).toMatchObject({ type: 'STRING', locales: { de: 'Neu' } });
      expect((await translation('greeting')).locales).toEqual({ en: 'Hello', de: 'Hallo' });
      expect((await space()).translationVersion).toBe(before.translationVersion + 1);
    });

    it('updates only the pushed locale of existing keys', async () => {
      const response = await push({ type: 'update-existing', values: { greeting: 'Servus', farewell: 'Tschüss', unknown: 'x' } });
      expect(response.json().ids.sort()).toEqual(['farewell', 'greeting']);
      expect((await translation('greeting')).locales).toEqual({ en: 'Hello', de: 'Servus' });
      expect((await translation('farewell')).locales).toEqual({ en: 'Bye', de: 'Tschüss' });
    });

    it('is visible immediately in draft translations', async () => {
      const { translationVersion } = await space();
      const response = await get(`/api/v1/spaces/${S1}/translations/de?cv=${translationVersion}&version=draft&token=${TOKEN_DEV}`);
      expect(response.json()).toMatchObject({ greeting: 'Servus', 'brand.new': 'Neu' });
    });

    it('removes only this locale for keys missing from the payload (delete-missing-value)', async () => {
      const response = await push({ type: 'delete-missing-value', values: { greeting: 'Servus', 'brand.new': 'Neu' } });
      expect(response.json()).toEqual({ message: 'Removed 1 locale value', ids: ['farewell'] });
      expect((await translation('farewell')).locales).toEqual({ en: 'Bye' });
    });

    it('deletes whole keys missing from the payload (delete-missing-key)', async () => {
      const response = await push({ type: 'delete-missing-key', values: { greeting: 'x', farewell: 'x', 'brand.new': 'x' } });
      expect(response.json()).toEqual({ message: 'Deleted 1 translation key', ids: ['new.key'] });
      expect(await translation('new.key')).toBeUndefined();
    });

    it('says when there is nothing to do', async () => {
      expect((await push({ type: 'add-missing', values: { greeting: 'x' } })).json()).toEqual({
        message: 'No translations to add',
        ids: [],
      });
    });
  });

  describe('schema push (X-API-KEY with DEV_TOOLS)', () => {
    const push = (payload: unknown) => post(`/api/v1/spaces/${S1}/schemas`, payload);
    const card = { id: 'card', type: 'NODE', fields: [{ name: 'heading', kind: 'TEXT' }] };
    const color = { id: 'color', type: 'ENUM', values: [{ name: 'Red', value: 'red' }] };

    it('upserts: creates new schemas, updates changed ones, keeps the rest, bumping the content version', async () => {
      const before = await space();
      const page = { id: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] };
      const response = await push({ type: 'upsert', schemas: [page, card, color] });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'Created 2, updated 1, deleted 0 schemas (0 unchanged)',
        counts: { created: 2, updated: 1, deleted: 0, unchanged: 0 },
        ids: { created: ['card', 'color'], updated: ['page'], deleted: [] },
      });
      const rows = await t.db.select().from(schemas).where(eq(schemas.spaceId, S1));
      expect(rows.find(it => it.name === 'page')).toMatchObject({
        displayName: 'Page',
        fields: [{ name: 'title', kind: 'TEXT', translatable: true }],
      });
      expect(rows.find(it => it.name === 'color')).toMatchObject({ type: 'ENUM', values: [{ name: 'Red', value: 'red' }], fields: null });
      expect((await space()).contentVersion).toBe(before.contentVersion + 1);
    });

    it('reports unchanged schemas on a repeat push', async () => {
      const response = await push({ type: 'upsert', schemas: [card], dryRun: true });
      expect(response.json()).toMatchObject({ counts: { created: 0, updated: 0, deleted: 0, unchanged: 1 }, dryRun: true });
    });

    it('refuses a sync that would delete a schema still referenced', async () => {
      const page = { id: 'page', type: 'ROOT', fields: [{ name: 'cards', kind: 'SCHEMAS', schemas: ['card'] }] };
      const response = await push({ type: 'sync', schemas: [page] });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        details: { errors: ["Cannot delete schema 'card': still referenced by 'page' field 'cards'"] },
        message: 'Referential integrity check failed',
        status: 'FAILED_PRECONDITION',
      });
    });

    it('syncs: deletes schemas absent from the payload', async () => {
      const response = await push({ type: 'sync', schemas: [card] });
      expect(response.json().ids.deleted.sort()).toEqual(['color', 'page']);
      const rows = await t.db.select({ name: schemas.name }).from(schemas).where(eq(schemas.spaceId, S1));
      expect(rows.map(it => it.name)).toEqual(['card']);
    });

    it('validates the body', async () => {
      const response = await push({ type: 'sync', schemas: [{ id: 'x', type: 'ROOT', fields: [{ name: 'n', kind: 'SCHEMA' }] }] });
      expect(response.statusCode).toBe(400);
    });
  });
});

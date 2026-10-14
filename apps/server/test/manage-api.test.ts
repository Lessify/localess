import { and, eq } from 'drizzle-orm';
import { TokenType, WebHookEvent } from '@localess/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { schemas, tokens, translations } from '../src/infra/database/schema.js';
import { newApiToken } from '../src/shared/utils/api-token-format.js';
import { EventsService } from '../src/infra/events/events.service.js';
import { WebhookDispatcher } from '../src/shared/services/webhook-dispatcher.service.js';
import { seedContent, seedSpace, seedTranslations, TOKEN_MANAGEMENT, TOKEN_PUBLIC, TOKEN_READ, tokenRow } from './seed.js';
import { buildDrafts, createTestApp, draftSnapshots, insertSpace, TestApp } from './test-app.js';
import { S1, S2 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';

describe('management API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
    await seedTranslations(t);
  });

  afterAll(() => t?.close());

  const base = `/api/manage/v1/spaces/${S1}`;
  /** `Authorization: Bearer <value>`; `null` sends no header. */
  const bearer = (value: string | null = TOKEN_MANAGEMENT): Record<string, string> => (value ? { authorization: `Bearer ${value}` } : {});
  const get = (url: string, value: string | null = TOKEN_MANAGEMENT) => t.request({ method: 'GET', url, headers: bearer(value) });
  const post = (url: string, payload: unknown, value: string | null = TOKEN_MANAGEMENT) =>
    t.request({ method: 'POST', url, payload: payload as object, headers: bearer(value) });
  const translation = async (key: string) =>
    (
      await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, S1), eq(translations.key, key)))
    )[0];

  describe('reads', () => {
    it('describes the space', async () => {
      const response = await get(base);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        id: S1,
        name: 'Space',
        locales: [
          { id: 'en', name: 'English' },
          { id: 'de', name: 'German' },
        ],
        defaultLocale: { id: 'en', name: 'English' },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('generates an OpenAPI document from the schemas', async () => {
      const body = (await get(`${base}/open-api`)).json();
      expect(body.openapi).toMatch(/^3\./);
      expect(JSON.stringify(body.components)).toContain('page');
    });

    it('returns stored values for one locale without fallback filling', async () => {
      const response = await get(`${base}/translations/de`);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.json()).toEqual({ greeting: 'Hallo' });
      const unknown = await get(`${base}/translations/fr`);
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json()).toEqual({
        details: 'Locale fr is not in space locales',
        message: 'Locale not supported by this space',
        status: 'INVALID_ARGUMENT',
      });
    });

    it('exports schemas without timestamps or nulls', async () => {
      expect((await get(`${base}/schemas`)).json()).toEqual([
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
      ['space id on the space route', '/api/manage/v1/spaces/S1%2Fx'],
      ['space id on the translation values route', '/api/manage/v1/spaces/S1%2Fx/translations/en'],
    ])('rejects a %s with 400 (ported)', async (_name, url) => {
      expect((await get(url)).statusCode).toBe(400);
    });
  });

  describe('translation push', () => {
    const push = (payload: unknown, value: string | null = TOKEN_MANAGEMENT) => post(`${base}/translations/de`, payload, value);
    let dispatch: MockInstance<WebhookDispatcher['dispatch']>;
    let publish: MockInstance<EventsService['publish']>;

    beforeAll(() => {
      dispatch = vi.spyOn(t.app.get(WebhookDispatcher), 'dispatch');
      publish = vi.spyOn(t.app.get(EventsService), 'publish');
    });
    beforeEach(() => {
      dispatch.mockClear();
      publish.mockClear();
    });

    /** A push that wrote something fires translation.changed and refreshes open editors; others notify nobody. */
    const expectNotified = (notified: boolean) => {
      if (notified) {
        expect(dispatch.mock.calls).toEqual([[S1, WebHookEvent.TRANSLATION_CHANGED]]);
        expect(publish.mock.calls.map(([event]) => event)).toEqual([{ spaceId: S1, entity: 'translations', op: 'updated' }]);
      } else {
        expect(dispatch).not.toHaveBeenCalled();
        expect(publish).not.toHaveBeenCalled();
      }
    };

    it('authenticates with the Bearer header only', async () => {
      expect((await post(`${base}/translations/de`, { type: 'add-missing', values: {} }, null)).statusCode).toBe(401);
      expect((await post(`${base}/translations/de?token=${TOKEN_MANAGEMENT}`, { type: 'add-missing', values: {} }, null)).statusCode).toBe(401);
      expect((await push({ type: 'add-missing', values: {} }, TOKEN_PUBLIC)).statusCode).toBe(401);
    });

    it('rejects a malformed space id (ported)', async () => {
      expect((await post('/api/manage/v1/spaces/S1%2Fx/translations/en', {})).statusCode).toBe(400);
    });

    it('validates the body and the locale', async () => {
      const bad = await push({ type: 'replace-everything', values: {} });
      expect(bad.statusCode).toBe(400);
      expect(bad.json()).toMatchObject({ message: 'Bad request body', status: 'INVALID_ARGUMENT', details: expect.anything() });
      expect((await post(`${base}/translations/fr`, { type: 'add-missing', values: {} })).statusCode).toBe(400);
    });

    it('reports a dry run without writing, with status 200 like the Express endpoint', async () => {
      await buildDrafts(t, S1);
      const response = await push({ type: 'add-missing', values: { 'brand.new': 'Neu' }, dryRun: true });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: '[DryRun] Would add 1 translation', ids: ['brand.new'], dryRun: true });
      expect(await translation('brand.new')).toBeUndefined();
      expect(await draftSnapshots(t.db, S1)).not.toEqual([]);
      expectNotified(false);
    });

    it('adds missing keys and drops the draft maps', async () => {
      await buildDrafts(t, S1);
      const response = await push({ type: 'add-missing', values: { 'brand.new': 'Neu', greeting: 'ignored, exists' } });
      expect(response.json()).toEqual({ message: 'Added 1 translation', ids: ['brand.new'] });
      expect(await translation('brand.new')).toMatchObject({ locales: { de: 'Neu' } });
      expect((await translation('greeting')).locales).toEqual({ en: 'Hello', de: 'Hallo' });
      expect(await draftSnapshots(t.db, S1)).toEqual([]);
      expectNotified(true);
    });

    it('refuses to add keys outside the key rule, naming them, even on a dry run', async () => {
      for (const dryRun of [true, false]) {
        const response = await push({ type: 'add-missing', values: { 'ok.key': 'x', 'bad key': 'x', 'trailing.': 'x' }, dryRun });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toMatchObject({ status: 'INVALID_ARGUMENT', details: { keys: ['bad key', 'trailing.'] } });
      }
      expect(await translation('ok.key')).toBeUndefined();
      expectNotified(false);
    });

    it('updates existing keys whatever their form (imported keys are kept as they are)', async () => {
      await t.db.insert(translations).values({ id: newUuid(), spaceId: S1, key: 'legacy key', locales: { en: 'Old' } });
      const response = await push({ type: 'update-existing', values: { 'legacy key': 'Alt' } });
      expect(response.json()).toEqual({ message: 'Updated 1 translation', ids: ['legacy key'] });
      await t.db.delete(translations).where(eq(translations.key, 'legacy key'));
      dispatch.mockClear();
      publish.mockClear();
    });

    it('updates only the pushed locale of existing keys', async () => {
      const response = await push({ type: 'update-existing', values: { greeting: 'Servus', farewell: 'Tschüss', unknown: 'x' } });
      expect(response.json().ids.sort()).toEqual(['farewell', 'greeting']);
      expect((await translation('greeting')).locales).toEqual({ en: 'Hello', de: 'Servus' });
      expect((await translation('farewell')).locales).toEqual({ en: 'Bye', de: 'Tschüss' });
      expectNotified(true);
    });

    it('is visible immediately in draft translations', async () => {
      const redirect = await get(`/api/v1/spaces/${S1}/translations/de?version=draft&token=${TOKEN_READ}`, null);
      const response = await get(redirect.headers.location as string, null);
      expect(response.json()).toMatchObject({ greeting: 'Servus', 'brand.new': 'Neu' });
    });

    it('removes only this locale for keys missing from the payload (delete-missing-value)', async () => {
      const response = await push({ type: 'delete-missing-value', values: { greeting: 'Servus', 'brand.new': 'Neu' } });
      expect(response.json()).toEqual({ message: 'Removed 1 locale value', ids: ['farewell'] });
      expect((await translation('farewell')).locales).toEqual({ en: 'Bye' });
      expectNotified(true);
    });

    it('deletes whole keys missing from the payload (delete-missing-key)', async () => {
      const response = await push({ type: 'delete-missing-key', values: { greeting: 'x', farewell: 'x', 'brand.new': 'x' } });
      expect(response.json()).toEqual({ message: 'Deleted 1 translation key', ids: ['new.key'] });
      expect(await translation('new.key')).toBeUndefined();
      expectNotified(true);
    });

    it('says when there is nothing to do', async () => {
      expect((await push({ type: 'add-missing', values: { greeting: 'x' } })).json()).toEqual({
        message: 'No translations to add',
        ids: [],
      });
      expectNotified(false);
    });
  });

  describe('schema push', () => {
    const push = (payload: unknown) => post(`${base}/schemas`, payload);
    const card = { id: 'card', type: 'NODE', fields: [{ name: 'heading', kind: 'TEXT' }] };
    const color = { id: 'color', type: 'ENUM', values: [{ name: 'Red', value: 'red' }] };

    it('upserts: creates new schemas, updates changed ones, keeps the rest, bumping the content version', async () => {
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

    it('refuses a sync that would delete the schema of contents', async () => {
      const response = await push({ type: 'sync', schemas: [card] });
      expect(response.statusCode).toBe(400);
      expect(response.json().details).toEqual({ errors: ["Cannot delete schema 'page': used by 4 contents"] });
    });

    it('syncs: deletes schemas absent from the payload', async () => {
      const page = { id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] };
      const response = await push({ type: 'sync', schemas: [page, card] });
      expect(response.json().ids.deleted).toEqual(['color']);
      const rows = await t.db.select({ name: schemas.name }).from(schemas).where(eq(schemas.spaceId, S1));
      expect(rows.map(it => it.name).sort()).toEqual(['card', 'page']);
    });

    it('refuses fields that break a rule across fields, naming the schema', async () => {
      const page = { id: 'page', type: 'ROOT', fields: [{ name: 'hero', kind: 'SCHEMA', schemas: ['gone'] }] };
      const response = await push({ type: 'upsert', schemas: [page] });
      expect(response.statusCode).toBe(400);
      expect(response.json().details).toEqual({ errors: ["Schema 'page': field 'hero' allows 'gone', which does not exist"] });
    });

    it('validates the body', async () => {
      const response = await push({ type: 'sync', schemas: [{ id: 'x', type: 'ROOT', fields: [{ name: 'n', kind: 'SCHEMA' }] }] });
      expect(response.statusCode).toBe(400);
    });
  });
  describe('authentication', () => {
    const unauthenticated = { message: 'Missing or invalid API token', status: 'UNAUTHENTICATED' };

    it.each([
      ['no header', {}],
      ['X-API-KEY', { 'x-api-key': TOKEN_MANAGEMENT }],
      ['another scheme', { authorization: `Basic ${TOKEN_MANAGEMENT}` }],
      ['a public token', { authorization: `Bearer ${TOKEN_PUBLIC}` }],
      ['a preview token', { authorization: `Bearer ${TOKEN_READ}` }],
      ['an unknown management token', { authorization: `Bearer ${newApiToken(TokenType.MANAGEMENT)}` }],
      ['two values', { authorization: `Bearer ${TOKEN_MANAGEMENT} ${TOKEN_MANAGEMENT}` }],
    ])('answers %s with 401, WWW-Authenticate: Bearer and no-store', async (_, headers) => {
      const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.json()).toEqual(unauthenticated);
    });

    it('ignores ?token=', async () => {
      expect((await get(`${base}/schemas?token=${TOKEN_MANAGEMENT}`, null)).statusCode).toBe(401);
    });

    it('accepts the scheme in any case', async () => {
      const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers: { authorization: `bearer ${TOKEN_MANAGEMENT}` } });
      expect(response.statusCode).toBe(200);
    });

    it('does not accept a token from another space', async () => {
      await insertSpace(t.db, { id: S2, name: 'Other', locales: [{ id: 'en', name: 'English' }] });
      const other = newApiToken(TokenType.MANAGEMENT);
      await t.db.insert(tokens).values(tokenRow(S2, TokenType.MANAGEMENT, other, 'other'));
      expect((await get(`${base}/schemas`, other)).statusCode).toBe(401);
      expect((await get(`/api/manage/v1/spaces/${S2}/schemas`, other)).statusCode).toBe(200);
    });

    it('answers a well-formed space id that is not a UUID with the usual 401, revealing nothing', async () => {
      const response = await get('/api/manage/v1/spaces/Firestore20charsId01/schemas', null);
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect((await get('/api/manage/v1/spaces/Firestore20charsId01/schemas')).statusCode).toBe(401);
    });

    it('answers a bad space id with 400 before checking the token', async () => {
      expect((await get('/api/manage/v1/spaces/bad%2Fid/schemas', null)).statusCode).toBe(400);
    });

    it('marks every response no-store, errors included', async () => {
      expect((await get(base)).headers['cache-control']).toBe('no-store');
      expect((await get(`${base}/translations/fr`)).headers['cache-control']).toBe('no-store'); // 400
      expect((await post(`${base}/schemas`, { bad: true })).headers['cache-control']).toBe('no-store'); // 400
    });

    it.each([
      ['invalid JSON (400)', { method: 'POST', url: `/api/manage/v1/spaces/${S1}/schemas`, payload: '{not json', headers: { 'content-type': 'application/json' } }],
      ['an unsupported content type (415)', { method: 'POST', url: `/api/manage/v1/spaces/${S1}/schemas`, payload: 'x', headers: { 'content-type': 'application/x-thing' } }],
      ['an unknown route (404)', { method: 'GET', url: `/api/manage/v1/spaces/${S1}/nothing-here` }],
    ] as const)('marks errors answered before the guard no-store too: %s', async (_, request) => {
      const response = await t.request({ ...request, headers: { ...bearer(), ...('headers' in request ? request.headers : {}) } } as never);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('sends no CORS headers', async () => {
      const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers: { ...bearer(), origin: 'https://site.example' } });
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('needs no X-Requested-With on POST (no cookie)', async () => {
      expect((await post(`${base}/translations/de`, { type: 'add-missing', values: { greeting: 'x' } })).statusCode).toBe(200);
    });

    it('no longer serves the old dev-tools URLs', async () => {
      for (const path of ['', '/schemas', '/open-api', '/translations/de/values']) {
        expect((await get(`/api/v1/spaces/${S1}${path}?token=${TOKEN_MANAGEMENT}`, null)).statusCode).toBe(404);
      }
    });
  });
});

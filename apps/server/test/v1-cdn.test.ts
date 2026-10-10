import { gunzipSync } from 'node:zlib';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spaces, tokens } from '../src/infra/database/schema.js';
import {
  seedContent,
  seedSpace,
  seedTranslations,
  TOKEN_DEV,
  TOKEN_DRAFT,
  TOKEN_NO_CACHE,
  TOKEN_NONE,
  TOKEN_PUBLIC,
  TOKEN_V1,
} from './seed.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';
import { C, contentName, EMPTY_SPACE, S1, S2 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';

/**
 * The public delivery API against real rows. The cases ported from functions/src/v1/*.test.ts keep
 * their names; the rest pin behaviour the Express app had but never tested.
 */
describe('v1 CDN API', () => {
  let t: TestApp;

  const EMPTY_TOKEN = 'GGGGGGGGGGGGGGGGGGGG';

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
    await seedTranslations(t);
    // A second space with nothing published, and its own token.
    await insertSpace(t.db, { id: EMPTY_SPACE, name: 'Empty', locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
    await t.db.insert(tokens).values({ id: newUuid(), token: EMPTY_TOKEN, spaceId: EMPTY_SPACE, name: 'v1' });
  });

  afterAll(() => t?.close());

  const get = (url: string, headers: Record<string, string> = {}) => t.request({ method: 'GET', url, headers });

  describe('token authentication', () => {
    it('answers a missing, malformed or unknown token with the same 401 body', async () => {
      for (const url of [
        `/api/v1/spaces/${S1}/translations/en`,
        `/api/v1/spaces/${S1}/translations/en?token=short`,
        `/api/v1/spaces/${S1}/translations/en?token=ZZZZZZZZZZZZZZZZZZZZ`,
      ]) {
        const response = await get(url);
        expect(response.statusCode).toBe(401);
        expect(response.body).toBe('{"message":"Missing or invalid API token","status":"UNAUTHENTICATED"}');
      }
    });

    it('does not accept a token from another space', async () => {
      expect((await get(`/api/v1/spaces/${EMPTY_SPACE}/links?token=${TOKEN_PUBLIC}`)).statusCode).toBe(401);
      expect((await get(`/api/v1/spaces/${S1}/links?token=${EMPTY_TOKEN}`)).statusCode).toBe(401);
    });

    it('names the missing permissions in a 403', async () => {
      const response = await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_NONE}`);
      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        details: {
          requiredPermissions: ['CONTENT_PUBLIC', 'CONTENT_DRAFT', 'DEV_TOOLS'],
          reason: 'Published content requires the CONTENT_PUBLIC, CONTENT_DRAFT, or DEV_TOOLS permission.',
          hint: 'Add one of the required permissions to this token, or use a token that already has it.',
        },
        message: 'Token is missing a required permission',
        status: 'PERMISSION_DENIED',
      });
    });

    it('requires a draft permission whenever `version` is present', async () => {
      const response = await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_PUBLIC}&version=draft`);
      expect(response.statusCode).toBe(403);
      expect(response.json().details.reason).toMatch(/draft content/);
      expect((await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_DRAFT}&version=draft`)).statusCode).toBe(302);
      expect((await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_DEV}&version=draft`)).statusCode).toBe(302);
    });

    it('gives V1 tokens their implicit public and draft permissions', async () => {
      expect((await get(`/api/v1/spaces/${S1}/translations/en?token=${TOKEN_V1}&version=draft`)).statusCode).toBe(302);
      expect((await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_V1}`)).statusCode).toBe(302);
    });
  });

  describe('v1 route id validation (ported)', () => {
    it.each([
      ['content id with an encoded slash (draft path)', `/api/v1/spaces/S1/contents/X%2Fdraft?locale=en&cv=1&token=${TOKEN_V1}`],
      ['content id containing a dot', '/api/v1/spaces/S1/contents/a.json?cv=1'],
      ['space id with an encoded slash', '/api/v1/spaces/S1%2Fcontents%2FX/contents/C1'],
      ['asset id with an encoded slash', '/api/v1/spaces/S1/assets/A1%2Fx'],
      ['asset id on /original', '/api/v1/spaces/S1/assets/A1%2Fx/original'],
      ['space id on the translations route', '/api/v1/spaces/S1%2Fx/translations/en'],
    ])('rejects a %s with 400', async (_name, url) => {
      const response = await get(url);
      expect(response.statusCode).toBe(400);
      expect(response.headers['cache-control']).toBe('public, max-age=3600, s-maxage=3600');
    });

    it('lets a well-formed id through to the permission check', async () => {
      expect((await get(`/api/v1/spaces/${S2}/contents/C1`)).statusCode).toBe(401);
    });

    it('answers 404 for a well-formed id that is neither a space UUID nor an imported Firestore id', async () => {
      const response = await get(`/api/v1/spaces/NoSuchFirestoreId/contents/${C.home}?token=${TOKEN_V1}`);
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ message: 'Not found', status: 'NOT_FOUND' });
    });
  });

  describe('cv redirects (ported)', () => {
    it('keeps a decoded value that contains & and = inside its own parameter', async () => {
      const response = await get(`/api/v1/spaces/${S1}/translations/en?token=${TOKEN_V1}&version=x%26token%3Dinjected`);
      expect(response.statusCode).toBe(302);
      const location = new URL(response.headers.location as string, 'https://cms.example.com');
      expect(location.searchParams.getAll('token')).toEqual([TOKEN_V1]);
      expect(location.searchParams.get('version')).toBe('x&token=injected');
    });

    it('leaves ordinary values unchanged', async () => {
      const response = await get(`/api/v1/spaces/${S1}/translations/en?token=${TOKEN_V1}`);
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`/api/v1/spaces/${S1}/translations/en?cv=3&token=${TOKEN_V1}`);
      expect(response.headers['cache-control']).toBe('public, max-age=60, s-maxage=60');
    });

    it('also redirects a stale cv, and honours the token cacheTtl', async () => {
      const stale = await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_DRAFT}&cv=1&locale=de&resolveLink=true`);
      expect(stale.headers.location).toBe(`/api/v1/spaces/${S1}/contents/${C.home}?cv=7&locale=de&token=${TOKEN_DRAFT}&resolveLink=true`);
      expect(stale.headers['cache-control']).toBe('public, max-age=30, s-maxage=30');

      const noCache = await get(`/api/v1/spaces/${S1}/links?token=${TOKEN_NO_CACHE}&parentSlug=blog&excludeChildren=true&kind=DOCUMENT`);
      expect(noCache.headers.location).toBe(
        `/api/v1/spaces/${S1}/links?cv=7&parentSlug=blog&excludeChildren=true&kind=DOCUMENT&token=${TOKEN_NO_CACHE}`,
      );
      expect(noCache.headers['cache-control']).toBe('no-cache');
    });

    it('follows the space version, so publishing invalidates every cached URL', async () => {
      await t.db.update(spaces).set({ contentVersion: 8 }).where(eq(spaces.id, S1));
      const response = await get(`/api/v1/spaces/${S1}/contents/${C.home}?token=${TOKEN_V1}&cv=7`);
      expect(response.headers.location).toContain('cv=8');
      await t.db.update(spaces).set({ contentVersion: 7 }).where(eq(spaces.id, S1));
    });
  });

  describe('translations', () => {
    const translations = (query: string) => get(`/api/v1/spaces/${S1}/translations/${query}&cv=3&token=${TOKEN_V1}`);

    it('serves the published locale file, cached for a week', async () => {
      const response = await translations('de?x=1');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['cache-control']).toBe('public, max-age=604800, s-maxage=604800');
      expect(response.json()).toEqual({ farewell: 'Bye', greeting: 'Hallo' });
    });

    it('serves the fallback locale for an unknown locale', async () => {
      expect((await translations('fr?x=1')).json()).toEqual({ farewell: 'Bye', greeting: 'Hello' });
    });

    it('builds drafts from the live rows, filling gaps from the fallback locale', async () => {
      const response = await translations('de?version=draft');
      expect(response.json()).toEqual({ farewell: 'Bye', greeting: 'Hallo', 'new.key': 'New (draft only)' });
      expect(Object.keys(response.json())).toEqual(['farewell', 'greeting', 'new.key']);
    });

    it('answers 404 when nothing was published', async () => {
      const response = await get(`/api/v1/spaces/${EMPTY_SPACE}/translations/en?cv=1&token=${EMPTY_TOKEN}`);
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ message: 'File not found, Publish first.', status: 'NOT_FOUND' });
    });
  });

  describe('content by id', () => {
    const content = (id: string, query = '') => get(`/api/v1/spaces/${S1}/contents/${id}?cv=7&token=${TOKEN_DRAFT}${query}`);

    it('serves the published snapshot without the internal id arrays', async () => {
      const response = await content(C.home, '&locale=de');
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('public, max-age=604800, s-maxage=604800');
      const body = response.json();
      expect(body).toMatchObject({ id: C.home, locale: 'de', fullSlug: 'home', data: { title: 'Startseite' } });
      expect(body).not.toHaveProperty('assets');
      expect(body).not.toHaveProperty('links');
      expect(body).not.toHaveProperty('references');
    });

    it('uses the fallback locale when the locale is unknown or was not published', async () => {
      expect((await content(C.home, '&locale=fr')).json()).toMatchObject({ locale: 'en', data: { title: 'Home' } });
      expect((await content(C.post1, '&locale=de')).json()).toMatchObject({ locale: 'en', data: { title: 'Post 1' } });
    });

    it('answers a never-published document with a 404 cached for ten minutes', async () => {
      const response = await content(C.post2);
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control']).toBe('public, max-age=600, s-maxage=600');
      expect(response.json().message).toMatch(/Please Publish again/);
    });

    it('builds drafts from the current data, per locale', async () => {
      expect((await content(C.post2, '&version=draft&locale=de')).json()).toMatchObject({
        id: C.post2,
        locale: 'de',
        data: { _id: 'post2-root', _schema: 'page', title: 'Beitrag 2' },
      });
      const home = (await content(C.home, '&version=draft')).json();
      expect(home.data.title).toBe('Home (draft)');
      expect(home).not.toHaveProperty('publishedAt');
    });

    it('treats any other `version` value as published, as before', async () => {
      expect((await content(C.home, '&version=latest')).json().data.title).toBe('Home');
    });

    it('resolves links (skipping deleted targets), assets and references on request', async () => {
      const body = (await content(C.home, '&resolveLink=true&resolveAsset=true&resolveReference=true')).json();
      expect(body.links).toEqual({
        [C.post1]: expect.objectContaining({ id: C.post1, kind: 'DOCUMENT', fullSlug: 'blog/post-1', publishedAt: '2026-01-01T00:00:00.000Z' }),
      });
      expect(body.references[C.post1]).toMatchObject({ id: C.post1, locale: 'en', data: { title: 'Post 1' } });
      expect(body.references[C.post1]).not.toHaveProperty('assets');
      // The asset row is seeded by the asset tests; here it doesn't exist, so it is skipped.
      expect(body.assets).toEqual({});
    });

    it('answers unknown content with the not-found body', async () => {
      expect((await content('nope')).statusCode).toBe(404);
    });
  });

  describe('old Firebase ids', () => {
    it('are not accepted for documents, nor for the space outside asset routes', async () => {
      await t.db.update(spaces).set({ legacyId: 'FirestoreSpace' }).where(eq(spaces.id, S1));
      expect((await get(`/api/v1/spaces/FirestoreSpace/contents/${C.home}?cv=7&token=${TOKEN_DRAFT}`)).statusCode).toBe(404);
      expect((await get(`/api/v1/spaces/${S1}/contents/FirestoreHome?cv=7&token=${TOKEN_DRAFT}`)).statusCode).toBe(404);
      await t.db.update(spaces).set({ legacyId: null }).where(eq(spaces.id, S1));
    });
  });

  describe('content by slug', () => {
    it('finds a document by its full slug', async () => {
      const response = await get(`/api/v1/spaces/${S1}/contents/slugs/blog/post-1?cv=7&token=${TOKEN_V1}`);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: C.post1, fullSlug: 'blog/post-1' });
    });

    it('redirects with each segment encoded', async () => {
      const response = await get(`/api/v1/spaces/${S1}/contents/slugs/blog/post-1?token=${TOKEN_V1}&locale=de`);
      expect(response.headers.location).toBe(`/api/v1/spaces/${S1}/contents/slugs/blog/post-1?cv=7&locale=de&token=${TOKEN_V1}`);
    });

    it('answers an unknown slug with 404 Slug not found', async () => {
      const response = await get(`/api/v1/spaces/${S1}/contents/slugs/missing/page?cv=7&token=${TOKEN_V1}`);
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ message: 'Slug not found', status: 'NOT_FOUND' });
    });
  });

  describe('links', () => {
    const links = (query = '') => get(`/api/v1/spaces/${S1}/links?cv=7&token=${TOKEN_PUBLIC}${query}`);

    it('lists every content item as metadata keyed by id', async () => {
      const body = (await links()).json();
      expect(Object.keys(body).map(contentName).sort()).toEqual(['archive', 'blog', 'home', 'old', 'post1', 'post2']);
      expect(body[C.blog]).toEqual({
        id: C.blog,
        kind: 'FOLDER',
        name: 'Blog',
        slug: 'blog',
        fullSlug: 'blog',
        parentSlug: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('selects a folder subtree by prefix, without sibling folders that share it', async () => {
      expect(Object.keys((await links('&parentSlug=blog')).json()).map(contentName).sort()).toEqual(['post1', 'post2']);
    });

    it('filters to direct children and by kind', async () => {
      expect(Object.keys((await links('&excludeChildren=true')).json()).map(contentName).sort()).toEqual(['archive', 'blog', 'home']);
      expect(Object.keys((await links('&excludeChildren=true&kind=FOLDER')).json()).map(contentName).sort()).toEqual(['archive', 'blog']);
    });
  });

  describe('HTTP behaviour', () => {
    it('gzips large JSON responses and marks them as varying on Accept-Encoding', async () => {
      const response = await t.request({
        method: 'GET',
        url: `/api/v1/spaces/${S1}/links?cv=7&token=${TOKEN_PUBLIC}`,
        headers: { 'accept-encoding': 'gzip' },
      });
      expect(response.headers['content-encoding']).toBe('gzip');
      expect(response.headers['vary']).toMatch(/accept-encoding/i);
      expect(Object.keys(JSON.parse(gunzipSync(response.rawPayload).toString()))).toHaveLength(6);
    });

    it('leaves bodies under the 1kb threshold uncompressed', async () => {
      const response = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/links`, headers: { 'accept-encoding': 'gzip' } });
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('allows cross-origin reads of the public API only', async () => {
      const origin = { origin: 'https://www.customer.example' };
      const api = await get(`/api/v1/spaces/${S1}/links?cv=7&token=${TOKEN_PUBLIC}`, origin);
      expect(api.headers['access-control-allow-origin']).toBe('https://www.customer.example');
      const app = await get('/api/auth/me', origin);
      expect(app.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

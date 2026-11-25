import type { APIRequestContext } from '@playwright/test';

import { pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';

// The CDN API's caching contract (docs/cdn-caching.md), end to end through the built server. A request without the
// current cache version (`cv`) is redirected to it (cached shortly: the token's TTL); the versioned URL is cached for
// a week, because a publish moves the version and so the URL. The server tests cover the details; this checks the
// contract a CDN in front of Localess relies on.
test.use({ storageState: { cookies: [], origins: [] } });

const WEEK = 'public, max-age=604800, s-maxage=604800';
const MINUTE = 'public, max-age=60, s-maxage=60';
const YEAR = 'public, max-age=31536000, s-maxage=31536000';

interface Redirect {
  /** The versioned URL (path and query), to request next. */
  location: string;
  cv: string;
  cacheControl: string | undefined;
}

/** The redirect to the current version: a 302 whose Location carries `cv`. */
async function redirectOf(request: APIRequestContext, url: string): Promise<Redirect> {
  const response = await request.get(url, { maxRedirects: 0 });
  expect(response.status(), `${url} redirects to its version`).toBe(302);
  const location = new URL(response.headers()['location'], 'http://localhost');
  const cv = location.searchParams.get('cv');
  expect(cv, 'the Location has a cv').toBeTruthy();
  return { location: `${location.pathname}${location.search}`, cv: cv!, cacheControl: response.headers()['cache-control'] };
}

/** The versioned response: 200, cached for a week, no ETag (the URL changes instead). */
async function expectVersioned(request: APIRequestContext, location: string): Promise<unknown> {
  const response = await request.get(location, { maxRedirects: 0 });
  expect(response.status(), location).toBe(200);
  expect(response.headers()['cache-control']).toBe(WEEK);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()).not.toHaveProperty('etag');
  return response.json();
}

test.describe('CDN API → caching', () => {
  test('translations: a publish moves the version; the old version is redirected, never served @smoke', async ({ api, space, request }) => {
    const translation = await api.createTranslation(space.id, { key: 'cta', locales: { en: 'Buy' } });
    await api.publishTranslations(space.id);
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const url = `/api/v1/spaces/${space.id}/translations/en?token=${token}`;

    // Pre-check: redirected to version A (cached for the token's default minute), served for a week.
    const before = await redirectOf(request, url);
    expect(before.cacheControl).toBe(MINUTE);
    expect(await expectVersioned(request, before.location)).toEqual({ cta: 'Buy' });

    // An edit alone moves nothing.
    await api.send('put', `/api/app/spaces/${space.id}/translations/${translation.id}/locales/en`, { value: 'Buy now' });
    expect((await redirectOf(request, url)).cv).toBe(before.cv);

    // Action: publish.
    await api.publishTranslations(space.id);

    // Post-check: version B serves the change; version A is redirected to B.
    const after = await redirectOf(request, url);
    expect(after.cv).not.toBe(before.cv);
    expect(await expectVersioned(request, after.location)).toEqual({ cta: 'Buy now' });
    expect((await redirectOf(request, before.location)).cv).toBe(after.cv);
  });

  test('contents by id and by slug: a publish moves the version', async ({ api, space, request }) => {
    const schema = await api.createSchema(space.id, { name: uniqueId('page'), type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] });
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'v1' });
    await api.publishContent(space.id, doc.id);
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const urls = [
      `/api/v1/spaces/${space.id}/contents/${doc.id}?token=${token}`,
      `/api/v1/spaces/${space.id}/contents/slugs/home?token=${token}`,
    ];

    // Pre-check
    const before = await Promise.all(urls.map(url => redirectOf(request, url)));
    for (const { location } of before) expect(await expectVersioned(request, location)).toMatchObject({ data: { title: 'v1' } });

    // Action: a new value, published.
    await api.saveDocumentData(space.id, doc, { title: 'v2' });
    for (const [i, url] of urls.entries()) expect((await redirectOf(request, url)).cv, 'unpublished edit').toBe(before[i].cv);
    await api.publishContent(space.id, doc.id);

    // Post-check
    for (const [i, url] of urls.entries()) {
      const after = await redirectOf(request, url);
      expect(after.cv).not.toBe(before[i].cv);
      expect(await expectVersioned(request, after.location)).toMatchObject({ data: { title: 'v2' } });
      expect((await redirectOf(request, before[i].location)).cv).toBe(after.cv);
    }
  });

  test('drafts: an edit moves the draft version only; drafts are cached like published versions', async ({ api, space, request }) => {
    const schema = await api.createSchema(space.id, { name: uniqueId('page'), type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] });
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'v1' });
    await api.publishContent(space.id, doc.id);
    const { token } = await api.createToken(space.id, { name: 'Preview', type: 'preview' });
    const published = `/api/v1/spaces/${space.id}/contents/${doc.id}?token=${token}`;
    const draft = `${published}&version=draft`;

    // Pre-check
    const publishedBefore = await redirectOf(request, published);
    const draftBefore = await redirectOf(request, draft);
    expect(await expectVersioned(request, draftBefore.location)).toMatchObject({ data: { title: 'v1' } });

    // Action: an edit, not published.
    await api.saveDocumentData(space.id, doc, { title: 'v2 (draft)' });

    // Post-check: a new draft version with the edit; the published version stays. The draft is safe to cache for a
    // week too: each edit gets a new version, so an old draft is never served for the current one.
    const draftAfter = await redirectOf(request, draft);
    expect(draftAfter.cv).not.toBe(draftBefore.cv);
    expect(await expectVersioned(request, draftAfter.location)).toMatchObject({ data: { title: 'v2 (draft)' } });
    expect((await redirectOf(request, published)).cv).toBe(publishedBefore.cv);
  });

  test("the redirect follows the token's Cache TTL, for drafts too", async ({ api, space, request }) => {
    await api.createTranslation(space.id, { key: 'cta', locales: { en: 'Buy' } });
    await api.publishTranslations(space.id);
    const { token } = await api.createToken(space.id, { name: 'Preview', type: 'preview', cacheTtl: 0 });
    const url = `/api/v1/spaces/${space.id}/translations/en?token=${token}`;

    expect((await redirectOf(request, url)).cacheControl).toBe('no-cache');
    expect((await redirectOf(request, `${url}&version=draft`)).cacheControl).toBe('no-cache');
  });

  test('not found: an unpublished document for 10 minutes, translations never published not at all', async ({ api, space, request }) => {
    const schema = await api.createSchema(space.id, { name: uniqueId('page'), type: 'ROOT' });
    const doc = await api.createDocument(space.id, { name: 'Draft', slug: 'draft', schema: schema.name });
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });

    const unpublished = await request.get(`/api/v1/spaces/${space.id}/contents/${doc.id}?token=${token}`);
    expect(unpublished.status()).toBe(404);
    expect(unpublished.headers()['cache-control']).toBe('public, max-age=600, s-maxage=600');

    const translations = await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    expect(translations.status()).toBe(404);
    expect(translations.headers()).not.toHaveProperty('cache-control');
  });

  test('assets: cached for a year with an ETag; a matching If-None-Match gets 304', async ({ api, space, request }) => {
    const asset = await api.uploadAsset(space.id, pngFile('logo.png'));
    const base = `/api/v1/spaces/${space.id}/assets/${asset.id}`;

    // The stored file.
    const original = await request.get(`${base}/original`);
    expect(original.status()).toBe(200);
    expect(original.headers()['cache-control']).toBe(YEAR);
    expect(original.headers()['accept-ranges']).toBe('bytes');
    const etag = original.headers()['etag'];
    expect(etag).toMatch(/^"[^"]+-orig"$/);
    const again = await request.get(`${base}/original`, { headers: { 'If-None-Match': etag } });
    expect(again.status()).toBe(304);
    expect(again.headers()['cache-control']).toBe(YEAR);

    // A transformed image: its own ETag.
    const resized = await request.get(`${base}?w=10&f=webp`);
    expect(resized.status()).toBe(200);
    expect(resized.headers()['cache-control']).toBe(YEAR);
    expect(resized.headers()['etag']).toMatch(/^"[^"]+"$/);
    expect(resized.headers()['etag']).not.toBe(etag);

    // A bad transform parameter: refused, cached for an hour.
    const bad = await request.get(`${base}?w=abc`);
    expect(bad.status()).toBe(400);
    expect(bad.headers()['cache-control']).toBe('public, max-age=3600, s-maxage=3600');

    // An unknown asset: not found, cached for a week.
    const unknown = await request.get(`/api/v1/spaces/${space.id}/assets/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/original`);
    expect(unknown.status()).toBe(404);
    expect(unknown.headers()['cache-control']).toBe(WEEK);
  });
});

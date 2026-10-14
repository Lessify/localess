import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contentLinkSnapshots, contentSnapshots, schemas } from '../src/infra/database/schema.js';
import { ContentsService } from '../src/modules/contents/services/contents.service.js';
import { SchemasService } from '../src/modules/schemas/services/schemas.service.js';
import { SpacesService } from '../src/modules/spaces/services/spaces.service.js';
import { seedContent, seedSpace, TOKEN_DRAFT, TOKEN_PUBLIC, TOKEN_READ } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';
import { C, contentName, S1 } from './ids.js';

/**
 * What the public API serves for content (`content_snapshots`, `content_link_snapshots`): each document and each links
 * list answers to its own `cv`, its snapshot's `built_at`, so a draft save never moves a published `cv`, a publish never
 * moves a draft one, and nothing moves with the space.
 */
describe('content snapshots', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
  });

  afterAll(() => t?.close());

  const get = (url: string) => t.request({ method: 'GET', url });
  const documentUrl = (id: string, query = '') => `/api/v1/spaces/${S1}/contents/${id}?token=${TOKEN_DRAFT}${query}`;
  const draftUrl = (id: string, locale = 'en') => documentUrl(id, `&version=draft&locale=${locale}`);
  const linksUrl = (query = '') => `/api/v1/spaces/${S1}/links?token=${TOKEN_DRAFT}${query}`;
  /** The `cv` the redirect names. */
  const cvOf = async (url: string): Promise<string> => {
    const response = await get(url);
    expect(response.statusCode, response.body).toBe(302);
    return new URL(response.headers.location as string, 'https://cms.example.com').searchParams.get('cv')!;
  };
  const follow = async (url: string) => {
    const response = await get(`${url}&cv=${await cvOf(url)}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const snapshots = (version: 'draft' | 'published', contentId?: string) =>
    t.db
      .select()
      .from(contentSnapshots)
      .where(
        and(
          eq(contentSnapshots.spaceId, S1),
          eq(contentSnapshots.version, version),
          ...(contentId ? [eq(contentSnapshots.contentId, contentId)] : []),
        ),
      );
  const linkSnapshots = () => t.db.select().from(contentLinkSnapshots).where(eq(contentLinkSnapshots.spaceId, S1));
  /** Two builds in the same millisecond would share a `cv`. */
  const tick = () => new Promise(resolve => setTimeout(resolve, 5));
  const contents = () => t.app.get(ContentsService);
  const saveData = (id: string, title: string) =>
    contents().updateData(S1, id, { data: { _id: `${id}-root`, _schema: 'page', title }, assets: [], links: [], references: [] });

  describe('documents', () => {
    it('answers a published document with the built_at of its snapshot', async () => {
      expect(await cvOf(documentUrl(C.home, '&locale=de'))).toBe('7');
    });

    it('builds a draft on the first draft request, only for that locale, answering to its built_at', async () => {
      expect(await snapshots('draft')).toEqual([]);
      const cv = await cvOf(draftUrl(C.home, 'de'));
      const rows = await snapshots('draft');
      expect(rows.map(it => [contentName(it.contentId), it.locale])).toEqual([['home', 'de']]);
      expect(String(rows[0].builtAt.getTime())).toBe(cv);
      expect((await follow(draftUrl(C.home, 'de'))).data.title).toBe('Startseite (Entwurf)');
    });

    it('a draft save moves the draft cv of that document only, never a published one', async () => {
      const homeDraft = await cvOf(draftUrl(C.home));
      const postDraft = await cvOf(draftUrl(C.post1));
      await tick();
      await saveData(C.home, 'Home (edited)');
      expect(await snapshots('draft', C.home)).toEqual([]);
      expect(await cvOf(draftUrl(C.home))).not.toBe(homeDraft);
      expect((await follow(draftUrl(C.home))).data.title).toBe('Home (edited)');
      expect(await cvOf(draftUrl(C.post1))).toBe(postDraft);
      expect(await cvOf(documentUrl(C.home))).toBe('7');
    });

    it('a publish writes every locale with one built_at and moves the published cv, never the draft one', async () => {
      const draft = await cvOf(draftUrl(C.post2));
      await tick();
      await contents().publish(S1, C.post2);
      const rows = await snapshots('published', C.post2);
      expect(rows.map(it => it.locale).sort()).toEqual(['de', 'en']);
      expect(new Set(rows.map(it => it.builtAt.getTime())).size).toBe(1);
      expect(await cvOf(documentUrl(C.post2))).toBe(String(rows[0].builtAt.getTime()));
      expect(await cvOf(draftUrl(C.post2))).toBe(draft);
      expect(await cvOf(documentUrl(C.home))).toBe('7');
    });

    it('an unpublish removes the published snapshots', async () => {
      await contents().unpublish(S1, C.post2);
      expect(await snapshots('published', C.post2)).toEqual([]);
      expect((await get(`${documentUrl(C.post2)}&cv=1`)).statusCode).toBe(404);
    });

    it('a schema edit moves no cv', async () => {
      const draft = await cvOf(draftUrl(C.home));
      const [page] = await t.db.select().from(schemas).where(and(eq(schemas.spaceId, S1), eq(schemas.name, 'page')));
      await tick();
      await t.app.get(SchemasService).update(S1, page.id, { displayName: 'Page (renamed)', fields: page.fields ?? [] });
      expect(await cvOf(draftUrl(C.home))).toBe(draft);
      expect(await cvOf(documentUrl(C.home))).toBe('7');
    });

    it('a folder move drops the drafts of the documents under it', async () => {
      await cvOf(draftUrl(C.post1));
      expect(await snapshots('draft', C.post1)).not.toEqual([]);
      await contents().update(S1, C.blog, { slug: 'news' });
      expect(await snapshots('draft', C.post1)).toEqual([]);
      expect((await follow(draftUrl(C.post1))).fullSlug).toBe('news/post-1');
      expect((await follow(linksUrl('&version=draft')))[C.post1]).toMatchObject({ fullSlug: 'news/post-1', parentSlug: 'news' });
      await contents().update(S1, C.blog, { slug: 'blog' });
    });
  });

  describe('space locales', () => {
    it('changing the default locale drops every draft and keeps the published snapshots', async () => {
      await cvOf(draftUrl(C.home));
      const published = await snapshots('published');
      await t.app.get(SpacesService).setDefaultLocale(S1, 'de');
      expect(await snapshots('draft')).toEqual([]);
      expect(await snapshots('published')).toEqual(published);
      await t.app.get(SpacesService).setDefaultLocale(S1, 'en');
    });

    it('removing a locale drops its snapshots, draft and published', async () => {
      await cvOf(draftUrl(C.home, 'de'));
      await t.app.get(SpacesService).removeLocale(S1, 'de');
      const rows = [...(await snapshots('draft')), ...(await snapshots('published'))];
      expect(rows.filter(it => it.locale === 'de')).toEqual([]);
      expect(rows.some(it => it.locale === 'en')).toBe(true);
    });

    it('an added locale stores nothing: published requests get the default locale', async () => {
      await t.app.get(SpacesService).addLocale(S1, 'de');
      expect((await snapshots('published')).filter(it => it.locale === 'de')).toEqual([]);
      expect(await follow(documentUrl(C.home, '&locale=de'))).toMatchObject({ locale: 'en', data: { title: 'Home' } });
    });
  });

  describe('links', () => {
    it('lists every folder and the published documents without `version`, for a public token', async () => {
      const url = `/api/v1/spaces/${S1}/links?token=${TOKEN_PUBLIC}`;
      expect(Object.keys(await follow(url)).map(contentName).sort()).toEqual(['archive', 'blog', 'home', 'post1']);
    });

    it('lists the whole tree with `version`, which needs a preview token', async () => {
      const response = await get(`/api/v1/spaces/${S1}/links?token=${TOKEN_PUBLIC}&version=draft`);
      expect(response.statusCode).toBe(403);
      expect(response.json().details.reason).toMatch(/preview token/);
      expect(Object.keys(await follow(linksUrl('&version=draft'))).map(contentName).sort()).toEqual([
        'archive',
        'blog',
        'home',
        'old',
        'post1',
        'post2',
      ]);
      expect((await get(`/api/v1/spaces/${S1}/links?token=${TOKEN_READ}&version=draft`)).statusCode).toBe(302);
    });

    it('stores one list per version, each answering to its built_at, keeping version in the redirect', async () => {
      const draft = await get(linksUrl('&version=draft&kind=DOCUMENT'));
      expect(draft.headers.location).toMatch(new RegExp(`^/api/v1/spaces/${S1}/links\\?cv=\\d+&kind=DOCUMENT&version=draft&token=`));
      await cvOf(linksUrl());
      const rows = await linkSnapshots();
      expect(rows.map(it => it.version).sort()).toEqual(['draft', 'published']);
      for (const row of rows) {
        expect(await cvOf(linksUrl(row.version === 'draft' ? '&version=draft' : ''))).toBe(String(row.builtAt.getTime()));
      }
    });

    it('a content write drops both lists; a schema edit drops neither', async () => {
      await cvOf(linksUrl());
      await cvOf(linksUrl('&version=draft'));
      const [page] = await t.db.select().from(schemas).where(and(eq(schemas.spaceId, S1), eq(schemas.name, 'page')));
      await t.app.get(SchemasService).update(S1, page.id, { displayName: 'Page', fields: page.fields ?? [] });
      expect(await linkSnapshots()).toHaveLength(2);
      await contents().update(S1, C.post2, { name: 'Post 2 renamed' });
      expect(await linkSnapshots()).toEqual([]);
      expect((await follow(linksUrl('&version=draft')))[C.post2].name).toBe('Post 2 renamed');
    });
  });
});

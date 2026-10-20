import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assets, contents, schemas, spaceLocales, spaces, tokens, translations } from '../src/infra/database/schema.js';
import { SpaceTemplateRepository } from '../src/modules/spaces/repositories/space-template.repository.js';
import { BLOG_TEMPLATE } from '../src/modules/spaces/templates/index.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

const USER_TEMPLATES = ['blog', 'ecommerce', 'marketing'];
const TEST_TEMPLATES = ['translations_large', 'contents_fields', 'assets_large', 'contents_large'];

async function counts(t: TestApp) {
  const rows = async (
    table: typeof spaces | typeof spaceLocales | typeof tokens | typeof schemas | typeof translations | typeof assets | typeof contents,
  ) => (await t.db.select({ n: count() }).from(table))[0].n;
  return {
    assets: await rows(assets),
    contents: await rows(contents),
    spaces: await rows(spaces),
    spaceLocales: await rows(spaceLocales),
    tokens: await rows(tokens),
    schemas: await rows(schemas),
    translations: await rows(translations),
  };
}

/** A CDN GET, following the `cv` redirect once. */
async function cdn(t: TestApp, url: string) {
  const first = await t.request({ method: 'GET', url });
  if (first.statusCode !== 302) return first;
  return t.request({ method: 'GET', url: first.headers.location });
}

describe('app API: space templates', () => {
  describe('with test templates turned on', () => {
    let t: TestApp;
    let admin: ReturnType<typeof api>;

    beforeAll(async () => {
      t = await createTestApp({ LOCALESS_TEST_TEMPLATES: 'true' });
      admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    });

    afterAll(() => t?.close());

    it('lists the template ids in order, test ones last (the web app has their titles and icons)', async () => {
      const response = await admin.get('/api/app/spaces/templates');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([...USER_TEMPLATES, ...TEST_TEMPLATES]);
    });

    it('creates the large translations space: three locales, 10,000 drafts, nothing published', async () => {
      const response = await admin.post('/api/app/spaces', { name: 'Large', template: 'translations_large' });
      expect(response.statusCode).toBe(201);
      const space = response.json();
      expect(space.spaceLocales.map((it: { localeId: string }) => it.localeId)).toEqual(['en', 'de', 'fr']);
      expect(space.defaultLocale.id).toBe('en');
      expect((await t.db.select({ n: count() }).from(translations).where(eq(translations.spaceId, space.id)))[0].n).toBe(10_000);
      const [row] = await t.db.select().from(translations).where(eq(translations.key, 'section07.page12.title'));
      expect(row).toMatchObject({
        spaceId: space.id,
        locales: { en: 'Title of section 7, page 12 (en)', de: 'Title of section 7, page 12 (de)', fr: 'Title of section 7, page 12 (fr)' },
        labels: ['checkout'],
        description: 'Page 12 of section 7',
      });

      const [token] = (await admin.get(`/api/app/spaces/${space.id}/tokens`)).json();
      const base = `/api/v1/spaces/${space.id}/translations`;
      for (const locale of ['en', 'de', 'fr']) {
        expect((await cdn(t, `${base}/${locale}?token=${token.token}`)).statusCode).toBe(404);
      }
      const draft = await cdn(t, `${base}/de?version=draft&token=${token.token}`);
      expect(draft.statusCode).toBe(200);
      expect(draft.json()['section07.page12.title']).toBe('Title of section 7, page 12 (de)');
    });
  });

  describe('with test templates turned off (production)', () => {
    let t: TestApp;
    let admin: ReturnType<typeof api>;
    let manager: ReturnType<typeof api>;
    let designer: ReturnType<typeof api>;
    let reader: ReturnType<typeof api>;

    beforeAll(async () => {
      t = await createTestApp();
      admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
      manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] }));
      designer = api(
        t,
        await userWithAccess(t, 'designer@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT', 'SCHEMA_CREATE'] }),
      );
      reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'CUSTOM', permissions: ['SCHEMA_CREATE', 'CONTENT_CREATE'] }));
    });

    afterAll(() => t?.close());

    it('lists no test template', async () => {
      expect((await admin.get('/api/app/spaces/templates')).json()).toEqual(USER_TEMPLATES);
    });

    it('offers every template to whoever may create a space (SPACE_MANAGEMENT), and none to anyone else', async () => {
      expect((await manager.get('/api/app/spaces/templates')).json()).toEqual(USER_TEMPLATES);
      expect((await designer.get('/api/app/spaces/templates')).json()).toEqual(USER_TEMPLATES);
      expect((await reader.get('/api/app/spaces/templates')).statusCode).toBe(403);
    });

    it('creates the space alone without a template: default locale and preview token, nothing else', async () => {
      const before = await counts(t);
      const response = await designer.post('/api/app/spaces', { name: 'Plain' });
      expect(response.statusCode).toBe(201);
      expect(response.json().spaceLocales.map((it: { localeId: string }) => it.localeId)).toEqual(['en']);
      expect(await counts(t)).toEqual({
        ...before,
        spaces: before.spaces + 1,
        spaceLocales: before.spaceLocales + 1,
        tokens: before.tokens + 1,
      });
    });

    it('creates a space from the Blog template in one request', async () => {
      const response = await designer.post('/api/app/spaces', { name: 'Blog', template: 'blog' });
      expect(response.statusCode).toBe(201);
      const id = response.json().id;
      const names = (await admin.get(`/api/app/spaces/${id}/schemas`)).json().map((it: { name: string }) => it.name);
      expect(names.sort()).toEqual(['author', 'blogpost', 'blogtag', 'category']);
      const list = (await admin.get(`/api/app/spaces/${id}/tokens`)).json();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ type: 'preview' });
    });

    it('refuses an unknown template, and a test template while turned off', async () => {
      const before = await counts(t);
      expect((await admin.post('/api/app/spaces', { name: 'Nope', template: 'NOPE' })).statusCode).toBe(400);
      expect((await admin.post('/api/app/spaces', { name: 'Nope', template: 'EMPTY' })).statusCode).toBe(400);
      const test = await admin.post('/api/app/spaces', { name: 'Nope', template: 'translations_large' });
      expect(test.statusCode).toBe(400);
      expect(test.json().message).toBe('Unknown template');
      expect(await counts(t)).toEqual(before);
    });

    it('needs only the permission to create a space: a template asks for nothing more', async () => {
      expect((await manager.post('/api/app/spaces', { name: 'Blog too', template: 'blog' })).statusCode).toBe(201);
      const before = await counts(t);
      expect((await reader.post('/api/app/spaces', { name: 'Nope', template: 'blog' })).statusCode).toBe(403);
      expect((await reader.post('/api/app/spaces', { name: 'Nope' })).statusCode).toBe(403);
      expect(await counts(t)).toEqual(before);
    });

    it('rolls back everything when the template fails', async () => {
      const before = await counts(t);
      await expect(
        t.app.get(SpaceTemplateRepository).createSpace('Broken', { ...BLOG_TEMPLATE, locales: ['xx-not-a-locale'] }),
      ).rejects.toThrow();
      expect(await counts(t)).toEqual(before);
    });

    it('refuses a template that repeats a key across its assets and contents, writing nothing', async () => {
      const before = await counts(t);
      const broken = {
        ...BLOG_TEMPLATE,
        assets: [{ key: 'shared', kind: 'FOLDER' as const, name: 'Shared' }],
        contents: [{ key: 'shared', kind: 'FOLDER' as const, name: 'Shared', slug: 'shared' }],
      };
      await expect(t.app.get(SpaceTemplateRepository).createSpace('Broken', broken)).rejects.toThrow('Duplicate template key: shared');
      expect(await counts(t)).toEqual(before);
    });
  });
});

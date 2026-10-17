import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemas, spaceLocales, spaces, tokens, translations } from '../src/infra/database/schema.js';
import { SpaceTemplatesRepository } from '../src/modules/spaces/repositories/space-templates.repository.js';
import { BLOG_TEMPLATE } from '../src/modules/spaces/templates/index.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

const USER_TEMPLATES = ['EMPTY', 'BLOG', 'ECOMMERCE', 'MARKETING'];

async function counts(t: TestApp) {
  const rows = async (table: typeof spaces | typeof spaceLocales | typeof tokens | typeof schemas | typeof translations) =>
    (await t.db.select({ n: count() }).from(table))[0].n;
  return {
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
  return t.request({ method: 'GET', url: first.headers.location as string });
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

    it('lists the templates in order, test ones last', async () => {
      const response = await admin.get('/api/app/spaces/templates');
      expect(response.statusCode).toBe(200);
      const list = response.json();
      expect(list.map((it: { id: string }) => it.id)).toEqual([...USER_TEMPLATES, 'TRANSLATIONS_LARGE']);
      for (const it of list) expect(Object.keys(it).sort()).toEqual(['description', 'icon', 'id', 'name']);
      expect(list[4]).toEqual({
        id: 'TRANSLATIONS_LARGE',
        name: 'Translations (large)',
        description: '10,000 translated keys in English, German and French. For testing.',
        icon: 'lucideLanguages',
      });
    });

    it('creates the large translations space: three locales, 10,000 drafts, nothing published', async () => {
      const response = await admin.post('/api/app/spaces', { name: 'Large', template: 'TRANSLATIONS_LARGE' });
      expect(response.statusCode).toBe(201);
      const space = response.json();
      expect(space.locales.map((it: { id: string }) => it.id)).toEqual(['en', 'de', 'fr']);
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

    beforeAll(async () => {
      t = await createTestApp();
      admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
      manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] }));
      designer = api(
        t,
        await userWithAccess(t, 'designer@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT', 'SCHEMA_CREATE'] }),
      );
    });

    afterAll(() => t?.close());

    it('lists no test template', async () => {
      const ids = (await admin.get('/api/app/spaces/templates')).json().map((it: { id: string }) => it.id);
      expect(ids).toEqual(USER_TEMPLATES);
    });

    it('offers only Empty without SCHEMA_CREATE', async () => {
      expect((await manager.get('/api/app/spaces/templates')).json().map((it: { id: string }) => it.id)).toEqual(['EMPTY']);
      expect((await designer.get('/api/app/spaces/templates')).json().map((it: { id: string }) => it.id)).toEqual(USER_TEMPLATES);
    });

    it('creates a space from the Blog template in one request', async () => {
      const response = await designer.post('/api/app/spaces', { name: 'Blog', template: 'BLOG' });
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
      const unknown = await admin.post('/api/app/spaces', { name: 'Nope', template: 'NOPE' });
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json().message).toBe('Unknown template');
      const test = await admin.post('/api/app/spaces', { name: 'Nope', template: 'TRANSLATIONS_LARGE' });
      expect(test.statusCode).toBe(400);
      expect(await counts(t)).toEqual(before);
    });

    it('refuses a template to a user without SCHEMA_CREATE, but not Empty', async () => {
      const before = await counts(t);
      expect((await manager.post('/api/app/spaces', { name: 'Nope', template: 'BLOG' })).statusCode).toBe(403);
      expect(await counts(t)).toEqual(before);
      expect((await manager.post('/api/app/spaces', { name: 'Plain', template: 'EMPTY' })).statusCode).toBe(201);
      expect((await manager.post('/api/app/spaces', { name: 'Plain too' })).statusCode).toBe(201);
    });

    it('rolls back everything when the template fails', async () => {
      const before = await counts(t);
      await expect(
        t.app.get(SpaceTemplatesRepository).createSpace('Broken', { ...BLOG_TEMPLATE, locales: ['xx-not-a-locale'] }),
      ).rejects.toThrow();
      expect(await counts(t)).toEqual(before);
    });
  });
});

import { and, count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contents, spaces } from '../src/infra/database/schema.js';
import { SpacesService } from '../src/modules/spaces/services/spaces.service.js';
import { CONTENTS_LARGE_TEMPLATE } from '../src/modules/spaces/templates/index.js';
import { orphansOf } from './orphans.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/** A CDN GET, following the `cv` redirect once. */
async function cdn(t: TestApp, url: string) {
  const first = await t.request({ method: 'GET', url });
  if (first.statusCode !== 302) return first;
  return t.request({ method: 'GET', url: first.headers.location as string });
}

describe('app API: the large contents template (CONTENTS_LARGE)', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_TEST_TEMPLATES: 'true' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
  });

  afterAll(() => t?.close());

  it('creates 2,000 documents and 67 folders in one request, under 3 seconds', async () => {
    const started = Date.now();
    const response = await admin.post('/api/app/spaces', { name: 'Contents', template: 'CONTENTS_LARGE' });
    expect(response.statusCode, response.body).toBe(201);
    expect(Date.now() - started).toBeLessThan(3_000);
    const space = response.json();

    const kinds = await t.db
      .select({ kind: contents.kind, n: count() })
      .from(contents)
      .where(eq(contents.spaceId, space.id))
      .groupBy(contents.kind);
    expect(Object.fromEntries(kinds.map(it => [it.kind, it.n]))).toEqual({ DOCUMENT: 2_000, FOLDER: 67 });

    const [post] = await t.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, space.id), eq(contents.name, 'Post 2024-06-03')));
    const [previous] = await t.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, space.id), eq(contents.name, 'Post 2024-06-02')));
    expect(post.references).toEqual([previous.id]);
    expect(post.data).toMatchObject({ title: 'Post 2024-06-03', related: { kind: 'REFERENCE', uri: previous.id } });

    const [token] = (await admin.get(`/api/app/spaces/${space.id}/tokens`)).json();
    const links = (await cdn(t, `/api/v1/spaces/${space.id}/links?version=draft&token=${token.token}`)).json();
    expect(Object.keys(links)).toHaveLength(2_067);
    const published = (await cdn(t, `/api/v1/spaces/${space.id}/links?kind=DOCUMENT&token=${token.token}`)).json();
    expect(Object.keys(published)).toHaveLength(0);
    expect(await orphansOf(t, space.id)).toEqual([]);
  });

  it('leaves no rows when the create fails', async () => {
    const before = (await t.db.select({ n: count() }).from(contents))[0].n;
    const spacesBefore = (await t.db.select({ n: count() }).from(spaces))[0].n;
    const broken = {
      ...CONTENTS_LARGE_TEMPLATE,
      contents: [...CONTENTS_LARGE_TEMPLATE.contents!, { key: 'bad', kind: 'FOLDER' as const, name: 'Bad', slug: 'bad', parent: 'nope' }],
    };
    await expect(t.app.get(SpacesService).createFromTemplate('Broken', broken)).rejects.toThrow('Unknown template key: nope');
    expect((await t.db.select({ n: count() }).from(contents))[0].n).toBe(before);
    expect((await t.db.select({ n: count() }).from(spaces))[0].n).toBe(spacesBefore);
  });
});

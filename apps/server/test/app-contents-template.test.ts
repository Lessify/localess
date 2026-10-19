import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { count, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, schemas, spaceLocales, spaces, storageDeletions, tokens, translations } from '../src/infra/database/schema.js';
import { SpaceService } from '../src/modules/spaces/services/space.service.js';
import { CONTENTS_FIELDS_TEMPLATE } from '../src/modules/spaces/templates/index.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { orphansOf, storedAssetDirs } from './orphans.js';
import { api, createTestApp, insertsByTable, statementsDuring, TestApp, userWithAccess } from './test-app.js';

// One app in this file: image metadata is read by a process-wide exiftool, which closing an app ends.

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
  return t.request({ method: 'GET', url: first.headers.location as string });
}

describe('app API: the contents template (CONTENTS_FIELDS)', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_TEST_TEMPLATES: 'true' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
  });

  afterAll(() => t?.close());

  it('creates files, rows and drafts in one request, nothing published', async ({ annotate }) => {
    const started = Date.now();
    const { result: response, statements } = await statementsDuring(() =>
      admin.post('/api/app/spaces', { name: 'Fields', template: 'CONTENTS_FIELDS' }),
    );
    expect(response.statusCode, response.body).toBe(201);
    // One insert for all the contents and one for all the assets, whatever this machine's speed.
    expect(insertsByTable(statements)).toMatchObject({ contents: 1, assets: 1 });
    expect(statements.length).toBeLessThan(50);
    await annotate(`created in ${Date.now() - started} ms, ${statements.length} statements`);
    const space = response.json();
    expect(space.spaceLocales.map((it: { localeId: string }) => it.localeId)).toEqual(['en', 'de', 'fr']);

    // Files: a Media folder with the three, stored, the images with their dimensions.
    const base = `/api/app/spaces/${space.id}/assets`;
    const root = (await admin.get(`${base}?parentId=`)).json();
    expect(root.map((it: { name: string }) => it.name)).toEqual(['Media']);
    const files = (await admin.get(`${base}?parentId=${root[0].id}`)).json() as {
      id: string;
      name: string;
      extension: string;
      metadata?: Record<string, unknown>;
    }[];
    expect(files.map(it => `${it.name}${it.extension}`).sort()).toEqual(['blue.jpg', 'readme.txt', 'red.png']);
    // Read as an upload's would be (exiftool, then sharp): the PNG and the JPEG path both.
    expect(files.find(it => it.name === 'red')?.metadata).toEqual({
      type: 'image',
      format: 'png',
      width: 64,
      height: 48,
      orientation: 'landscape',
      hasAlpha: false,
    });
    expect(files.find(it => it.name === 'blue')?.metadata).toEqual({
      type: 'image',
      format: 'jpg',
      width: 32,
      height: 32,
      orientation: 'squarish',
      hasAlpha: false,
    });
    expect(files.find(it => it.name === 'readme')?.metadata ?? {}).toEqual({});
    expect((await storedAssetDirs(t, space.id)).sort()).toEqual(files.map(it => it.id).sort());

    // Contents: the tree, all drafts.
    const all = (await admin.get(`/api/app/spaces/${space.id}/contents`)).json() as { id: string; name: string; publishedAt?: string }[];
    expect(all.map(it => it.name).sort()).toEqual(
      ['All fields (plain)', 'All fields (translated)', 'Alpha', 'Beta', 'Fields', 'Gamma', 'Nested page', 'Targets'].sort(),
    );
    for (const it of all) expect(it.publishedAt).toBeUndefined();
    const id = (name: string) => all.find(it => it.name === name)!.id;

    const [token] = (await admin.get(`/api/app/spaces/${space.id}/tokens`)).json();
    const doc = (name: string, query: string) => cdn(t, `/api/v1/spaces/${space.id}/contents/${id(name)}?token=${token.token}${query}`);
    expect((await doc('All fields (plain)', '')).statusCode).toBe(404);
    const plainDe = (await doc('All fields (plain)', '&version=draft&locale=de')).json();
    expect(plainDe.data).toMatchObject({ text: 'Plain text', number: 7, reference: { kind: 'REFERENCE', uri: id('Alpha') } });
    const translatedDe = (await doc('All fields (translated)', '&version=draft&locale=de')).json();
    expect(translatedDe.data).toMatchObject({ text: 'Text (de)', number: 20 });
    const translatedEn = (await doc('All fields (translated)', '&version=draft&locale=en&resolveAsset=true')).json();
    expect(Object.keys(translatedEn.assets ?? {})).toContain(files.find(it => it.name === 'red')!.id);
    expect(await orphansOf(t, space.id)).toEqual([]);
  });

  it('rolls back a contents template that fails after storing its files', async () => {
    const before = await counts(t);
    const broken = {
      ...CONTENTS_FIELDS_TEMPLATE,
      contents: [
        ...CONTENTS_FIELDS_TEMPLATE.contents!,
        { key: 'bad', kind: 'DOCUMENT' as const, name: 'Bad', slug: 'bad', parent: 'nope', schema: 'target' },
      ],
    };
    await expect(t.app.get(SpaceService).createFromTemplate('Broken', broken)).rejects.toThrow('Unknown template key: nope');
    expect(await counts(t)).toEqual(before);
    await t.app.get(StorageSweeperService).whenIdle();
    const spaceIds = new Set((await t.db.select({ id: spaces.id }).from(spaces)).map(it => it.id));
    const leftovers = (await readdir(join(t.storageDir, 'spaces')).catch(() => [])).filter(it => !spaceIds.has(it));
    expect(leftovers).toEqual([]);
    expect(await t.db.select().from(storageDeletions).where(like(storageDeletions.prefix, 'spaces/%'))).toEqual([]);
  });
});

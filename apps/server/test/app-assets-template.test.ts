import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { count, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, spaces, storageDeletions } from '../src/infra/database/schema.js';
import { SpacesService } from '../src/modules/spaces/services/spaces.service.js';
import { ASSETS_LARGE_TEMPLATE } from '../src/modules/spaces/templates/index.js';
import { STORAGE_DRIVER, type StorageDriver } from '../src/infra/storage/storage.driver.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { orphansOf, storedAssetDirs } from './orphans.js';
import { api, createTestApp, insertsByTable, statementsDuring, TestApp, userWithAccess } from './test-app.js';

// One app in this file: image metadata is read by a process-wide exiftool, which closing an app ends.

describe('app API: the large assets template (ASSETS_LARGE)', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_TEST_TEMPLATES: 'true' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
  });

  afterAll(() => t?.close());

  const rows = async () => ({
    spaces: (await t.db.select({ n: count() }).from(spaces))[0].n,
    assets: (await t.db.select({ n: count() }).from(assets))[0].n,
    contents: (await t.db.select({ n: count() }).from(contents))[0].n,
  });

  it('creates 1,000 files in Bulk in one request, the rows and upload guards in chunks', async ({ annotate }) => {
    const started = Date.now();
    const { result: response, statements } = await statementsDuring(() =>
      admin.post('/api/app/spaces', { name: 'Assets', template: 'ASSETS_LARGE' }),
    );
    expect(response.statusCode, response.body).toBe(201);
    // How the rows are written, not how fast this machine is: 1,003 asset rows and their upload guards in chunks of
    // 1,000 (one statement per file took 8.1 s).
    expect(insertsByTable(statements)).toMatchObject({ assets: 2, storage_deletions: 2 });
    expect(statements.length).toBeLessThan(50);
    await annotate(`created in ${Date.now() - started} ms, ${statements.length} statements`);
    const space = response.json();

    const base = `/api/app/spaces/${space.id}/assets`;
    const root = (await admin.get(`${base}?parentId=`)).json() as { id: string; name: string }[];
    expect(root.map(it => it.name)).toEqual(['Bulk', 'Empty', 'Nested']);
    const bulk = (await admin.get(`${base}?parentId=${root[0].id}`)).json() as {
      name: string;
      type: string;
      size: number;
      metadata?: Record<string, unknown>;
    }[];
    expect(bulk).toHaveLength(1_000);
    expect(bulk.filter(it => it.type === 'image/png')).toHaveLength(100);
    expect(bulk.find(it => it.name === 'file-0010')?.metadata).toMatchObject({ width: 16, height: 16 });
    expect(bulk.find(it => it.name === 'file-0999')).toMatchObject({ type: 'text/plain', size: 999 });
    expect(await storedAssetDirs(t, space.id)).toHaveLength(1_002);
    expect(await orphansOf(t, space.id)).toEqual([]);
  });

  it('leaves no file behind when one store fails while others in its batch are still writing', async () => {
    const storage = t.app.get<StorageDriver>(STORAGE_DRIVER);
    const put = storage.put.bind(storage);
    let calls = 0;
    // The 5th store fails at once; the others of the batch finish later, after the failure is known.
    storage.put = async (key, data) => {
      calls++;
      if (calls === 5) throw new Error('disk full');
      await new Promise(resolve => setTimeout(resolve, 300));
      return put(key, data);
    };
    try {
      await expect(t.app.get(SpacesService).createFromTemplate('Failing', ASSETS_LARGE_TEMPLATE)).rejects.toThrow('disk full');
    } finally {
      storage.put = put;
    }
    // Long enough for every delayed store of the batch to have landed.
    await new Promise(resolve => setTimeout(resolve, 600));
    await t.app.get(StorageSweeperService).whenIdle();
    const spaceIds = new Set((await t.db.select({ id: spaces.id }).from(spaces)).map(it => it.id));
    const strays = (await readdir(join(t.storageDir, 'spaces')).catch(() => [])).filter(it => !spaceIds.has(it));
    // Either nothing is left, or what is left is still guarded (the sweeper removes it when the guard expires).
    const guarded = new Set((await t.db.select().from(storageDeletions)).map(it => it.spaceId));
    expect(strays.filter(it => !guarded.has(it))).toEqual([]);
  });

  it('rolls back and removes every stored file when the create fails', async () => {
    const before = await rows();
    const broken = {
      ...ASSETS_LARGE_TEMPLATE,
      contents: [
        ...ASSETS_LARGE_TEMPLATE.contents!,
        { key: 'bad', kind: 'DOCUMENT' as const, name: 'Bad', slug: 'bad', parent: 'nope', schema: 'gallery' },
      ],
    };
    await expect(t.app.get(SpacesService).createFromTemplate('Broken', broken)).rejects.toThrow('Unknown template key: nope');
    expect(await rows()).toEqual(before);
    await t.app.get(StorageSweeperService).whenIdle();
    const spaceIds = new Set((await t.db.select({ id: spaces.id }).from(spaces)).map(it => it.id));
    expect((await readdir(join(t.storageDir, 'spaces')).catch(() => [])).filter(it => !spaceIds.has(it))).toEqual([]);
    expect(await t.db.select().from(storageDeletions).where(like(storageDeletions.prefix, 'spaces/%'))).toEqual([]);
  });
});

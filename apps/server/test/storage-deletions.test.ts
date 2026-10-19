import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { newUuid } from '../src/infra/database/id.js';
import { storageDeletions } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, type StorageDriver } from '../src/infra/storage/storage.driver.js';
import { AssetRepository } from '../src/modules/assets/repositories/asset.repository.js';
import { AssetService } from '../src/modules/assets/services/asset.service.js';
import { SpaceService } from '../src/modules/spaces/services/space.service.js';
import { StorageDeletionRepository } from '../src/shared/repositories/storage-deletion.repository.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { createTestApp, insertSpace, TestApp } from './test-app.js';
import { S1 } from './ids.js';

/**
 * Stored files are deleted through the `storage_deletions` queue: a delete queues them in its transaction and the
 * sweeper removes them, so a crash or a storage failure never leaves files no row points at.
 */
describe('storage deletions', () => {
  let t: TestApp;
  let assets: AssetService;
  let sweeper: StorageSweeperService;
  let storage: StorageDriver;

  beforeAll(async () => {
    t = await createTestApp();
    await insertSpace(t.db, { id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }] });
    assets = t.app.get(AssetService);
    sweeper = t.app.get(StorageSweeperService);
    storage = t.app.get<StorageDriver>(STORAGE_DRIVER);
  });

  afterEach(() => vi.restoreAllMocks());
  afterAll(() => t?.close());

  const upload = (name: string, parentId: string | null = null, spaceId = S1) =>
    assets.upload(spaceId, {
      parentId,
      file: Readable.from(Buffer.from(`bytes of ${name}`)),
      filename: `${name}.txt`,
      mimetype: 'text/plain',
    });
  const exists = async (key: string) =>
    stat(join(t.storageDir, key)).then(
      () => true,
      () => false,
    );
  const queue = () => t.db.select().from(storageDeletions).orderBy(storageDeletions.prefix);
  /** Makes every queued entry due now. */
  const due = () => t.db.update(storageDeletions).set({ notBefore: sql`now() - interval '1 second'` });

  it('queues the files of a deleted file and deletes them right after the commit', async () => {
    const file = await upload('a');
    expect(await exists(`spaces/${S1}/assets/${file.id}/original`)).toBe(true);
    await assets.remove(S1, file.id);
    await sweeper.whenIdle();
    expect(await exists(`spaces/${S1}/assets/${file.id}`)).toBe(false);
    expect(await queue()).toEqual([]);
  });

  it('keeps a failed deletion queued with its error, and a later sweep deletes the files', async () => {
    const file = await upload('b');
    vi.spyOn(storage, 'deletePrefix').mockRejectedValueOnce(new Error('disk unavailable'));
    await assets.remove(S1, file.id);
    await sweeper.whenIdle();
    const [entry] = await queue();
    expect(entry).toMatchObject({
      prefix: `spaces/${S1}/assets/${file.id}/`,
      assetId: file.id,
      attempts: 1,
      lastError: 'disk unavailable',
    });
    expect(entry.notBefore.getTime()).toBeGreaterThan(Date.now());
    expect(await exists(`spaces/${S1}/assets/${file.id}/original`)).toBe(true);

    await due();
    await sweeper.sweep();
    expect(await exists(`spaces/${S1}/assets/${file.id}`)).toBe(false);
    expect(await queue()).toEqual([]);
  });

  it('queues one entry per file under a deleted folder', async () => {
    const folder = await assets.createFolder(S1, null, 'Folder');
    const one = await upload('one', folder.id);
    const two = await upload('two', folder.id);
    vi.spyOn(sweeper, 'kick').mockImplementation(() => undefined);
    await assets.remove(S1, folder.id);
    expect((await queue()).map(it => it.assetId).sort()).toEqual([one.id, two.id].sort());

    await sweeper.sweep();
    expect(await exists(`spaces/${S1}/assets/${one.id}`)).toBe(false);
    expect(await exists(`spaces/${S1}/assets/${two.id}`)).toBe(false);
    expect(await queue()).toEqual([]);
  });

  it('queues the whole directory of a deleted space', async () => {
    const spaceId = newUuid();
    await insertSpace(t.db, { id: spaceId, name: 'Gone', locales: [{ id: 'en', name: 'English' }] });
    const file = await upload('c', null, spaceId);
    vi.spyOn(sweeper, 'kick').mockImplementation(() => undefined);
    await t.app.get(SpaceService).remove(spaceId);
    expect(await queue()).toEqual([expect.objectContaining({ prefix: `spaces/${spaceId}/`, spaceId, assetId: null })]);

    await sweeper.sweep();
    expect(await exists(`spaces/${spaceId}/assets/${file.id}`)).toBe(false);
    expect(await exists(`spaces/${spaceId}`)).toBe(false);
    expect(await queue()).toEqual([]);
  });

  it('leaves no entry after an upload', async () => {
    const file = await upload('d');
    expect(await queue()).toEqual([]);
    await assets.remove(S1, file.id);
    await sweeper.whenIdle();
  });

  it('cleans up after an upload that died after storing its file, once its hour has passed', async () => {
    // The row is never written and the immediate cleanup fails too: the upload's guard entry is all that is left.
    vi.spyOn(t.app.get(AssetRepository), 'createFile').mockRejectedValueOnce(new Error('connection lost'));
    vi.spyOn(storage, 'deletePrefix').mockRejectedValueOnce(new Error('connection lost'));
    await expect(upload('e')).rejects.toThrow('connection lost');
    const [entry] = await queue();
    expect(entry.notBefore.getTime()).toBeGreaterThan(Date.now() + 55 * 60 * 1000);
    expect(await exists(`spaces/${S1}/assets/${entry.assetId}/original`)).toBe(true);

    await sweeper.sweep();
    expect(await queue()).toHaveLength(1);
    await due();
    await sweeper.sweep();
    expect(await exists(`spaces/${S1}/assets/${entry.assetId}`)).toBe(false);
    expect(await queue()).toEqual([]);
  });

  it('keeps the files of a queued prefix whose asset exists (again)', async () => {
    const file = await upload('f');
    await t.db.insert(storageDeletions).values({ prefix: `spaces/${S1}/assets/${file.id}/`, spaceId: S1, assetId: file.id });
    await sweeper.sweep();
    expect(await queue()).toEqual([]);
    expect(await exists(`spaces/${S1}/assets/${file.id}/original`)).toBe(true);
    await assets.remove(S1, file.id);
    await sweeper.whenIdle();
  });

  it('never lets two sweepers take the same entry', async () => {
    const ids = Array.from({ length: 6 }, () => newUuid());
    for (const id of ids) {
      await storage.put(`spaces/${S1}/assets/${id}/original`, Readable.from(Buffer.from('orphan')));
      await t.db.insert(storageDeletions).values({ prefix: `spaces/${S1}/assets/${id}/`, spaceId: S1, assetId: id });
    }
    const deleted: string[] = [];
    const real = storage.deletePrefix.bind(storage);
    vi.spyOn(storage, 'deletePrefix').mockImplementation(async prefix => {
      deleted.push(prefix);
      await new Promise(resolve => setTimeout(resolve, 20));
      return real(prefix);
    });
    // A second instance: its own sweeper over the same database.
    const other = new StorageSweeperService(t.app.get(StorageDeletionRepository), storage);
    await Promise.all([sweeper.sweep(), other.sweep()]);
    expect(deleted.sort()).toEqual(ids.map(id => `spaces/${S1}/assets/${id}/`).sort());
    expect(await queue()).toEqual([]);
    await t.db.delete(storageDeletions).where(eq(storageDeletions.spaceId, S1));
  });
});

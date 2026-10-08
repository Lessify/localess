import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import archiver from 'archiver';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsStorageDriver } from '../storage/fs-storage.driver.js';
import { EntryTooLargeError, openZip, writeZip } from './zip.js';

describe('zip helpers', () => {
  let root: string;
  let storage: FsStorageDriver;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'localess-zip-'));
    storage = new FsStorageDriver(root);
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  it('round-trips inline and streamed entries through storage', async () => {
    const size = await writeZip(storage, 'k/export.zip', [
      { name: 'metadata.json', content: JSON.stringify({ kind: 'ASSET' }) },
      { name: 'assets/a1', content: () => Readable.from([Buffer.from('file bytes')]) },
    ]);
    expect(size).toBe((await storage.stat('k/export.zip'))?.size);
    const zip = await openZip(storage, 'k/export.zip');
    expect(await zip.readJson('metadata.json', 1000)).toEqual({ kind: 'ASSET' });
    expect(await text(zip.open('assets/a1', 1000)!)).toBe('file bytes');
    expect(zip.has('assets/missing')).toBe(false);
    expect(await zip.readJson('missing.json', 1000)).toBeUndefined();
  });

  it('caps entries by their actual inflated size, not the declared one', async () => {
    await writeZip(storage, 'bomb.zip', [{ name: 'contents.json', content: JSON.stringify({ x: 'a'.repeat(100_000) }) }]);
    const zip = await openZip(storage, 'bomb.zip');
    await expect(zip.readJson('contents.json', 10_000)).rejects.toBeInstanceOf(EntryTooLargeError);
  });

  it('never touches the filesystem: traversal names inside an archive are inert', async () => {
    const archive = archiver('zip');
    archive.append('evil', { name: '../../outside.txt' });
    archive.append('{}', { name: 'metadata.json' });
    const done = storage.put('evil.zip', archive);
    await archive.finalize();
    await done;
    const zip = await openZip(storage, 'evil.zip');
    expect(await zip.readJson('metadata.json', 1000)).toEqual({});
    // Nothing was extracted anywhere: the storage root still holds only the archive itself.
    const { readdir } = await import('node:fs/promises');
    expect(await readdir(root)).toEqual(['evil.zip']);
    expect(await readdir(join(root, '..'))).not.toContain('outside.txt');
  });

  it('rejects files that are not zips', async () => {
    await storage.put('not.zip', Buffer.from('definitely not a zip'));
    await expect(openZip(storage, 'not.zip')).rejects.toThrow();
  });
});

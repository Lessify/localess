import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FsStorageDriver } from './fs-storage.driver.js';
import { withLocalFile } from './local-file.js';

describe('withLocalFile', () => {
  let root: string;
  let storage: FsStorageDriver;
  const key = 'spaces/s1/assets/a1/Fotó été.jpg';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'localess-storage-'));
    storage = new FsStorageDriver(root);
    await storage.put(key, Buffer.from('bytes'));
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  /** Temporary copies `withLocalFile` made and left, in the OS temp folder. */
  const copies = async () => (await readdir(tmpdir())).filter(it => it.startsWith('localess-file-'));

  it('gives the stored file itself when the driver keeps one: nothing is copied', async () => {
    const before = await copies();
    const path = await withLocalFile(storage, key, async it => it);
    expect(path).toBe(join(root, 'spaces/s1/assets/a1/Fotó été.jpg'));
    expect(await copies()).toEqual(before);
  });

  it('copies the object for a driver without files, and removes the copy afterwards, even on a failure', async () => {
    // Like an S3-compatible driver: the same objects, no file of its own to give.
    const remote = new (class extends FsStorageDriver {
      override localPath(): undefined {
        return undefined;
      }
    })(root);
    const before = await copies();

    let seen = '';
    const bytes = await withLocalFile(remote, key, async path => {
      seen = path;
      return (await readFile(path)).toString();
    });
    expect(bytes).toBe('bytes');
    expect(seen.startsWith(join(root))).toBe(false);
    await expect(
      withLocalFile(remote, key, () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await copies()).toEqual(before);
  });
});

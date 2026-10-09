import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { text } from 'node:stream/consumers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsStorageDriver } from './fs-storage.driver.js';

describe('FsStorageDriver', () => {
  let root: string;
  let storage: FsStorageDriver;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'localess-storage-'));
    storage = new FsStorageDriver(root);
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it('stores buffers and streams, reporting size and a base64 md5 like GCS', async () => {
    const bytes = Buffer.from('hello localess');
    const info = await storage.put('spaces/s1/assets/a1/original', bytes);
    expect(info).toEqual({ size: bytes.length, md5: createHash('md5').update(bytes).digest('base64') });

    const streamed = await storage.put('spaces/s1/assets/a2/original', Readable.from([Buffer.from('a'), Buffer.from('b')]));
    expect(streamed.size).toBe(2);
    expect((await storage.read('spaces/s1/assets/a2/original')).toString()).toBe('ab');
  });

  it('leaves no temp files behind', async () => {
    await storage.put('k/file', Buffer.from('x'));
    expect(await readdir(join(root, 'k'))).toEqual(['file']);
  });

  it('stats existing and missing objects', async () => {
    await storage.put('a/b', Buffer.from('123'));
    expect(await storage.stat('a/b')).toEqual({ size: 3 });
    expect(await storage.stat('a/missing')).toBeUndefined();
    expect(await storage.stat('a')).toBeUndefined();
  });

  it('reads byte ranges', async () => {
    await storage.put('r', Buffer.from('0123456789'));
    expect(await text(storage.createReadStream('r', { start: 2, end: 5 }))).toBe('2345');
  });

  it('deletes objects and prefixes, tolerating missing ones', async () => {
    await storage.put('spaces/s1/assets/a1/original', Buffer.from('1'));
    await storage.put('spaces/s1/assets/a1/renditions/x', Buffer.from('22'));
    await storage.put('spaces/s2/assets/a1/original', Buffer.from('333'));
    expect(await storage.sizeOfPrefix('spaces/s1/')).toBe(3);

    await storage.delete('spaces/s1/assets/a1/original');
    await storage.delete('spaces/s1/assets/a1/original');
    await storage.deletePrefix('spaces/s1/');
    await storage.deletePrefix('spaces/nope/');
    expect(await storage.stat('spaces/s1/assets/a1/renditions/x')).toBeUndefined();
    expect(await storage.stat('spaces/s2/assets/a1/original')).toEqual({ size: 3 });
    expect(await storage.sizeOfPrefix('spaces/s1/')).toBe(0);
  });

  it('moves objects into new folders', async () => {
    await storage.put('spaces/s1/tasks/tmp/1', Buffer.from('zip'));
    await storage.move('spaces/s1/tasks/tmp/1', 'spaces/s1/tasks/t1/original');
    expect(await storage.stat('spaces/s1/tasks/tmp/1')).toBeUndefined();
    expect((await storage.read('spaces/s1/tasks/t1/original')).toString()).toBe('zip');
  });

  it.each(['../outside', 'a/../../outside', '/etc/passwd', '', 'a/\0b', '.'])('refuses the key %j', async key => {
    await expect(storage.put(key, Buffer.from('x'))).rejects.toThrow(/Invalid storage key/);
    await expect(storage.stat(key)).rejects.toThrow(/Invalid storage key/);
  });
});

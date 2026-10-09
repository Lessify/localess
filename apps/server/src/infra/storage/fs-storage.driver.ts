import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ByteRange, StorageDriver, StoredObjectInfo } from './storage.driver.js';

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === 'ENOENT';

/** Objects as files under a root directory (default `$LOCALESS_DATA_DIR/storage`). */
export class FsStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  /** Resolves a key inside the root, refusing anything that would escape it. */
  private path(key: string): string {
    if (!key || key.includes('\0')) throw new Error(`Invalid storage key '${key}'`);
    const path = resolve(this.root, key);
    const rel = relative(this.root, path);
    if (!rel || rel.startsWith('..') || rel.split(sep).includes('..') || resolve(this.root, rel) !== path) {
      throw new Error(`Invalid storage key '${key}'`);
    }
    return path;
  }

  async put(key: string, data: Buffer | Readable): Promise<StoredObjectInfo> {
    const target = this.path(key);
    await mkdir(dirname(target), { recursive: true });
    // Write to a sibling temp file and rename, so readers never see a half-written object.
    const temp = `${target}.${randomBytes(6).toString('hex')}.tmp`;
    const hash = createHash('md5');
    let size = 0;
    const meter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        size += chunk.length;
        callback(null, chunk);
      },
    });
    try {
      await pipeline(Buffer.isBuffer(data) ? Readable.from([data]) : data, meter, createWriteStream(temp));
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    return { size, md5: hash.digest('base64') };
  }

  async stat(key: string): Promise<{ size: number } | undefined> {
    try {
      const info = await stat(this.path(key));
      return info.isFile() ? { size: info.size } : undefined;
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  createReadStream(key: string, range?: ByteRange): Readable {
    return createReadStream(this.path(key), range ? { start: range.start, end: range.end } : undefined);
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.path(key));
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    // Prefixes are folder-shaped in practice (`spaces/{id}/`); a partial last segment is not supported.
    await rm(this.path(prefix.replace(/\/+$/, '')), { recursive: true, force: true });
  }

  async move(from: string, to: string): Promise<void> {
    const target = this.path(to);
    await mkdir(dirname(target), { recursive: true });
    await rename(this.path(from), target);
  }

  async sizeOfPrefix(prefix: string): Promise<number> {
    const walk = async (dir: string): Promise<number> => {
      let total = 0;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isMissing(error)) return 0;
        throw error;
      }
      for (const entry of entries) {
        const path = join(dir, entry.name);
        total += entry.isDirectory() ? await walk(path) : (await stat(path)).size;
      }
      return total;
    };
    return walk(this.path(prefix.replace(/\/+$/, '')));
  }
}

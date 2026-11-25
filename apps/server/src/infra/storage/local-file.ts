import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import type { StorageDriver } from './storage.driver.js';

/**
 * Runs `use` with a path to the stored object, for the tools that read files (exiftool, ffmpeg): the object's own file
 * when the driver keeps one (`localPath`), else a temporary copy, removed afterwards. `use` must only read the path.
 */
export async function withLocalFile<T>(storage: StorageDriver, key: string, use: (path: string) => Promise<T>): Promise<T> {
  const local = storage.localPath(key);
  if (local) return use(local);
  const dir = await mkdtemp(join(tmpdir(), 'localess-file-'));
  try {
    const copy = join(dir, 'original');
    await pipeline(storage.createReadStream(key), createWriteStream(copy));
    return await use(copy);
  } finally {
    // A copy left behind (Windows holding it a moment) only takes temporary space: it must not fail the caller.
    await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => undefined);
  }
}

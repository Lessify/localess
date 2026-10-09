import { PassThrough, Readable, Transform } from 'node:stream';
import { json } from 'node:stream/consumers';
import archiver from 'archiver';
import unzipper from 'unzipper';
import type { StorageDriver } from '../storage/storage.driver.js';

export interface ZipEntry {
  name: string;
  /** Inline content, or a factory opening a stream (opened one at a time, while archiving). */
  content: string | Buffer | (() => Readable);
}

/** Builds a zip (zlib level 9, as before) straight into storage. Returns the stored size. */
export async function writeZip(storage: StorageDriver, key: string, entries: ZipEntry[]): Promise<number> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = new PassThrough();
  archive.pipe(output);
  const stored = storage.put(key, output);
  const failed = new Promise<never>((_, reject) => archive.on('error', reject));
  for (const entry of entries) {
    archive.append(typeof entry.content === 'function' ? entry.content() : entry.content, { name: entry.name });
  }
  await Promise.race([archive.finalize(), failed]);
  return (await Promise.race([stored, failed])).size;
}

/** Thrown when an entry inflates past its cap (zip bomb, or simply too large). */
export class EntryTooLargeError extends Error {}

/** Passes bytes through until `maxBytes`, then fails: a zip's declared sizes can't be trusted. */
export function capped(maxBytes: number, name: string): Transform {
  let seen = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      seen += chunk.length;
      if (seen > maxBytes) callback(new EntryTooLargeError(`'${name}' is larger than ${maxBytes} bytes`));
      else callback(null, chunk);
    },
  });
}

export interface ZipReader {
  has(name: string): boolean;
  /** Parsed JSON of an entry, or undefined when the archive has no such entry. */
  readJson<T = unknown>(name: string, maxBytes: number): Promise<T | undefined>;
  /** A capped stream of an entry, or undefined when absent. */
  open(name: string, maxBytes: number): Readable | undefined;
}

/**
 * Opens a stored zip without copying it to disk (random access through the storage driver). Only
 * entries asked for by exact name are ever read, so paths like `../../x` inside the archive are inert.
 */
export async function openZip(storage: StorageDriver, key: string): Promise<ZipReader> {
  const stat = await storage.stat(key);
  if (!stat) throw new Error('The task file is missing');
  const directory = await unzipper.Open.custom({
    size: async () => stat.size,
    stream: (offset: number, length?: number) =>
      storage.createReadStream(key, {
        start: offset,
        end: length === undefined ? stat.size - 1 : Math.min(stat.size - 1, offset + length - 1),
      }),
  });
  const files = new Map(directory.files.filter(file => file.type === 'File').map(file => [file.path, file]));
  const open = (name: string, maxBytes: number): Readable | undefined => {
    const file = files.get(name);
    return file ? file.stream().pipe(capped(maxBytes, name)) : undefined;
  };
  return {
    has: name => files.has(name),
    open,
    async readJson<T>(name: string, maxBytes: number): Promise<T | undefined> {
      const stream = open(name, maxBytes);
      return stream ? ((await json(stream)) as T) : undefined;
    },
  };
}

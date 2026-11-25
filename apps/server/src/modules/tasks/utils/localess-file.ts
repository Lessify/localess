import { Readable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

import {
  LOCALESS_FILE_FORMAT,
  LOCALESS_FILE_VERSION,
  type LocalessFileKind,
  type LocalessManifest,
  type TaskExportMetadata,
} from '@localess/shared';
import { zLocalessManifest } from '@localess/shared/zod';
import archiver from 'archiver';

import type { StorageDriver } from '../../../infra/storage/storage.driver.js';
import { MAX_JSON_BYTES } from './task.utils.js';
import { openZip, type ZipReader } from './zip.js';

/** The JSON Lines entry of each kind. */
export const LINES_ENTRY = { TRANSLATION: 'translations.jsonl', SCHEMA: 'schemas.jsonl' } as const satisfies Record<
  LocalessFileKind,
  string
>;
/** The one JSON array of each kind in the old (Firebase-era) archive, next to its `metadata.json`. */
const LEGACY_ENTRY = { TRANSLATION: 'translations.json', SCHEMA: 'schemas.json' } as const satisfies Record<LocalessFileKind, string>;

const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_LINE_BYTES = 1024 * 1024;
/** A JSON Lines entry may inflate up to this much (a zip bomb stops here). */
const MAX_LINES_BYTES = 4 * 1024 * 1024 * 1024;

/** The file is not one this build can read: not a zip, not a Localess export, a newer version, a broken line. */
export class LocalessFileError extends Error {}

/** An opened `.localess.zip` (or an old archive): its kind, and its entities, one per line, readable more than once. */
export interface LocalessFile {
  kind: LocalessFileKind;
  /** An old `.llt.zip` / `.lls.zip`: one JSON array, read whole. */
  legacy: boolean;
  /** The manifest's count (absent in an old archive). */
  count?: number;
  lines(): AsyncIterable<{ index: number; value: unknown }>;
}

/**
 * Streams a `.localess.zip` into storage: `manifest.json` first, then `entry` with one JSON line per item of `lines`.
 * Returns the stored size.
 */
export async function writeLocalessFile(
  storage: StorageDriver,
  key: string,
  manifest: Omit<LocalessManifest, 'format' | 'version' | 'exportedAt'>,
  entry: string,
  lines: AsyncIterable<object>,
): Promise<number> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stored = storage.put(key, archive);
  const content = Readable.from(
    (async function* () {
      for await (const line of lines) yield `${JSON.stringify(line)}\n`;
    })(),
  );
  // A failed read (the database, mid-export) stops the archive, which fails the storage write too.
  const failed = new Promise<never>((_, reject) => {
    archive.on('error', reject);
    content.on('error', error => {
      archive.destroy(error);
      reject(error);
    });
  });
  // Every promise here is awaited or caught: a failure ends the export, never the process.
  stored.catch(() => undefined);
  failed.catch(() => undefined);
  const full: LocalessManifest = {
    format: LOCALESS_FILE_FORMAT,
    version: LOCALESS_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    ...manifest,
  };
  archive.append(JSON.stringify(full), { name: 'manifest.json' });
  archive.append(content, { name: entry });
  const [, info] = await Promise.race([Promise.all([archive.finalize(), stored]), failed]);
  return info.size;
}

/** Opens a stored `.localess.zip`, or an old archive with `metadata.json`. Throws `LocalessFileError` for anything else. */
export async function openLocalessFile(storage: StorageDriver, key: string): Promise<LocalessFile> {
  let zip: ZipReader;
  try {
    zip = await openZip(storage, key);
  } catch {
    throw new LocalessFileError('It is not a Localess export file.');
  }
  if (zip.has('manifest.json')) {
    const raw = await zip.readJson<Partial<LocalessManifest>>('manifest.json', MAX_MANIFEST_BYTES).catch(() => undefined);
    if (raw?.format === LOCALESS_FILE_FORMAT && raw.version !== LOCALESS_FILE_VERSION) {
      throw new LocalessFileError(`The file is of version ${String(raw.version)}; this server reads version ${LOCALESS_FILE_VERSION}.`);
    }
    const manifest = zLocalessManifest.safeParse(raw);
    if (!manifest.success) throw new LocalessFileError('It is not a Localess export file.');
    const { kind, count } = manifest.data;
    return { kind, legacy: false, count, lines: () => jsonLines(zip, LINES_ENTRY[kind]) };
  }
  const metadata = await zip.readJson<TaskExportMetadata>('metadata.json', MAX_MANIFEST_BYTES).catch(() => undefined);
  if (metadata?.kind === 'TRANSLATION' || metadata?.kind === 'SCHEMA') {
    const kind = metadata.kind;
    return { kind, legacy: true, lines: () => legacyLines(zip, kind) };
  }
  throw new LocalessFileError('It is not a Localess export file.');
}

/**
 * The text lines of a byte stream, the last one included (empty when the stream ends with a newline). Bytes are decoded
 * across chunks, so a character split between two chunks stays whole. A line longer than `maxBytes` characters fails.
 */
export async function* splitLines(chunks: AsyncIterable<Buffer>, maxBytes: number): AsyncIterable<string> {
  const decoder = new StringDecoder('utf8');
  let buffered = '';
  let lineNumber = 0;
  for await (const chunk of chunks) {
    buffered += decoder.write(chunk);
    let newline = buffered.indexOf('\n');
    while (newline >= 0) {
      lineNumber++;
      yield buffered.slice(0, newline);
      buffered = buffered.slice(newline + 1);
      newline = buffered.indexOf('\n');
    }
    if (buffered.length > maxBytes) throw new LocalessFileError(`line ${lineNumber + 1}: longer than ${maxBytes / 1024 / 1024} MB.`);
  }
  yield buffered + decoder.end();
}

/** The entry's lines, parsed one at a time (memory stays flat); an empty line is skipped. */
async function* jsonLines(zip: ZipReader, entry: string): AsyncIterable<{ index: number; value: unknown }> {
  const stream = zip.open(entry, MAX_LINES_BYTES);
  if (!stream) throw new LocalessFileError(`The file has no ${entry}.`);
  let index = 0;
  let lineNumber = 0;
  try {
    for await (const line of splitLines(stream as AsyncIterable<Buffer>, MAX_LINE_BYTES)) {
      lineNumber++;
      if (!line.trim()) continue;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        throw new LocalessFileError(`${entry}, line ${lineNumber}: not JSON.`);
      }
      yield { index: index++, value };
    }
  } catch (error) {
    if (error instanceof LocalessFileError && !error.message.startsWith(entry)) throw new LocalessFileError(`${entry}, ${error.message}`);
    throw error;
  }
}

/** An old archive's array, read whole, each element in the new shape: `id` → `key` (translations) or `name` (schemas). */
async function* legacyLines(zip: ZipReader, kind: LocalessFileKind): AsyncIterable<{ index: number; value: unknown }> {
  const raw = await zip.readJson<unknown>(LEGACY_ENTRY[kind], MAX_JSON_BYTES);
  if (!Array.isArray(raw)) throw new LocalessFileError(`The file has no ${LEGACY_ENTRY[kind]}.`);
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') {
      yield { index, value: item };
      continue;
    }
    // `type` was the Firebase-era translation type; translations have none now.
    const { id, type, ...rest } = item as Record<string, unknown>;
    yield { index, value: kind === 'TRANSLATION' ? { key: id, ...rest } : { name: id, type, ...rest } };
  }
}

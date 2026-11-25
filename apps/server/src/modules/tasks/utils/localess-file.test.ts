import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import archiver from 'archiver';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FsStorageDriver } from '../../../infra/storage/fs-storage.driver.js';
import { LocalessFileError, openLocalessFile, splitLines, writeLocalessFile } from './localess-file.js';

async function* lines<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) yield item;
}

async function collect(file: Awaited<ReturnType<typeof openLocalessFile>>): Promise<{ index: number; value: unknown }[]> {
  const out: { index: number; value: unknown }[] = [];
  for await (const line of file.lines()) out.push(line);
  return out;
}

describe('.localess.zip', () => {
  let root: string;
  let storage: FsStorageDriver;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'localess-file-'));
    storage = new FsStorageDriver(root);
  });
  afterEach(() => rm(root, { recursive: true, force: true }));

  /** A zip of these entries, stored under `key`. */
  async function storeZip(key: string, entries: Record<string, string>): Promise<void> {
    const archive = archiver('zip');
    const chunks: Buffer[] = [];
    archive.on('data', chunk => chunks.push(chunk));
    for (const [name, content] of Object.entries(entries)) archive.append(content, { name });
    await archive.finalize();
    await storage.put(key, Buffer.concat(chunks));
  }

  const source = { spaceId: 's1', spaceName: 'Site', locales: ['en', 'de'] };

  it('writes the manifest and one JSON line per entity, and reads them back twice', async () => {
    const values = [
      { key: 'a', locales: { en: 'A' } },
      { key: 'b', locales: {} },
      { key: 'c', locales: { de: 'C' } },
    ];
    const size = await writeLocalessFile(storage, 'f.zip', { kind: 'TRANSLATION', source, count: 3 }, 'translations.jsonl', lines(values));
    expect(size).toBe((await storage.stat('f.zip'))?.size);
    const file = await openLocalessFile(storage, 'f.zip');
    expect(file).toMatchObject({ kind: 'TRANSLATION', legacy: false, count: 3 });
    const expected = values.map((value, index) => ({ index, value }));
    expect(await collect(file)).toEqual(expected);
    expect(await collect(file)).toEqual(expected);
  });

  it('reads an old Firebase-era archive, mapping its ids to keys and names', async () => {
    await storeZip('old-t.zip', {
      'metadata.json': JSON.stringify({ kind: 'TRANSLATION' }),
      'translations.json': JSON.stringify([{ id: 'a.b', type: 'STRING', locales: { en: 'A' }, labels: ['ui'] }]),
    });
    const translations = await openLocalessFile(storage, 'old-t.zip');
    expect(translations).toMatchObject({ kind: 'TRANSLATION', legacy: true });
    expect(await collect(translations)).toEqual([{ index: 0, value: { key: 'a.b', locales: { en: 'A' }, labels: ['ui'] } }]);

    await storeZip('old-s.zip', {
      'metadata.json': JSON.stringify({ kind: 'SCHEMA' }),
      'schemas.json': JSON.stringify([{ id: 'page', type: 'ROOT', fields: [] }]),
    });
    expect(await collect(await openLocalessFile(storage, 'old-s.zip'))).toEqual([
      { index: 0, value: { name: 'page', type: 'ROOT', fields: [] } },
    ]);
  });

  it('refuses what is not a Localess file', async () => {
    await storage.put('not.zip', Buffer.from('not a zip'));
    await expect(openLocalessFile(storage, 'not.zip')).rejects.toBeInstanceOf(LocalessFileError);
    await storeZip('other.zip', { 'readme.txt': 'hi' });
    await expect(openLocalessFile(storage, 'other.zip')).rejects.toBeInstanceOf(LocalessFileError);
    await storeZip('newer.zip', { 'manifest.json': JSON.stringify({ format: 'localess', version: 2, kind: 'SCHEMA' }) });
    await expect(openLocalessFile(storage, 'newer.zip')).rejects.toThrow(/version/);
  });

  it('names the line that is not JSON', async () => {
    await storeZip('bad.zip', {
      'manifest.json': JSON.stringify({ format: 'localess', version: 1, kind: 'TRANSLATION', exportedAt: 'x', source, count: 2 }),
      'translations.jsonl': '{"key":"a","locales":{}}\n{not json\n',
    });
    await expect(collect(await openLocalessFile(storage, 'bad.zip'))).rejects.toThrow(/line 2/);
  });
});

describe('splitLines', () => {
  it('keeps a character whose bytes fall in two chunks', async () => {
    const bytes = Buffer.from('{"key":"a","locales":{"de":"Grüße 日本"}}\n');
    const at = bytes.indexOf(Buffer.from('ü')) + 1; // inside the two bytes of ü
    async function* chunks(): AsyncIterable<Buffer> {
      yield bytes.subarray(0, at);
      yield bytes.subarray(at);
    }
    const lines: string[] = [];
    for await (const line of splitLines(chunks(), 1024)) lines.push(line);
    expect(lines).toEqual(['{"key":"a","locales":{"de":"Grüße 日本"}}', '']);
  });
});

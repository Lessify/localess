import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../config/config.js';
import { createSecretBox, SecretBoxUnavailableError, SecretUnreadableError } from './secret-box.js';

const KEY = 'k'.repeat(32);
const dirs: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'localess-secret-'));
  dirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    await chmod(dir, 0o700).catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  }
});

describe('createSecretBox', () => {
  it('opens what it sealed, with a fresh IV each time', async () => {
    const box = await createSecretBox(loadConfig({ LOCALESS_SECRET_KEY: KEY, LOCALESS_DATA_DIR: await tempDir() }));
    const sealed = box.seal('x', 'deepl');
    expect(sealed).toMatch(/^v1\./);
    expect(box.open(sealed, 'deepl')).toBe('x');
    expect(box.seal('x', 'deepl')).not.toBe(sealed);
  });

  it('refuses another integration id or another key', async () => {
    const dataDir = await tempDir();
    const box = await createSecretBox(loadConfig({ LOCALESS_SECRET_KEY: KEY, LOCALESS_DATA_DIR: dataDir }));
    const sealed = box.seal('secret', 'deepl');
    expect(() => box.open(sealed, 'unsplash')).toThrow(SecretUnreadableError);
    const other = await createSecretBox(loadConfig({ LOCALESS_SECRET_KEY: 'o'.repeat(32), LOCALESS_DATA_DIR: dataDir }));
    expect(() => other.open(sealed, 'deepl')).toThrow(SecretUnreadableError);
    expect(() => box.open('garbage', 'deepl')).toThrow(SecretUnreadableError);
  });

  it('generates secret.key (mode 0600) in the data dir once and reads it back', async () => {
    const dataDir = await tempDir();
    const first = await createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }));
    expect(first.available).toBe(true);
    expect((await stat(join(dataDir, 'secret.key'))).mode & 0o777).toBe(0o600);
    const second = await createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }));
    expect(second.open(first.seal('v', 'unsplash'), 'unsplash')).toBe('v');
  });

  it('is unavailable, without throwing, when the data dir is not writable and no key is set', async () => {
    const dataDir = await tempDir();
    await chmod(dataDir, 0o500);
    const box = await createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }));
    expect(box.available).toBe(false);
    expect(box.reason).toMatch(/LOCALESS_SECRET_KEY/);
    expect(() => box.seal('v', 'deepl')).toThrow(SecretBoxUnavailableError);
  });

  it('refuses an empty or truncated secret.key instead of using it as a key', async () => {
    const dataDir = await tempDir();
    await writeFile(join(dataDir, 'secret.key'), '');
    const empty = await createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }));
    expect(empty.available).toBe(false);
    expect(empty.reason).toMatch(/secret\.key/);
    await writeFile(join(dataDir, 'secret.key'), 'short\n');
    expect((await createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }))).available).toBe(false);
  });

  it('gives instances generating the key at the same time one and the same key', async () => {
    const dataDir = await tempDir();
    const boxes = await Promise.all(Array.from({ length: 8 }, () => createSecretBox(loadConfig({ LOCALESS_DATA_DIR: dataDir }))));
    expect(boxes.every(it => it.available)).toBe(true);
    const sealed = boxes[0].seal('v', 'deepl');
    for (const box of boxes) expect(box.open(sealed, 'deepl')).toBe('v');
  });
});

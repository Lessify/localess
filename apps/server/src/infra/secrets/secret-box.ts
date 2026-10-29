import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { AppConfig } from '../config/config.js';

export const SECRET_BOX = Symbol('SECRET_BOX');

/** Saving a secret while the box has no key (data dir not writable, no LOCALESS_SECRET_KEY). */
export class SecretBoxUnavailableError extends Error {}

/** A sealed value this box can't open: another key, another integration id, or damaged data. */
export class SecretUnreadableError extends Error {}

/**
 * Encrypts the integration keys saved in the UI (AES-256-GCM, a random IV per value, the integration id as associated
 * data). Protects them in a database dump or backup; not from someone who controls the server, who can read the secret.
 */
export interface SecretBox {
  readonly available: boolean;
  /** Why the box is unavailable, for the admin. */
  readonly reason?: string;
  seal(plain: string, aad: string): string;
  open(sealed: string, aad: string): string;
}

const VERSION = 'v1';
const SECRET_FILE = 'secret.key';

/** Where the generated secret lives. */
export const secretFile = (dataDir: string): string => join(dataDir, SECRET_FILE);

/**
 * The secret from LOCALESS_SECRET_KEY, else `$LOCALESS_DATA_DIR/secret.key`, generated there when missing (unless
 * `create` is false: the health check reads, never writes).
 */
export async function createSecretBox(config: Pick<AppConfig, 'secretKey' | 'dataDir'>, create = true): Promise<SecretBox> {
  if (config.secretKey) return keyBox(config.secretKey);
  const path = secretFile(config.dataDir);
  try {
    return keyBox(create ? await readOrCreateSecret(path) : await readSecret(path));
  } catch (error) {
    const reason = `Can't read or create ${path} (${(error as NodeJS.ErrnoException).code ?? 'error'}): keep the data directory writable and persistent, or set LOCALESS_SECRET_KEY.`;
    return unavailableBox(reason);
  }
}

/** A secret shorter than this is not used (as LOCALESS_SECRET_KEY's minimum): an empty or cut file would be a known key. */
const SECRET_MIN_LENGTH = 32;

async function readSecret(path: string): Promise<string> {
  const secret = (await readFile(path, 'utf8')).trim();
  if (secret.length < SECRET_MIN_LENGTH) throw Object.assign(new Error(`${path} is empty or too short`), { code: 'ESHORT' });
  return secret;
}

async function readOrCreateSecret(path: string): Promise<string> {
  try {
    return await readSecret(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await mkdir(dirname(path), { recursive: true });
  // Written whole to a file of its own, then linked into place: another instance never reads it half written, and
  // `link` fails (EEXIST) when one was first, whose key everyone then uses.
  const temporary = `${path}.${process.pid}.${randomBytes(4).toString('hex')}`;
  await writeFile(temporary, `${randomBytes(32).toString('base64')}\n`, { mode: 0o600, flag: 'wx' });
  try {
    await link(temporary, path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
  return readSecret(path);
}

function keyBox(secret: string): SecretBox {
  const key = createHash('sha256').update(secret, 'utf8').digest();
  return {
    available: true,
    seal(plain, aad) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(aad, 'utf8'));
      const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
      return [VERSION, iv, cipher.getAuthTag(), data].map(it => (typeof it === 'string' ? it : it.toString('base64url'))).join('.');
    },
    open(sealed, aad) {
      const [version, iv, tag, data] = sealed.split('.');
      if (version !== VERSION || !iv || !tag || data === undefined) throw new SecretUnreadableError('Unknown sealed value');
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
        decipher.setAAD(Buffer.from(aad, 'utf8'));
        decipher.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
      } catch {
        throw new SecretUnreadableError('The sealed value cannot be opened with this key');
      }
    },
  };
}

function unavailableBox(reason: string): SecretBox {
  return {
    available: false,
    reason,
    seal() {
      throw new SecretBoxUnavailableError(reason);
    },
    open() {
      throw new SecretUnreadableError(reason);
    },
  };
}

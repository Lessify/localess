import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { count, eq } from 'drizzle-orm';
import type { AppConfig } from '../config/config.js';
import type { Database } from '../database/database.module.js';
import { users } from '../database/schema.js';
import type { StorageDriver } from '../storage/storage.driver.js';

export type CheckStatus = 'ok' | 'warn' | 'fail';
export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

/**
 * What a self-hosted install has and lacks (replaces the GCP-oriented `localess:check`). Runs after
 * the CLI context booted, so the database is reachable and migrated by the time this runs.
 */
export async function runChecks(config: AppConfig, db: Database, storage: StorageDriver): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const add = (name: string, status: CheckStatus, detail: string) => results.push({ name, status, detail });

  add(
    'database',
    'ok',
    'url' in config.database
      ? 'reachable, migrations applied'
      : `embedded Postgres in ${config.database.embedded.dataDir}, migrations applied`,
  );

  const [{ admins }] = await db.select({ admins: count() }).from(users).where(eq(users.role, 'admin'));
  add(
    'admin user',
    admins > 0 ? 'ok' : 'fail',
    admins > 0 ? `${admins} admin(s)` : 'none — create one with `admin:create --email <email>`',
  );

  try {
    const key = `.localess-check-${process.pid}`;
    await storage.put(key, Buffer.from('ok'));
    await storage.delete(key);
    add('storage', 'ok', `writable (${config.storageDir})`);
  } catch (error) {
    add('storage', 'fail', `not writable (${config.storageDir}): ${error instanceof Error ? error.message : error}`);
  }

  try {
    await promisify(execFile)(config.ffmpegPath ?? 'ffmpeg', ['-version']);
    add('ffmpeg', 'ok', 'available (video thumbnails)');
  } catch {
    add('ffmpeg', 'warn', 'not found — video thumbnails will fail (install ffmpeg or set LOCALESS_FFMPEG_PATH)');
  }

  const providers = Object.keys(config.auth.providers);
  add(
    'oauth sign-in',
    config.auth.misconfigured.length ? 'warn' : 'ok',
    [providers.length ? `enabled: ${providers.join(', ')}` : 'email + password only', ...config.auth.misconfigured].join('; '),
  );
  add(
    'password reset email',
    config.smtp ? 'ok' : 'warn',
    config.smtp ? 'SMTP configured' : 'no SMTP — admins create reset links in Admin → Users',
  );
  add(
    'machine translation',
    config.translate.provider === 'none' ? 'warn' : 'ok',
    config.translate.provider === 'none' ? 'not configured (DEEPL_API_KEY or GOOGLE_CLOUD_PROJECT)' : config.translate.provider,
  );
  add('unsplash', config.unsplash ? 'ok' : 'warn', config.unsplash ? 'configured' : 'not configured (UNSPLASH_API_KEY)');
  if (!config.publicUrl) add('public url', 'warn', 'LOCALESS_PUBLIC_URL unset — links use the request origin (set it behind a proxy)');
  return results;
}

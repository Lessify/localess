import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { INTEGRATIONS } from '@localess/shared';
import { count, eq } from 'drizzle-orm';

import type { AppConfig } from '../infra/config/config.js';
import type { Database } from '../infra/database/database.module.js';
import { integrationSettings, users } from '../infra/database/schema.js';
import { createSecretBox, secretFile } from '../infra/secrets/secret-box.js';
import type { StorageDriver } from '../infra/storage/storage.driver.js';
import type { IntegrationSettingEntity } from '../shared/entities/integration-setting.entity.js';
import { errorMessage } from '../shared/utils/error-message.js';

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

  const [{ admins }] = await db.select({ admins: count() }).from(users).where(eq(users.role, 'ADMIN'));
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
    add('storage', 'fail', `not writable (${config.storageDir}): ${errorMessage(error)}`);
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
  results.push(...(await integrationChecks(config, db)));
  if (!config.publicUrl) add('public url', 'warn', 'LOCALESS_PUBLIC_URL unset — links use the request origin (set it behind a proxy)');
  return results;
}

/**
 * One row per integration (env, UI, UI (not verified), key rejected, quota reached, key unreadable, switched off, off),
 * and the secret that encrypts the keys saved in the UI.
 */
async function integrationChecks(config: AppConfig, db: Database): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const rows = new Map((await db.select().from(integrationSettings)).map(it => [it.id, it]));
  const box = await createSecretBox(config, false);
  const opens = (row: IntegrationSettingEntity) => {
    try {
      box.open(row.secrets, row.id);
      return true;
    } catch {
      return false;
    }
  };
  for (const definition of INTEGRATIONS) {
    const row = rows.get(definition.id);
    const add = (status: CheckStatus, detail: string) => results.push({ name: definition.name, status, detail });
    if (config.integrationEnv[definition.id]) add('ok', `env (${definition.lockEnv.join(', ')})`);
    else if (!row) add('warn', `off (connect it in Admin → Settings → Integrations, or set ${definition.lockEnv.join(', ')})`);
    else if (!opens(row)) add('warn', 'key unreadable: enter it again, or restore LOCALESS_SECRET_KEY / secret.key');
    else if (!row.enabled) add('warn', 'UI, switched off');
    else if (row.status === 'unverified') add('warn', 'UI (not verified)');
    else if (row.status === 'rejected') add('warn', `key rejected${row.statusMessage ? `: ${row.statusMessage}` : ''}`);
    else if (row.status === 'quota') add('warn', `quota reached${row.statusMessage ? `: ${row.statusMessage}` : ''}`);
    else add('ok', 'UI');
  }
  if (config.secretKey) results.push({ name: 'secret key', status: 'ok', detail: 'LOCALESS_SECRET_KEY' });
  else if (box.available) {
    results.push({
      name: 'secret key',
      status: 'warn',
      detail: `generated in ${secretFile(config.dataDir)}: keep the data directory persistent, and back it up apart from the database`,
    });
  } else {
    results.push({ name: 'secret key', status: 'ok', detail: 'not needed yet (generated when a key is first saved in the UI)' });
  }
  return results;
}

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import pg from 'pg';
import { inject } from 'vitest';

import { MIGRATIONS_FOLDER } from '../src/infra/database/migrate.js';

/** How many migrations a database gets up to date with: the entries of the Drizzle journal. */
export const MIGRATION_COUNT: number = (
  JSON.parse(readFileSync(join(MIGRATIONS_FOLDER, 'meta/_journal.json'), 'utf8')) as { entries: unknown[] }
).entries.length;

export interface TestDatabase {
  url: string;
  drop(): Promise<void>;
}

/** Creates an empty, unmigrated database on the shared test cluster. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = inject('pgAdminUrl');
  const name = `test_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database "${name}"`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    async drop() {
      const client = new pg.Client({ connectionString: adminUrl });
      await client.connect();
      await client.query(`drop database if exists "${name}" with (force)`);
      await client.end();
    },
  };
}

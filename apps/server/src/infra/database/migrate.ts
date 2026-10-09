import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Pool } from 'pg';

export const MIGRATIONS_FOLDER = join(import.meta.dirname, '../../../drizzle');

// Arbitrary constant shared by every Localess instance, so concurrent boots migrate one at a time.
const MIGRATION_LOCK_ID = 7_210_431;

/** Applies pending Drizzle migrations. Safe to call on every boot and from several instances at once. */
export async function migrateDatabase(pool: Pool, migrationsFolder = MIGRATIONS_FOLDER): Promise<void> {
  const logger = new Logger('Migrations');
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    try {
      await migrate(drizzle(client), { migrationsFolder });
      logger.log('Database schema is up to date');
    } finally {
      await client.query('select pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

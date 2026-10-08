import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, TestDatabase } from '../../test/database.js';
import { migrateDatabase } from './migrate.js';

const EXPECTED_TABLES = [
  'assets',
  'content_published',
  'contents',
  'password_reset_tokens',
  'schemas',
  'sessions',
  'settings',
  'spaces',
  'task_logs',
  'tasks',
  'tokens',
  'translation_published',
  'translations',
  'user_credentials',
  'user_identities',
  'users',
  'webhook_logs',
  'webhooks',
];

describe('migrateDatabase', () => {
  let db: TestDatabase;
  let pool: pg.Pool;

  beforeEach(async () => {
    db = await createTestDatabase();
    pool = new pg.Pool({ connectionString: db.url });
  });

  afterEach(async () => {
    await pool.end();
    await db.drop();
  });

  const tables = async (): Promise<string[]> =>
    (
      await pool.query<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'public' order by 1`)
    ).rows.map(r => r.table_name);

  it('creates every table on an empty database', async () => {
    await migrateDatabase(pool);
    expect(await tables()).toEqual(EXPECTED_TABLES);
  });

  it('is a no-op when the schema is already up to date', async () => {
    await migrateDatabase(pool);
    const applied = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');
    await migrateDatabase(pool);
    const again = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');
    expect(again.rows[0].n).toBe(applied.rows[0].n);
    expect(await tables()).toEqual(EXPECTED_TABLES);
  });

  it('serialises concurrent boots with an advisory lock', async () => {
    const other = new pg.Pool({ connectionString: db.url });
    try {
      await Promise.all([migrateDatabase(pool), migrateDatabase(other), migrateDatabase(pool)]);
    } finally {
      await other.end();
    }
    expect(await tables()).toEqual(EXPECTED_TABLES);
    const applied = await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations');
    expect(applied.rows[0].n).toBe(1);
  });

  it('cascades space deletion to its children', async () => {
    await migrateDatabase(pool);
    await pool.query(`insert into spaces (id, name, locales, locale_fallback) values ('s1', 'S', '[]', '{"id":"en","name":"English"}')`);
    await pool.query(
      `insert into contents (id, space_id, kind, name, slug, full_slug) values ('c1', 's1', 'DOCUMENT', 'Home', 'home', 'home')`,
    );
    await pool.query(`insert into content_published (content_id, locale, data) values ('c1', 'en', '{}')`);
    await pool.query(`insert into tasks (id, space_id, kind, status) values ('t1', 's1', 'SCHEMA_EXPORT', 'INITIATED')`);
    await pool.query(`insert into task_logs (task_id, level, message) values ('t1', 'INFO', 'started')`);

    await pool.query(`delete from spaces where id = 's1'`);

    for (const table of ['contents', 'content_published', 'tasks', 'task_logs']) {
      const { rows } = await pool.query(`select count(*)::int as n from ${table}`);
      expect(rows[0].n, table).toBe(0);
    }
  });
});

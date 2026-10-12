import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AssetKind,
  ContentKind,
  FIREBASE_IMPORT_STATUSES,
  SchemaType,
  TaskKind,
  TaskLogLevel,
  TaskStatus,
  TokenPermission,
  TRANSLATION_IMPORT_FORMATS,
  TranslationType,
  USER_ROLES,
  UserPermission,
  WebHookErrorType,
  WebHookEvent,
  WebHookStatus,
} from '@localess/shared';
import { createTestDatabase, TestDatabase } from '../../../test/database.js';
import { OAUTH_PROVIDERS } from '../config/oauth-providers.js';
import { migrateDatabase } from './migrate.js';
import { HASH_ALGORITHMS, SNAPSHOT_VERSIONS } from './schema.js';

/** Every column with a fixed set of values, and the values (from @localess/shared or the server) it accepts. */
const ENUM_COLUMNS: [table: string, column: string, values: readonly string[]][] = [
  ['users', 'role', USER_ROLES],
  ['users', 'permissions', Object.values(UserPermission)],
  ['user_credentials', 'hash_algo', HASH_ALGORITHMS],
  ['user_identities', 'provider', OAUTH_PROVIDERS],
  ['contents', 'kind', Object.values(ContentKind)],
  ['assets', 'kind', Object.values(AssetKind)],
  ['schemas', 'type', Object.values(SchemaType)],
  ['translations', 'type', Object.values(TranslationType)],
  ['translation_snapshots', 'version', SNAPSHOT_VERSIONS],
  ['content_snapshots', 'version', SNAPSHOT_VERSIONS],
  ['content_link_snapshots', 'version', SNAPSHOT_VERSIONS],
  ['tasks', 'kind', Object.values(TaskKind)],
  ['tasks', 'status', Object.values(TaskStatus)],
  ['tasks', 'type', TRANSLATION_IMPORT_FORMATS],
  ['task_logs', 'level', Object.values(TaskLogLevel)],
  ['tokens', 'permissions', Object.values(TokenPermission)],
  ['webhooks', 'events', Object.values(WebHookEvent)],
  ['webhook_logs', 'event', Object.values(WebHookEvent)],
  ['webhook_logs', 'status', Object.values(WebHookStatus)],
  ['webhook_logs', 'error_type', Object.values(WebHookErrorType)],
  ['firebase_imports', 'status', FIREBASE_IMPORT_STATUSES],
];

describe('columns with a fixed set of values', () => {
  let db: TestDatabase;
  let pool: pg.Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
    pool = new pg.Pool({ connectionString: db.url });
    await migrateDatabase(pool);
  });
  afterAll(async () => {
    await pool?.end();
    await db?.drop();
  });

  it.each(ENUM_COLUMNS)('%s.%s has a CHECK listing exactly its values', async (table, column, values) => {
    const { rows } = await pool.query<{ def: string }>(
      `select pg_get_constraintdef(c.oid) as def
         from pg_constraint c
         join pg_class t on t.oid = c.conrelid
         join pg_attribute a on a.attrelid = t.oid and a.attnum = any (c.conkey)
        where c.contype = 'c' and t.relname = $1 and a.attname = $2`,
      [table, column],
    );
    expect(rows).toHaveLength(1);
    const allowed = [...rows[0].def.matchAll(/'([^']*)'::text/g)].map(match => match[1]);
    expect(allowed.sort()).toEqual([...values].sort());
  });

  it('refuses a value outside the set, lowercase role included', async () => {
    const insert = (role: string) =>
      pool.query(`insert into users (id, email, role) values (gen_random_uuid(), $1, $2)`, [`${role}@example.com`, role]);
    await expect(insert('admin')).rejects.toMatchObject({ code: '23514' });
    await expect(insert('ADMIN')).resolves.toBeDefined();
    await expect(pool.query(`insert into users (id, email, permissions) values (gen_random_uuid(), 'p@example.com', '{NOPE}')`)).rejects.toMatchObject({
      code: '23514',
    });
  });
});

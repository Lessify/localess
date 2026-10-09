import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { freePort } from '../../../test/free-port.js';
import { startEmbeddedPostgres } from './embedded-postgres.js';

describe('startEmbeddedPostgres', () => {
  let dir: string | undefined;

  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('initialises a cluster once and keeps data across restarts', async () => {
    dir = await mkdtemp(join(tmpdir(), 'localess-embedded-'));
    const dataDir = join(dir, 'pgdata');
    const port = await freePort();

    const first = await startEmbeddedPostgres(dataDir, port);
    const client = new pg.Client({ connectionString: first.connectionString });
    await client.connect();
    await client.query('create table marker (value text)');
    await client.query(`insert into marker values ('persisted')`);
    await client.end();
    await first.stop();

    const second = await startEmbeddedPostgres(dataDir, port);
    try {
      const again = new pg.Client({ connectionString: second.connectionString });
      await again.connect();
      const { rows } = await again.query('select value from marker');
      await again.end();
      expect(rows).toEqual([{ value: 'persisted' }]);
    } finally {
      await second.stop();
    }
  });

  it('attaches to a cluster that is already running and leaves it running', async () => {
    const attachDir = await mkdtemp(join(tmpdir(), 'localess-embedded-'));
    const dataDir = join(attachDir, 'pgdata');
    const port = await freePort();
    const owner = await startEmbeddedPostgres(dataDir, port);
    try {
      const attached = await startEmbeddedPostgres(dataDir, port);
      expect(attached.connectionString).toBe(owner.connectionString);
      await attached.stop();

      const client = new pg.Client({ connectionString: owner.connectionString });
      await client.connect();
      expect((await client.query('select 1 as ok')).rows).toEqual([{ ok: 1 }]);
      await client.end();
    } finally {
      await owner.stop();
      await rm(attachDir, { recursive: true, force: true });
    }
  });
});

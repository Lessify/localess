import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';

export interface EmbeddedPostgresHandle {
  connectionString: string;
  stop(): Promise<void>;
}

const USER = 'localess';
// Only reachable on 127.0.0.1, see `listen_addresses` below.
const PASSWORD = 'localess';
const DATABASE = 'localess';

/**
 * Starts (and on first run initialises) a Postgres cluster in `dataDir`.
 * Used when no DATABASE_URL is configured: local development and single-box installs.
 *
 * When the cluster is already running — the CLI next to a live server — it attaches to it
 * instead, and leaves it running on stop.
 */
export async function startEmbeddedPostgres(dataDir: string, port: number): Promise<EmbeddedPostgresHandle> {
  const logger = new Logger('EmbeddedPostgres');
  const connectionString = `postgres://${USER}:${PASSWORD}@127.0.0.1:${port}/${DATABASE}`;

  if (existsSync(join(dataDir, 'postmaster.pid')) && (await isReachable(connectionString))) {
    logger.log(`Attached to the cluster already running on 127.0.0.1:${port}`);
    return { connectionString, stop: async () => undefined };
  }

  const cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: USER,
    password: PASSWORD,
    persistent: true,
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
    onLog: message => logger.debug(message.trim()),
    onError: error => logger.error(error),
  });

  if (!existsSync(join(dataDir, 'PG_VERSION'))) {
    logger.log(`Initialising cluster in ${dataDir}`);
    await cluster.initialise();
  }
  await cluster.start();

  const client = cluster.getPgClient('postgres', '127.0.0.1');
  await client.connect();
  try {
    const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [DATABASE]);
    if (!rowCount) {
      await client.query(`create database "${DATABASE}"`);
    }
  } finally {
    await client.end();
  }
  logger.log(`Listening on 127.0.0.1:${port}`);

  return { connectionString, stop: () => cluster.stop() };
}

async function isReachable(connectionString: string): Promise<boolean> {
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

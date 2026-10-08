import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import EmbeddedPostgres from 'embedded-postgres';

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
 */
export async function startEmbeddedPostgres(dataDir: string, port: number): Promise<EmbeddedPostgresHandle> {
  const logger = new Logger('EmbeddedPostgres');
  const pg = new EmbeddedPostgres({
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
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient('postgres', '127.0.0.1');
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

  return {
    connectionString: `postgres://${USER}:${PASSWORD}@127.0.0.1:${port}/${DATABASE}`,
    stop: () => pg.stop(),
  };
}

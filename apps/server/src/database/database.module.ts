import { Global, Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { APP_CONFIG, AppConfig } from '../config/config.js';
import { EmbeddedPostgresHandle, startEmbeddedPostgres } from './embedded-postgres.js';
import { migrateDatabase } from './migrate.js';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export const DATABASE = Symbol('DATABASE');
export const PG_POOL = Symbol('PG_POOL');
const EMBEDDED_POSTGRES = Symbol('EMBEDDED_POSTGRES');

@Global()
@Module({
  providers: [
    {
      provide: EMBEDDED_POSTGRES,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Promise<EmbeddedPostgresHandle | null> | null =>
        'embedded' in config.database ? startEmbeddedPostgres(config.database.embedded.dataDir, config.database.embedded.port) : null,
    },
    {
      provide: PG_POOL,
      inject: [APP_CONFIG, EMBEDDED_POSTGRES],
      useFactory: async (config: AppConfig, embedded: EmbeddedPostgresHandle | null): Promise<pg.Pool> => {
        const connectionString = embedded?.connectionString ?? ('url' in config.database ? config.database.url : undefined);
        const pool = new pg.Pool({ connectionString });
        pool.on('error', error => {
          const logger = new Logger('Database');
          // 57P01 admin_shutdown: Postgres is stopping, e.g. embedded-postgres' own exit hook on SIGTERM.
          if ((error as { code?: string }).code === '57P01') logger.warn(`Idle connection closed: ${error.message}`);
          else logger.error(error);
        });
        // Every boot brings the schema up to date before anything else touches the database.
        await migrateDatabase(pool);
        return pool;
      },
    },
    {
      provide: DATABASE,
      inject: [PG_POOL],
      useFactory: (pool: pg.Pool): Database => drizzle(pool, { schema }),
    },
  ],
  exports: [DATABASE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(EMBEDDED_POSTGRES) private readonly embedded: EmbeddedPostgresHandle | null,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    await this.embedded?.stop();
  }
}

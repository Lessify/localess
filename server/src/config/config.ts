import { resolve } from 'node:path';
import type { LogLevel } from '@nestjs/common';
import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  // When unset, an embedded Postgres is started inside LOCALESS_DATA_DIR.
  DATABASE_URL: z.string().url().optional(),
  LOCALESS_DATA_DIR: z.string().default('.data'),
  LOCALESS_EMBEDDED_PG_PORT: z.coerce.number().int().positive().default(5433),
  // Angular build output served by @fastify/static. Set to an empty string to serve the API only.
  // Minimum level printed; `debug`/`verbose` include the embedded Postgres server log.
  LOCALESS_LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  LOCALESS_STATIC_DIR: z.string().default(resolve(import.meta.dirname, '../../../dist/localess/browser')),
});

export interface AppConfig {
  port: number;
  host: string;
  database: { url: string } | { embedded: { dataDir: string; port: number } };
  dataDir: string;
  staticDir: string | undefined;
  logLevels: LogLevel[];
}

const LOG_LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const dataDir = resolve(parsed.LOCALESS_DATA_DIR);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    database: parsed.DATABASE_URL
      ? { url: parsed.DATABASE_URL }
      : { embedded: { dataDir: resolve(dataDir, 'pgdata'), port: parsed.LOCALESS_EMBEDDED_PG_PORT } },
    dataDir,
    staticDir: parsed.LOCALESS_STATIC_DIR ? resolve(parsed.LOCALESS_STATIC_DIR) : undefined,
    logLevels: LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(parsed.LOCALESS_LOG_LEVEL) + 1),
  };
}

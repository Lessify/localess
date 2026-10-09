import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import type { TestProject } from 'vitest/node';
import { startEmbeddedPostgres } from '../src/infra/database/embedded-postgres.js';
import { freePort } from './free-port.js';

declare module 'vitest' {
  export interface ProvidedContext {
    pgAdminUrl: string;
  }
}

/** One throwaway Postgres cluster for the whole test run; `createTestDatabase()` carves a database per test file. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  Logger.overrideLogger(['fatal', 'error', 'warn']);
  const dataDir = await mkdtemp(join(tmpdir(), 'localess-pg-'));
  const pg = await startEmbeddedPostgres(join(dataDir, 'pgdata'), await freePort());
  project.provide('pgAdminUrl', pg.connectionString);
  return async () => {
    await pg.stop();
    await rm(dataDir, { recursive: true, force: true });
  };
}

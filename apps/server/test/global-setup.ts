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
    // embedded-postgres registers async-exit-hook, whose `beforeExit` handler calls `process.exit(0)` and would
    // overwrite the failure code vitest records (`process.exitCode = 1`): a red run would exit 0. Keep the failure.
    const exit = process.exit.bind(process);
    process.exit = ((code?: number | string | null) => exit(code === 0 && process.exitCode ? process.exitCode : code)) as typeof process.exit;
  };
}

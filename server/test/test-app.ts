import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { createApp } from '../src/app.factory.js';
import { loadConfig } from '../src/config/config.js';
import * as schema from '../src/database/schema.js';
import { createTestDatabase, TestDatabase } from './database.js';

export interface TestApp {
  app: NestFastifyApplication;
  db: ReturnType<typeof drizzle<typeof schema>>;
  database: TestDatabase;
  request(options: InjectOptions): Promise<LightMyRequestResponse>;
  close(): Promise<void>;
}

/** A full app (all modules, migrations, global guard) against a fresh database. */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const database = await createTestDatabase();
  const app = await createApp(loadConfig({ DATABASE_URL: database.url, LOCALESS_STATIC_DIR: '', LOCALESS_LOG_LEVEL: 'error', ...env }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const pool = new pg.Pool({ connectionString: database.url });
  return {
    app,
    db: drizzle(pool, { schema }),
    database,
    request: options => app.getHttpAdapter().getInstance().inject(options),
    async close() {
      await app.close();
      await pool.end();
      await database.drop();
    },
  };
}

/** Same-origin XHR header the Angular app sends on every state-changing request. */
export const XHR = { 'x-requested-with': 'XMLHttpRequest' };

export function sessionCookie(response: LightMyRequestResponse): string {
  const cookie = response.cookies.find(it => it.name === 'localess_session');
  if (!cookie) throw new Error(`No session cookie in response ${response.statusCode}: ${response.body}`);
  return `localess_session=${cookie.value}`;
}

export async function login(t: TestApp, email: string, password: string): Promise<string> {
  const response = await t.request({ method: 'POST', url: '/api/auth/login', headers: XHR, payload: { email, password } });
  return sessionCookie(response);
}

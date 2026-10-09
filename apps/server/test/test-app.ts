import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { createApp } from '../src/app.factory.js';
import { loadConfig } from '../src/infra/config/config.js';
import * as schema from '../src/infra/database/schema.js';
import { createTestDatabase, TestDatabase } from './database.js';

export interface TestApp {
  app: NestFastifyApplication;
  db: ReturnType<typeof drizzle<typeof schema>>;
  database: TestDatabase;
  storageDir: string;
  request(options: InjectOptions): Promise<LightMyRequestResponse>;
  close(): Promise<void>;
}

/** A full app (all modules, migrations, global guard) against a fresh database. */
export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const database = await createTestDatabase();
  const storageDir = await mkdtemp(join(tmpdir(), 'localess-test-storage-'));
  const app = await createApp(
    loadConfig({
      DATABASE_URL: database.url,
      LOCALESS_STATIC_DIR: '',
      LOCALESS_STORAGE_DIR: storageDir,
      LOCALESS_LOG_LEVEL: 'error',
      ...env,
    }),
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const pool = new pg.Pool({ connectionString: database.url });
  return {
    app,
    db: drizzle(pool, { schema }),
    database,
    storageDir,
    request: options => app.getHttpAdapter().getInstance().inject(options),
    async close() {
      await app.close();
      await pool.end();
      await database.drop();
      await rm(storageDir, { recursive: true, force: true });
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

/** Creates a user with the given access and returns a signed-in session cookie. */
export async function userWithAccess(
  t: TestApp,
  email: string,
  access: { role: 'admin' | 'custom' | null; permissions?: string[] },
): Promise<string> {
  const { UsersService } = await import('../src/auth/users/users.service.js');
  await t.app.get(UsersService).create({ email, password: 'secret1', role: access.role, permissions: access.permissions as never });
  return login(t, email, 'secret1');
}

/** JSON request as the SPA sends it (cookie + X-Requested-With). */
export function api(t: TestApp, cookie: string) {
  const call = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: unknown) =>
    t.request({ method, url, headers: { ...XHR, cookie }, ...(payload !== undefined ? { payload: payload as object } : {}) });
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, payload?: unknown) => call('POST', url, payload ?? {}),
    put: (url: string, payload?: unknown) => call('PUT', url, payload ?? {}),
    patch: (url: string, payload?: unknown) => call('PATCH', url, payload ?? {}),
    delete: (url: string) => call('DELETE', url),
  };
}

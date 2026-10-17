import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import type { InjectOptions, LightMyRequestResponse } from 'fastify';
import pg from 'pg';
import { createApp } from '../src/app.factory.js';
import { loadConfig } from '../src/infra/config/config.js';
import { newUuid } from '../src/infra/database/id.js';
import * as schema from '../src/infra/database/schema.js';
import { TranslationSnapshotsRepository } from '../src/modules/translations/repositories/translation-snapshots.repository.js';

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
  // `pool.end()` resolves once each client is asked to disconnect, not once it has: `close()` then drops the database
  // WITH (FORCE), which can terminate a client still disconnecting (57P01). Nobody listens to that client any more, so
  // its error would be uncaught and fail the run. Connection loss of the test's own pool is never a test result.
  pool.on('connect', client => client.on('error', () => undefined));
  pool.on('error', () => undefined);
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
  access: { role: 'ADMIN' | 'CUSTOM' | null; permissions?: string[] },
): Promise<string> {
  const { UsersService } = await import('../src/modules/users/services/users.service.js');
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

type SpaceInsert = Omit<typeof schema.spaces.$inferInsert, 'defaultLocaleId'> & {
  locales: { id: string; name?: string }[];
  defaultLocale?: { id: string; name?: string };
};

/** Inserts a space with its `space_locales` rows; the default locale is `defaultLocale`, else the first locale. */
export async function insertSpace(db: TestApp['db'], { locales, defaultLocale, ...space }: SpaceInsert): Promise<void> {
  await db.insert(schema.spaces).values({ ...space, defaultLocaleId: (defaultLocale ?? locales[0]).id });
  await db.insert(schema.spaceLocales).values(locales.map((it, position) => ({ spaceId: space.id, localeId: it.id, position })));
}

/**
 * Makes `spaceId` a space imported from the Firebase space `legacyId`: its `firebase_imports` row, in `status`
 * (`FINISHED` by default). `null` removes the row: the space was created here.
 */
export async function setImport(
  db: TestApp['db'],
  spaceId: string,
  imported: { legacyId: string; status?: 'RUNNING' | 'FINISHED' | 'FAILED' } | null,
): Promise<void> {
  await db.delete(schema.firebaseImports).where(eq(schema.firebaseImports.spaceId, spaceId));
  if (!imported) return;
  await db.insert(schema.firebaseImports).values({
    id: newUuid(),
    origin: 'https://firebase.example.com',
    sourceSpaceId: imported.legacyId,
    sourceSpaceName: imported.legacyId,
    spaceId,
    status: imported.status ?? 'FINISHED',
    stages: [],
    startedBy: { name: 'Admin', email: 'admin@example.com' },
  });
}

/** The draft maps built for the space's translations (`translation_snapshots`); every translation write drops them. */
export function draftSnapshots(db: TestApp['db'], spaceId: string) {
  return db
    .select()
    .from(schema.translationSnapshots)
    .where(and(eq(schema.translationSnapshots.spaceId, spaceId), eq(schema.translationSnapshots.version, 'draft')));
}

/** Builds the space's draft maps, as the first draft request after a write does. */
export async function buildDrafts(t: TestApp, spaceId: string): Promise<void> {
  await t.app.get(TranslationSnapshotsRepository).buildDrafts(spaceId);
}

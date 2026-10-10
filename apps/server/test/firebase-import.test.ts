import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { InjectOptions } from 'fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.factory.js';
import { runCli } from '../src/cli/commands.js';
import { loadConfig } from '../src/infra/config/config.js';
import * as schema from '../src/infra/database/schema.js';
import type { FirebaseSource, SourceAuthUser, SourceDocument } from '../src/cli/firebase-import/firebase-source.js';
import { createTestDatabase, TestDatabase } from './database.js';
import { UUID_V7 } from './ids.js';
import { XHR } from './test-app.js';

/** Behaves like a Firestore Timestamp (has toDate()). */
class Timestamp {
  constructor(private readonly ms: number) {}
  toDate(): Date {
    return new Date(this.ms);
  }
}
const ts = (iso: string) => new Timestamp(Date.parse(iso));

/** The reference vector of https://github.com/firebase/scrypt: password "user1password". */
const SCRYPT_ENV = {
  FIREBASE_SCRYPT_SIGNER_KEY: 'jxspr8Ki0RYycVU8zykbdLGjFQ3McFUH0uiiTvC8pVMXAn210wjLNmdZJzxUECKbm0QsEmYUSDzZvpjeJ9WmXA==',
  FIREBASE_SCRYPT_SALT_SEPARATOR: 'Bw==',
  FIREBASE_SCRYPT_ROUNDS: '8',
  FIREBASE_SCRYPT_MEM_COST: '14',
};
const USER1_HASH = 'lSrfV15cpx95/sZS2W9c9Kp6i/LVgQNDNC/qzrCnh1SAyZvqmZqAjTdn3aoItz+VHjoZilo78198JAdRuid5lQ==';
const USER1_SALT = '42xEC+ixf3L2lw==';
const TOKEN = 'TokenTokenTokenToken';
const photo = Buffer.from('fake jpeg bytes');

const en = { id: 'en', name: 'English' };
const de = { id: 'de', name: 'German' };

/** An in-memory Firebase project shaped like a real Firebase-era Localess install. */
function fakeProject(): FirebaseSource & { closed: boolean } {
  const collections: Record<string, SourceDocument[]> = {
    configs: [{ id: 'settings', data: { ui: { text: 'Migrated', color: 'primary' }, updatedAt: ts('2026-01-01') } }],
    users: [
      { id: 'u1', data: { email: 'editor@example.com', role: 'custom', permissions: ['CONTENT_READ'] } },
      { id: 'u2', data: { email: 'google@example.com' } },
    ],
    spaces: [
      {
        id: 's1',
        data: {
          name: 'Website',
          locales: [en, de],
          localeFallback: en,
          overview: { contentsCount: 2, updatedAt: ts('2026-02-01') },
          createdAt: ts('2025-01-01'),
          updatedAt: ts('2026-01-15'),
        },
      },
      { id: 'bad.id', data: { name: 'Broken' } },
    ],
    'spaces/s1/schemas': [
      { id: 'page', data: { type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT', translatable: true }], createdAt: ts('2025-01-01') } },
    ],
    'spaces/s1/contents': [
      { id: 'blog', data: { kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog', createdAt: ts('2025-01-02') } },
      {
        id: 'post',
        data: {
          kind: 'DOCUMENT',
          name: 'Post',
          slug: 'post',
          parentSlug: 'blog',
          fullSlug: 'blog/post',
          schema: 'page',
          // Firebase-era documents stored data as a JSON string.
          data: JSON.stringify({ _id: 'r', _schema: 'page', title: 'Draft title', title_i18n_de: 'Entwurf' }),
          assets: ['a1'],
          publishedAt: ts('2026-01-10'),
          updatedBy: { name: 'Ed', email: 'editor@example.com' },
          createdAt: ts('2025-01-03'),
          updatedAt: ts('2026-01-12'),
        },
      },
      { id: 'draft', data: { kind: 'DOCUMENT', name: 'Draft', slug: 'draft', parentSlug: '', fullSlug: 'draft', schema: 'page' } },
    ],
    'spaces/s1/translations': [{ id: 'greeting', data: { type: 'STRING', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] } }],
    'spaces/s1/assets': [
      { id: 'f1', data: { kind: 'FOLDER', name: 'Photos', parentPath: '' } },
      {
        id: 'a1',
        data: {
          kind: 'FILE',
          name: 'photo',
          parentPath: 'f1',
          extension: '.jpg',
          type: 'image/jpeg',
          size: photo.length,
          metadata: { width: 10, height: 5 },
          inProgress: true,
        },
      },
      { id: 'a2', data: { kind: 'FILE', name: 'lost', parentPath: '', extension: '.png', type: 'image/png', size: 1 } },
    ],
    'spaces/s1/tokens': [{ id: TOKEN, data: { name: 'Legacy token' } }],
    'spaces/s1/webhooks': [
      { id: 'w1', data: { name: 'Site', url: 'https://example.com/hook', enabled: true, events: ['content.published'], secret: 's' } },
    ],
    'spaces/s1/webhooks/w1/logs': [
      {
        id: 'l1',
        data: {
          event: 'content.published',
          url: 'https://example.com/hook',
          status: 'success',
          statusCode: 200,
          requestSize: 10,
          data: { id: 'post' },
          duration: 12.6,
          createdAt: ts('2026-01-10'),
        },
      },
      {
        id: 'l2',
        data: {
          event: 'content.published',
          url: 'https://example.com/hook',
          status: 'failure',
          errorType: 'timeout',
          requestSize: 10,
          data: {},
          duration: 30000,
          createdAt: ts('2026-01-11'),
        },
      },
    ],
  };
  const files: Record<string, Buffer> = {
    'spaces/s1/contents/post/en.json': Buffer.from(
      JSON.stringify({ id: 'post', locale: 'en', fullSlug: 'blog/post', data: { title: 'Published title' }, assets: ['a1'] }),
    ),
    'spaces/s1/contents/post/de.json': Buffer.from(
      JSON.stringify({ id: 'post', locale: 'de', fullSlug: 'blog/post', data: { title: 'Veröffentlicht' } }),
    ),
    'spaces/s1/translations/en.json': Buffer.from(JSON.stringify({ greeting: 'Hello' })),
    'spaces/s1/assets/a1/original': photo,
  };
  const authUsers: SourceAuthUser[] = [
    {
      uid: 'u1',
      email: 'editor@example.com',
      emailVerified: true,
      displayName: 'Ed Itor',
      disabled: false,
      passwordHash: USER1_HASH,
      passwordSalt: USER1_SALT,
      providerIds: ['password'],
      customClaims: { role: 'custom', permissions: ['CONTENT_READ', 'CONTENT_UPDATE'], lock: true },
      creationTime: 'Mon, 06 Jan 2025 10:00:00 GMT',
    },
    { uid: 'u2', email: 'google@example.com', emailVerified: true, disabled: false, providerIds: ['google.com'] },
    { uid: 'u3', emailVerified: false, disabled: false, providerIds: ['phone'] },
    {
      uid: 'u4',
      email: 'ROOT@example.com',
      emailVerified: true,
      disabled: false,
      providerIds: ['password'],
      customClaims: { role: 'admin' },
    },
  ];
  return {
    closed: false,
    async documents(path) {
      return collections[path] ?? [];
    },
    async *authUsers() {
      yield* authUsers;
    },
    async fileSize(path) {
      return files[path]?.length;
    },
    readFile(path) {
      return Readable.from([files[path]]);
    },
    async close() {
      this.closed = true;
    },
  };
}

describe('import:firebase', () => {
  let database: TestDatabase;
  let storageDir: string;
  let env: Record<string, string>;
  let output: string[];
  let app: NestFastifyApplication | undefined;
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    database = await createTestDatabase();
    storageDir = await mkdtemp(join(tmpdir(), 'localess-import-'));
    env = { DATABASE_URL: database.url, LOCALESS_STORAGE_DIR: storageDir, LOCALESS_LOG_LEVEL: 'error', LOCALESS_STATIC_DIR: '' };
    pool = new pg.Pool({ connectionString: database.url });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await app?.close();
    await pool.end();
    await database.drop();
    await rm(storageDir, { recursive: true, force: true });
  });

  const run = (argv: string[], extraEnv: Record<string, string> = {}, source = fakeProject()) => {
    output = [];
    return runCli(argv, {
      env: { ...env, ...extraEnv },
      out: line => output.push(line),
      promptPassword: async () => '',
      firebaseSource: async () => source,
    });
  };

  it('imports everything, reporting what it could not', async () => {
    // An admin created on the new server before the import.
    expect(await run(['admin:create', '--email', 'root@example.com'], { LOCALESS_ADMIN_PASSWORD: 'root-pass' })).toBe(0);
    const source = fakeProject();
    expect(await run(['import:firebase', '--project', 'demo'], SCRYPT_ENV, source)).toBe(0);
    expect(source.closed).toBe(true);
    const text = output.join('\n');
    expect(text).toMatch(/users: 2/);
    expect(text).toMatch(/passwords: 1/);
    expect(text).toMatch(/spaces: 1/);
    expect(text).toMatch(/contents: 3/);
    expect(text).toMatch(/published: 3/);
    expect(text).toMatch(/filesCopied: 1/);
    expect(text).toMatch(/webhookLogs: 2/);
    expect(text).toMatch(/user u3: has no email/);
    expect(text).toMatch(/ROOT@example.com already belongs to another account/);
    expect(text).toMatch(/space 'bad.id'.*skipped/);
    expect(text).toMatch(/spaces\/s1\/assets\/a2\/original: missing/);
  });

  it('maps Firestore data onto rows: timestamps, string data, claims, md5', async () => {
    const [user] = (await db.select().from(schema.users)).filter(it => it.legacyId === 'u1');
    // A UUIDv7 dated to the Firebase creation time, so imported users keep their order.
    expect(user.id).toMatch(UUID_V7);
    expect(parseInt(user.id.replaceAll('-', '').slice(0, 12), 16)).toBe(Date.parse('2025-01-06T10:00:00Z'));
    expect(user).toMatchObject({
      email: 'editor@example.com',
      displayName: 'Ed Itor',
      role: 'custom',
      permissions: ['CONTENT_READ', 'CONTENT_UPDATE'],
      lock: true,
    });
    expect(user.createdAt.toISOString()).toBe('2025-01-06T10:00:00.000Z');

    const posts = (await db.select().from(schema.contents)).filter(it => it.id === 'post');
    expect(posts[0]).toMatchObject({
      fullSlug: 'blog/post',
      data: { title: 'Draft title' },
      assets: ['a1'],
      updatedBy: { name: 'Ed', email: 'editor@example.com' },
    });
    expect(posts[0].publishedAt?.toISOString()).toBe('2026-01-10T00:00:00.000Z');

    // admin:create also seeded "Hello World"; the imported space is s1.
    const [space] = (await db.select().from(schema.spaces)).filter(it => it.legacyId === 's1');
    expect(space.id).toMatch(UUID_V7);
    expect(posts[0].spaceId).toBe(space.id);
    expect(space.overview).toEqual({ contentsCount: 2, updatedAt: '2026-02-01T00:00:00.000Z' });

    // The Firestore schema id is the name content refers to; the row gets a UUID.
    const importedSchemas = await db.select().from(schema.schemas);
    expect(importedSchemas.length).toBeGreaterThan(0);
    for (const row of importedSchemas) {
      expect(row.id).toMatch(UUID_V7);
      expect(row.spaceId).toBe(space.id);
    }
    expect(importedSchemas.map(it => it.name)).toContain(posts[0].schema);

    // The Firestore token id is the secret customers use: it stays the token value, under a new UUID.
    const [token] = await db.select().from(schema.tokens);
    expect(token).toMatchObject({ token: TOKEN, spaceId: space.id });
    expect(token.id).toMatch(UUID_V7);
    const [webhook] = await db.select().from(schema.webhooks);
    expect(webhook).toMatchObject({ legacyId: 'w1', spaceId: space.id });
    expect(webhook.id).toMatch(UUID_V7);
    const logs = await db.select().from(schema.webhookLogs);
    expect(logs.map(it => it.webhookId)).toEqual([webhook.id, webhook.id]);
    for (const log of logs) expect(log.id).toMatch(UUID_V7);

    const a1 = (await db.select().from(schema.assets)).find(it => it.id === 'a1');
    expect(a1).toMatchObject({ parentPath: 'f1', md5: createHash('md5').update(photo).digest('base64'), inProgress: false });
    expect((await db.select().from(schema.settings))[0].ui).toEqual({ text: 'Migrated', color: 'primary' });
  });

  it('runs the imported install: Firebase passwords sign in, and the public API serves the imported snapshots', async () => {
    app = await createApp(loadConfig(env));
    await app.init();
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.ready();
    const request = (options: InjectOptions) => fastify.inject(options);

    const signIn = await request({
      method: 'POST',
      url: '/api/auth/login',
      headers: XHR,
      payload: { email: 'editor@example.com', password: 'user1password' },
    });
    expect(signIn.statusCode).toBe(200);
    expect(signIn.json().user).toMatchObject({ role: 'custom', permissions: ['CONTENT_READ', 'CONTENT_UPDATE'] });

    const follow = async (url: string) => {
      const redirect = await request({ method: 'GET', url });
      return request({ method: 'GET', url: redirect.headers.location as string });
    };
    expect((await follow(`/api/v1/spaces/s1/contents/slugs/blog/post?token=${TOKEN}&locale=de`)).json()).toMatchObject({
      locale: 'de',
      data: { title: 'Veröffentlicht' },
    });
    // Drafts are rebuilt from the imported data.
    expect((await follow(`/api/v1/spaces/s1/contents/post?token=${TOKEN}&locale=de&version=draft`)).json().data.title).toBe('Entwurf');
    expect((await follow(`/api/v1/spaces/s1/translations/en?token=${TOKEN}`)).json()).toEqual({ greeting: 'Hello' });
    const original = await request({ method: 'GET', url: '/api/v1/spaces/s1/assets/a1/original' });
    expect(original.rawPayload.equals(photo)).toBe(true);
    expect(original.headers.etag).toBe(`"${createHash('md5').update(photo).digest('base64')}-orig"`);
  });

  it('can run again for the final delta: nothing duplicates, copied files are skipped, re-hashed passwords are kept', async () => {
    const ids = async () => ({
      users: (await db.select({ id: schema.users.id, legacyId: schema.users.legacyId }).from(schema.users)).sort((a, b) => a.id.localeCompare(b.id)),
      spaces: (await db.select({ id: schema.spaces.id, legacyId: schema.spaces.legacyId }).from(schema.spaces)).sort((a, b) => a.id.localeCompare(b.id)),
      tokens: await db.select({ id: schema.tokens.id, token: schema.tokens.token }).from(schema.tokens),
      webhooks: await db.select({ id: schema.webhooks.id, legacyId: schema.webhooks.legacyId }).from(schema.webhooks),
    });
    const idsBefore = await ids();
    const [u1] = idsBefore.users.filter(it => it.legacyId === 'u1');
    const credentialBefore = (await db.select().from(schema.userCredentials)).find(it => it.userId === u1.id);
    expect(credentialBefore?.hashAlgo).toBe('argon2id'); // re-hashed by the sign-in above
    expect(await run(['import:firebase', '--project', 'demo'], SCRYPT_ENV)).toBe(0);
    expect(output.join('\n')).toMatch(/filesSkipped: 1/);
    expect(await db.select().from(schema.webhookLogs)).toHaveLength(2);
    expect(await db.select().from(schema.contents)).toHaveLength(3);
    expect((await db.select().from(schema.userCredentials)).find(it => it.userId === u1.id)?.hashAlgo).toBe('argon2id');
    // Matched by legacy_id: the same rows, with the same UUIDs.
    expect(await ids()).toEqual(idsBefore);
    const a1 = (await db.select().from(schema.assets)).find(it => it.id === 'a1');
    expect(a1?.md5).toBe(createHash('md5').update(photo).digest('base64'));
  });

  it('warns that password users must reset when no hash parameters are given', async () => {
    expect(await run(['import:firebase', '--project', 'demo'])).toBe(0);
    expect(output.join('\n')).toMatch(/must reset their password/);
  });

  it('check reports a healthy install', async () => {
    expect(await run(['check'])).toBe(0);
    const text = output.join('\n');
    expect(text).toMatch(/✓ admin user: 1 admin/);
    expect(text).toMatch(/✓ storage: writable/);
    expect(text).toMatch(/! password reset email: no SMTP/);
  });
});

describe('check', () => {
  it('fails without an admin', async () => {
    const database = await createTestDatabase();
    const storageDir = await mkdtemp(join(tmpdir(), 'localess-check-'));
    try {
      const output: string[] = [];
      const code = await runCli(['check'], {
        env: { DATABASE_URL: database.url, LOCALESS_STORAGE_DIR: storageDir, LOCALESS_LOG_LEVEL: 'error' },
        out: line => output.push(line),
        promptPassword: async () => '',
      });
      expect(code).toBe(1);
      expect(output.join('\n')).toMatch(/✗ admin user: none/);
    } finally {
      await database.drop();
      await rm(storageDir, { recursive: true, force: true });
    }
  });
});

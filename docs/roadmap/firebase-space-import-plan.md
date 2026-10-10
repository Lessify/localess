# Firebase Space Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin imports one space at a time from a running Firebase-era Localess environment into a self-hosted install, from Admin → Spaces, with stage-by-stage progress; the imported space has UUIDv7 ids and rewritten references.

**Architecture:** The Firebase app gets a read-only migration API (`/api/migration/**`, bearer migration token). The self-hosted server proxies it: an admin-only API lists the remote spaces, starts one import run (persisted in `firebase_imports`, one `RUNNING` at a time) and reports its stages. The run executes in the server process stage by stage and rewrites content references with a pure function. The broad legacy-id support added during the UUIDv7 work is narrowed to `spaces.legacy_id` (unique) and `assets.legacy_id` (old asset URLs).

**Tech Stack:** Firebase Functions v2 + Express 5 + vitest/supertest (Part A, branch from `develop`); NestJS 12 on Fastify, Drizzle/Postgres, vitest, Angular 22 + Spartan (Part B, `refactor/monorepo-structure`).

**Spec:** [firebase-space-import.md](firebase-space-import.md)

## Global Constraints

- Commits only when the user asks (`CLAUDE.md`); every "Commit" step below means "stage and wait for the user's go". Commit with `git -c user.name="alexcibotari" -c user.email="alexandru.cibotari@gmail.com" commit`, no `Co-Authored-By` trailer.
- Part A lives on a new branch `feat/firebase-migration-api` from `origin/develop`, merged into `develop` after review. Part B lives on `refactor/monorepo-structure`. Switch with `git switch`; never carry uncommitted changes across.
- After every Part B task: `pnpm server:build`, `pnpm build`, `pnpm lint:fix`, and the affected test suite (`pnpm server:test`, `pnpm test`, `pnpm shared:test`). Part A: `cd functions && npm run build && npm test && npm run lint`, and for the web app `npm run build && npm test` at the repo root of `develop`.
- Every new id is `newUuid()` (UUIDv7); token values stay as imported (`token` column, unique per install).
- Migration API page size: **500**; `cursor` = last document id of the page, `null` on the last page.
- Warnings per stage: first **50** messages kept, plus `warningCount`.
- Progress poll interval in the UI: **2 s**.
- The migration token is never stored on the self-hosted side and never logged; on the Firebase side only its sha256 is stored, in `configs/migration` as `{ tokenHash, createdAt }`.
- `origin`: `https:` URL, or `http:` only for `localhost` / `127.0.0.1` (same rule as webhook URLs).
- Angular conventions: standalone (no `standalone: true`), `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `input()`/`output()`, `@if`/`@for`.

## Review Focus

- **Firebase space with zero translations, assets or contents:** paging must stop on an empty first page; stages end `DONE` with count 0 (Task B6 test "imports an empty space").
- **Origin with a trailing slash or a path** (`https://cms.example.com/`): requests must not become `//api/migration`; the client normalises the origin (Task B5 test "joins paths under an origin with a trailing slash").
- **An asset folder whose parent folder is missing in Firebase:** `parent_path` keeps the unmapped segment rather than failing, and a warning names it (Task B6 test "keeps an unmapped parent folder segment with a warning").
- **`data` stored as an invalid JSON string in Firestore:** the document is imported with `data = null` and a warning, not a failed run (Task B6 test "imports a document whose data is not valid JSON with a warning").
- **A second admin starts an import while one runs, on another instance:** the partial unique index answers with a `409`, not a second run (Task B7 test "refuses a second import while one is running", which inserts a `RUNNING` row directly).

---

# Part A — Firebase environment (branch `feat/firebase-migration-api` from `origin/develop`)

Setup once:

```bash
git fetch origin develop
git switch -c feat/firebase-migration-api origin/develop
cd functions && npm ci && cd ..
npm ci
```

### Task A1: Migration token storage and check

**Files:**
- Create: `functions/src/utils/migration-token.ts`
- Test: `functions/src/utils/migration-token.test.ts`

**Interfaces:**
- Produces: `hashMigrationToken(token: string): string`, `newMigrationToken(): string` (40 url-safe chars), `MIGRATION_CONFIG_PATH = 'configs/migration'`, `checkMigrationToken(header: string | undefined, stored: { tokenHash?: string } | undefined): 'ok' | 'disabled' | 'unauthorized'`.

- [ ] **Step 1: Write the failing test**

```ts
// functions/src/utils/migration-token.test.ts
import { describe, expect, it } from 'vitest';
import { checkMigrationToken, hashMigrationToken, newMigrationToken } from './migration-token';

describe('migration token', () => {
  it('makes 40 url-safe characters, different every time', () => {
    const a = newMigrationToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{40}$/);
    expect(newMigrationToken()).not.toBe(a);
  });

  it('hashes with sha256 hex', () => {
    expect(hashMigrationToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('is disabled without a stored hash', () => {
    expect(checkMigrationToken('Bearer x', undefined)).toBe('disabled');
    expect(checkMigrationToken('Bearer x', {})).toBe('disabled');
  });

  it('accepts only the matching bearer token', () => {
    const stored = { tokenHash: hashMigrationToken('secret') };
    expect(checkMigrationToken('Bearer secret', stored)).toBe('ok');
    expect(checkMigrationToken('Bearer other', stored)).toBe('unauthorized');
    expect(checkMigrationToken('secret', stored)).toBe('unauthorized');
    expect(checkMigrationToken(undefined, stored)).toBe('unauthorized');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx vitest run src/utils/migration-token.test.ts`
Expected: FAIL, cannot find module `./migration-token`.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/src/utils/migration-token.ts
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Firestore document holding the hash of the environment's migration token (see the self-hosted import). */
export const MIGRATION_CONFIG_PATH = 'configs/migration';

export interface MigrationConfig {
  tokenHash?: string;
  createdAt?: unknown;
}

/** A new migration token: 30 random bytes as 40 url-safe characters. Shown once, only its hash is stored. */
export function newMigrationToken(): string {
  return randomBytes(30).toString('base64url');
}

export function hashMigrationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * `disabled` when no token is configured (the API answers 404 then), `ok` for `Authorization: Bearer <token>`
 * matching the stored hash, `unauthorized` otherwise.
 */
export function checkMigrationToken(header: string | undefined, stored: MigrationConfig | undefined): 'ok' | 'disabled' | 'unauthorized' {
  if (!stored?.tokenHash) return 'disabled';
  const match = /^Bearer (.+)$/.exec(header ?? '');
  if (!match) return 'unauthorized';
  const given = Buffer.from(hashMigrationToken(match[1]), 'hex');
  const expected = Buffer.from(stored.tokenHash, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected) ? 'ok' : 'unauthorized';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx vitest run src/utils/migration-token.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/utils/migration-token.ts functions/src/utils/migration-token.test.ts
git commit -m "feat(functions): migration token hashing and bearer check"
```

### Task A2: Migration API

**Files:**
- Create: `functions/src/migration.ts`
- Modify: `functions/src/index.ts` (export), `firebase.json` (rewrite before `**`)
- Test: `functions/src/migration.test.ts`

**Interfaces:**
- Consumes: `checkMigrationToken`, `MIGRATION_CONFIG_PATH` (A1); `firestoreService` from `./config`.
- Produces: Express router `MIGRATION` and HTTPS function `migrationapi`; endpoints and shapes exactly as the spec's "Endpoints" table.

- [ ] **Step 1: Write the failing test**

```ts
// functions/src/migration.test.ts
import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashMigrationToken } from './utils/migration-token';

type Doc = { id: string; data: Record<string, unknown> };
let collections: Record<string, Doc[]>;
let config: Record<string, unknown> | undefined;
let MIGRATION: express.Router;
let firestoreService: { doc: (path: string) => unknown; collection: (path: string) => unknown };

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

/** A Firestore stand-in for the queries the router makes: doc get, collection orderBy/startAfter/limit/get. */
function fakeCollection(path: string) {
  const query = (startAfter?: string, limit?: number) => ({
    orderBy: () => query(startAfter, limit),
    startAfter: (id: string) => query(id, limit),
    limit: (n: number) => query(startAfter, n),
    get: async () => {
      const all = [...(collections[path] ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));
      const from = startAfter ? all.filter(it => it.id > startAfter) : all;
      const docs = (limit ? from.slice(0, limit) : from).map(it => ({ id: it.id, data: () => it.data }));
      return { docs, empty: docs.length === 0 };
    },
  });
  return query();
}

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const cfg = await import('./config');
  firestoreService = cfg.firestoreService as never;
  MIGRATION = (await import('./migration')).MIGRATION;
});

beforeEach(() => {
  vi.restoreAllMocks();
  config = { tokenHash: hashMigrationToken('secret') };
  collections = {
    spaces: [{ id: 's1', data: { name: 'Site', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' }, createdAt: ts('2025-01-01T00:00:00Z') } }],
    'spaces/s1/tokens': [{ id: 'TOKEN000000000000001', data: { name: 'web', createdAt: ts('2025-01-02T00:00:00Z') } }],
    'spaces/s1/webhooks': [],
    'spaces/s1/schemas': [{ id: 'page', data: { type: 'ROOT', fields: [] } }],
    'spaces/s1/translations': Array.from({ length: 501 }, (_, i) => ({ id: `k${String(i).padStart(4, '0')}`, data: { type: 'STRING', locales: { en: 'x' } } })),
    'spaces/s1/assets': [],
    'spaces/s1/contents': [{ id: 'c1', data: { kind: 'DOCUMENT', data: '{"_id":"r"}' } }],
  };
  vi.spyOn(firestoreService, 'doc').mockImplementation(((path: string) => ({
    get: async () => {
      if (path === 'configs/migration') return { exists: !!config, data: () => config };
      const [, id] = path.split('/');
      const found = collections['spaces'].find(it => it.id === id);
      return { exists: !!found, id, data: () => found?.data };
    },
  })) as never);
  vi.spyOn(firestoreService, 'collection').mockImplementation(((path: string) => fakeCollection(path)) as never);
});

const app = () => express().use(MIGRATION);
const get = (url: string, token: string | null = 'secret') => {
  const req = request(app()).get(url);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('migration API', () => {
  it('answers 404 everywhere while no token is configured', async () => {
    config = undefined;
    expect((await get('/api/migration/spaces')).status).toBe(404);
  });

  it('answers 401 without or with a wrong token', async () => {
    expect((await get('/api/migration/spaces', null)).status).toBe(401);
    expect((await get('/api/migration/spaces', 'wrong')).status).toBe(401);
  });

  it('lists spaces and returns one with ISO timestamps', async () => {
    expect((await get('/api/migration/spaces')).body).toEqual([{ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' }]);
    expect((await get('/api/migration/spaces/s1')).body).toMatchObject({ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' });
    expect((await get('/api/migration/spaces/nope')).status).toBe(404);
  });

  it('returns small collections whole, with ids', async () => {
    expect((await get('/api/migration/spaces/s1/tokens')).body).toEqual([{ id: 'TOKEN000000000000001', name: 'web', createdAt: '2025-01-02T00:00:00.000Z' }]);
    expect((await get('/api/migration/spaces/s1/schemas')).body).toEqual([{ id: 'page', type: 'ROOT', fields: [] }]);
    expect((await get('/api/migration/spaces/s1/webhooks')).body).toEqual([]);
  });

  it('pages large collections by 500, cursor = last id, null at the end', async () => {
    const first = (await get('/api/migration/spaces/s1/translations')).body;
    expect(first.items).toHaveLength(500);
    expect(first.cursor).toBe('k0499');
    const second = (await get('/api/migration/spaces/s1/translations?cursor=k0499')).body;
    expect(second.items.map((it: { id: string }) => it.id)).toEqual(['k0500']);
    expect(second.cursor).toBeNull();
  });

  it('returns contents as stored, data string included', async () => {
    expect((await get('/api/migration/spaces/s1/contents')).body).toEqual({ items: [{ id: 'c1', kind: 'DOCUMENT', data: '{"_id":"r"}' }], cursor: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx vitest run src/migration.test.ts`
Expected: FAIL, cannot find module `./migration`.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/src/migration.ts
import express, { NextFunction, Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { firestoreService } from './config';
import { checkMigrationToken, MIGRATION_CONFIG_PATH, MigrationConfig } from './utils/migration-token';

/**
 * Read-only API a self-hosted Localess install calls to import a space (Admin → Spaces → Import from Firebase).
 * Disabled (404) until an admin generates a migration token in Admin → Settings → Migration.
 */
const PAGE_SIZE = 500;

/** Firestore Timestamps (at any depth) → ISO strings; everything else as stored. */
function plain(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const ts = value as { toDate?: () => Date };
    if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
    if (Array.isArray(value)) return value.map(plain);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  }
  return value;
}

const toJson = (doc: { id: string; data: () => unknown }) => ({ id: doc.id, ...(plain(doc.data()) as object) });

async function auth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const config = (await firestoreService.doc(MIGRATION_CONFIG_PATH).get()).data() as MigrationConfig | undefined;
  const result = checkMigrationToken(req.header('authorization'), config);
  if (result === 'disabled') {
    res.status(404).json({ message: 'Not found' });
    return;
  }
  if (result === 'unauthorized') {
    res.status(401).json({ message: 'Missing or invalid migration token' });
    return;
  }
  next();
}

async function requireSpace(req: Request, res: Response): Promise<boolean> {
  const doc = await firestoreService.doc(`spaces/${req.params['spaceId']}`).get();
  if (!doc.exists) res.status(404).json({ message: 'Space not found' });
  return doc.exists;
}

// eslint-disable-next-line new-cap
export const MIGRATION = express.Router();
MIGRATION.use('/api/migration', auth);

MIGRATION.get('/api/migration/spaces', async (_req, res) => {
  const snapshot = await firestoreService.collection('spaces').orderBy('__name__').get();
  res.json(snapshot.docs.map(doc => {
    const space = toJson(doc) as { id: string; name?: string; createdAt?: string };
    return { id: space.id, name: space.name, createdAt: space.createdAt };
  }));
});

MIGRATION.get('/api/migration/spaces/:spaceId', async (req, res) => {
  const doc = await firestoreService.doc(`spaces/${req.params['spaceId']}`).get();
  if (!doc.exists) {
    res.status(404).json({ message: 'Space not found' });
    return;
  }
  res.json(toJson({ id: doc.id, data: () => doc.data() }));
});

for (const name of ['tokens', 'webhooks', 'schemas']) {
  MIGRATION.get(`/api/migration/spaces/:spaceId/${name}`, async (req, res) => {
    if (!(await requireSpace(req, res))) return;
    const snapshot = await firestoreService.collection(`spaces/${req.params['spaceId']}/${name}`).orderBy('__name__').get();
    res.json(snapshot.docs.map(toJson));
  });
}

for (const name of ['translations', 'assets', 'contents']) {
  MIGRATION.get(`/api/migration/spaces/:spaceId/${name}`, async (req, res) => {
    if (!(await requireSpace(req, res))) return;
    let query = firestoreService.collection(`spaces/${req.params['spaceId']}/${name}`).orderBy('__name__');
    const cursor = typeof req.query['cursor'] === 'string' ? req.query['cursor'] : undefined;
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.limit(PAGE_SIZE).get();
    const items = snapshot.docs.map(toJson);
    res.json({ items, cursor: items.length === PAGE_SIZE ? items[items.length - 1].id : null });
  });
}

const app = express();
app.use(MIGRATION);

export const migrationapi = onRequest({ memory: '512MiB', maxInstances: 2 }, app);
```

Add to `functions/src/index.ts` after the `webhook` export:

```ts
export { migrationapi } from './migration';
```

Add to `firebase.json` `hosting.rewrites`, before the `**` entry:

```json
{
  "source": "/api/migration/**",
  "function": "migrationapi",
  "region": "europe-west6"
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx vitest run src/migration.test.ts && npm run build && npm run lint`
Expected: PASS (6 tests), build and lint clean.

- [ ] **Step 5: Commit**

```bash
git add functions/src/migration.ts functions/src/migration.test.ts functions/src/index.ts firebase.json
git commit -m "feat(functions): read-only migration API for importing spaces into a self-hosted install"
```

### Task A3: Generate and revoke the migration token (callables)

**Files:**
- Create: `functions/src/migration-token.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/migration-token.test.ts`

**Interfaces:**
- Consumes: `newMigrationToken`, `hashMigrationToken`, `MIGRATION_CONFIG_PATH` (A1); `hasRole`, `ROLE_ADMIN`.
- Produces: callables `migrationtoken-generate` → `{ token: string; createdAt: string }`, `migrationtoken-revoke` → `void`; Firestore `configs/migration` `{ tokenHash, createdAt }`.

- [ ] **Step 1: Write the failing test**

```ts
// functions/src/migration-token.test.ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashMigrationToken } from './utils/migration-token';

let handlers: { generate: (req: unknown) => Promise<{ token: string }>; revoke: (req: unknown) => Promise<void> };
let written: unknown;
let deleted: boolean;

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const cfg = await import('./config');
  vi.spyOn(cfg.firestoreService, 'doc').mockImplementation((() => ({
    set: async (value: unknown) => void (written = value),
    delete: async () => void (deleted = true),
  })) as never);
  const mod = await import('./migration-token');
  handlers = { generate: mod.migrationtoken.generate.run as never, revoke: mod.migrationtoken.revoke.run as never };
});

beforeEach(() => {
  written = undefined;
  deleted = false;
});

const admin = { auth: { uid: 'u', token: { role: 'admin' } } };
const editor = { auth: { uid: 'u', token: { role: 'custom' } } };

describe('migration token callables', () => {
  it('generates a token for admins and stores only its hash', async () => {
    const { token } = await handlers.generate({ ...admin, data: {} });
    expect(token).toMatch(/^[A-Za-z0-9_-]{40}$/);
    expect(written).toMatchObject({ tokenHash: hashMigrationToken(token) });
    expect(JSON.stringify(written)).not.toContain(token);
  });

  it('revokes for admins', async () => {
    await handlers.revoke({ ...admin, data: {} });
    expect(deleted).toBe(true);
  });

  it('refuses everyone else', async () => {
    await expect(handlers.generate({ ...editor, data: {} })).rejects.toThrow('permission-denied');
    await expect(handlers.revoke({ data: {} })).rejects.toThrow('permission-denied');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx vitest run src/migration-token.test.ts`
Expected: FAIL, cannot find module `./migration-token`.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/src/migration-token.ts
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreService, ROLE_ADMIN } from './config';
import { hasRole } from './utils/user-auth-utils';
import { authUid } from './utils/log-auth';
import { hashMigrationToken, MIGRATION_CONFIG_PATH, newMigrationToken } from './utils/migration-token';

/** Admin → Settings → Migration: a new token replaces the old one; it is returned once and only its hash is kept. */
const generate = onCall<void, Promise<{ token: string; createdAt: string }>>(async request => {
  logger.info('[MigrationToken::generate] auth uid: ' + authUid(request.auth));
  if (!hasRole(ROLE_ADMIN, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const token = newMigrationToken();
  const createdAt = new Date();
  await firestoreService.doc(MIGRATION_CONFIG_PATH).set({ tokenHash: hashMigrationToken(token), createdAt: FieldValue.serverTimestamp() });
  return { token, createdAt: createdAt.toISOString() };
});

/** Turns the migration API off (it answers 404 again). */
const revoke = onCall<void, Promise<void>>(async request => {
  logger.info('[MigrationToken::revoke] auth uid: ' + authUid(request.auth));
  if (!hasRole(ROLE_ADMIN, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  await firestoreService.doc(MIGRATION_CONFIG_PATH).delete();
});

export const migrationtoken = { generate, revoke };
```

Add to `functions/src/index.ts`:

```ts
export { migrationtoken } from './migration-token';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx vitest run src/migration-token.test.ts && npm run build && npm run lint`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/migration-token.ts functions/src/migration-token.test.ts functions/src/index.ts
git commit -m "feat(functions): admin callables to generate and revoke the migration token"
```

### Task A4: Admin → Settings → Migration tab

**Files:**
- Create: `src/app/features/admin/settings/migration/migration.component.ts`, `.html`, `.spec.ts`
- Create: `src/app/shared/services/migration.service.ts`
- Modify: `src/app/features/admin/settings/settings-routing.module.ts`, `src/app/features/admin/settings/settings.component.ts`

**Interfaces:**
- Consumes: callables `migrationtoken-generate`, `migrationtoken-revoke` (A3); Firestore `configs/migration` (read for `createdAt`).
- Produces: route `features/admin/settings/migration`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/features/admin/settings/migration/migration.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MigrationService } from '@shared/services/migration.service';
import { MigrationComponent } from './migration.component';

describe('MigrationComponent', () => {
  function setup(createdAt: string | undefined) {
    const service = {
      status: vi.fn().mockReturnValue(of({ createdAt })),
      generate: vi.fn().mockReturnValue(of({ token: 'T'.repeat(40), createdAt: '2026-10-10T00:00:00.000Z' })),
      revoke: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.overrideComponent(MigrationComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MigrationService, useValue: service }] });
    const fixture = TestBed.createComponent(MigrationComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, service };
  }

  it('shows whether a token is configured', () => {
    expect(setup('2026-01-01T00:00:00.000Z').component.configuredAt()).toBe('2026-01-01T00:00:00.000Z');
    TestBed.resetTestingModule();
    expect(setup(undefined).component.configuredAt()).toBeUndefined();
  });

  it('shows a generated token once', () => {
    const { component } = setup(undefined);
    component.generate();
    expect(component.newToken()).toBe('T'.repeat(40));
    expect(component.configuredAt()).toBe('2026-10-10T00:00:00.000Z');
    component.dismissToken();
    expect(component.newToken()).toBeUndefined();
  });

  it('revokes', () => {
    const { component, service } = setup('2026-01-01T00:00:00.000Z');
    component.revoke();
    expect(service.revoke).toHaveBeenCalled();
    expect(component.configuredAt()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --include src/app/features/admin/settings/migration/migration.component.spec.ts`
Expected: FAIL, cannot find `./migration.component`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/shared/services/migration.service.ts
import { inject, Injectable } from '@angular/core';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** The environment's migration token, used by a self-hosted install to import spaces. */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);

  status(): Observable<{ createdAt?: string }> {
    return docData(doc(this.firestore, 'configs/migration')).pipe(
      map(it => ({ createdAt: (it?.['createdAt'] as { toDate?: () => Date } | undefined)?.toDate?.().toISOString() })),
    );
  }

  generate(): Observable<{ token: string; createdAt: string }> {
    return httpsCallableData<void, { token: string; createdAt: string }>(this.functions, 'migrationtoken-generate')();
  }

  revoke(): Observable<void> {
    return httpsCallableData<void, void>(this.functions, 'migrationtoken-revoke')();
  }
}
```

```ts
// src/app/features/admin/settings/migration/migration.component.ts
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MigrationService } from '@shared/services/migration.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'll-admin-settings-migration',
  templateUrl: './migration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClipboardModule, DatePipe, HlmButtonImports],
})
export class MigrationComponent implements OnInit {
  private readonly migration = inject(MigrationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly configuredAt = signal<string | undefined>(undefined);
  /** Shown once after generating; never stored in the app. */
  readonly newToken = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.migration
      .status()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(it => this.configuredAt.set(it.createdAt));
  }

  generate(): void {
    this.migration.generate().subscribe(it => {
      this.newToken.set(it.token);
      this.configuredAt.set(it.createdAt);
    });
  }

  revoke(): void {
    this.migration.revoke().subscribe(() => this.configuredAt.set(undefined));
  }

  dismissToken(): void {
    this.newToken.set(undefined);
  }
}
```

```html
<!-- src/app/features/admin/settings/migration/migration.component.html -->
<section class="flex flex-col gap-4 py-4">
  <p class="text-muted-foreground text-sm">
    A self-hosted Localess install imports spaces from this environment with this token (Admin → Spaces → Import from Firebase). Only
    admins can see the data; the token reads every space.
  </p>
  @if (newToken(); as token) {
    <div class="rounded-md border p-3">
      <p class="text-sm font-semibold">Copy the token now, it is not shown again.</p>
      <code class="break-all">{{ token }}</code>
      <div class="mt-2 flex gap-2">
        <button hlmBtn size="sm" [cdkCopyToClipboard]="token">Copy</button>
        <button hlmBtn size="sm" variant="ghost" (click)="dismissToken()">Done</button>
      </div>
    </div>
  }
  @if (configuredAt(); as at) {
    <p class="text-sm">Migration API enabled since {{ at | date: 'medium' }}.</p>
    <div class="flex gap-2">
      <button hlmBtn variant="outline" (click)="generate()">Regenerate token</button>
      <button hlmBtn variant="destructive" (click)="revoke()">Revoke</button>
    </div>
  } @else {
    <p class="text-sm">Migration API disabled.</p>
    <button hlmBtn (click)="generate()">Generate token</button>
  }
</section>
```

In `settings-routing.module.ts` add the child route after `ui`:

```ts
      {
        path: 'migration',
        component: MigrationComponent,
      },
```

(with `import { MigrationComponent } from './migration/migration.component';`), and in `settings.component.ts` import `lucideArrowRightLeft` from `@ng-icons/lucide`, add it to `provideIcons`, and extend `tabItems`:

```ts
  tabItems: TabItem[] = [
    { icon: 'lucideLayoutDashboard', label: 'UI', link: 'ui' },
    { icon: 'lucideArrowRightLeft', label: 'Migration', link: 'migration' },
  ];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include src/app/features/admin/settings/migration/migration.component.spec.ts && npm run build && npm run lint`
Expected: PASS (3 tests), build and lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/admin/settings src/app/shared/services/migration.service.ts
git commit -m "feat(admin): Settings → Migration tab to generate and revoke the migration token"
```

### Task A5: Firebase-side docs and PR

**Files:**
- Modify: `README.md` of `develop` (or its docs page on self-hosting) — one section "Moving to self-hosted"

- [ ] **Step 1: Add the section**

```markdown
## Moving to a self-hosted install

1. Deploy this version (functions and hosting) so `/api/migration/**` exists.
2. In Admin → Settings → Migration, generate a migration token and copy it.
3. In the self-hosted install, Admin → Spaces → Import from Firebase: enter this environment's URL and the token,
   pick a space, import. Repeat per space.
4. Revoke the token when the move is done.
```

- [ ] **Step 2: Verify and stage**

Run: `cd functions && npm run build && npm test && cd .. && npm run build && npm test`
Expected: all green.

- [ ] **Step 3: Commit and open the PR against `develop` (only when the user asks)**

```bash
git add README.md
git commit -m "docs: moving to a self-hosted install"
git push -u origin feat/firebase-migration-api
gh pr create --base develop --title "Migration API for importing spaces into a self-hosted install" --body "..."
```

---

# Part B — Self-hosted install (`refactor/monorepo-structure`)

```bash
git switch refactor/monorepo-structure
```

### Task B1: Remove the CLI importer and Firebase password hashes

**Files:**
- Delete: `apps/server/src/cli/firebase-import/` (whole folder), `apps/server/src/auth/firebase-scrypt.ts`, `apps/server/src/auth/firebase-scrypt.test.ts`, `apps/server/test/firebase-import.test.ts`
- Modify: `apps/server/src/cli/commands.ts` (drop `import:firebase`, the scrypt env, `firebaseSource` option), `apps/server/src/auth/password.ts` (drop the `firebase-scrypt` case), `apps/server/src/infra/database/schema.ts` (`user_credentials`: drop `salt`, comment `hash_algo` = `'argon2id'`), `apps/server/package.json` (remove `firebase-admin`), `package.json` root (remove `localess:import` script), `apps/server/test/cli.test.ts` (drop import cases if any), `apps/server/README.md`, `CLAUDE.md`, `docs/deployment/overview.md`
- Test: `apps/server/test/cli.test.ts`, `apps/server/src/auth/password.test.ts` (if present)

**Interfaces:**
- Produces: `runCli` without the `firebaseSource` option; `verifyPassword` handles `argon2id` only.

- [ ] **Step 1: Write the failing test** — in `apps/server/test/cli.test.ts` add:

```ts
  it('no longer knows import:firebase', async () => {
    expect(await run(['import:firebase', '--project', 'demo'])).toBe(2);
    expect(output.join('\n')).toMatch(/Unknown command/);
  });
```

(`run`/`output` are the file's existing helpers; `2` is the usage-error exit code the CLI returns for unknown commands — check `commands.ts` and use its actual value.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run test/cli.test.ts`
Expected: FAIL (the command still exists).

- [ ] **Step 3: Remove the code**

- `git rm -r apps/server/src/cli/firebase-import apps/server/src/auth/firebase-scrypt.ts apps/server/src/auth/firebase-scrypt.test.ts apps/server/test/firebase-import.test.ts`
- In `commands.ts`: delete the `import:firebase` case, `FIREBASE_SCRYPT_*` parsing and help lines, and the `firebaseSource` field of the options type.
- In `password.ts`: delete `case 'firebase-scrypt'` and the import.
- In `schema.ts` `userCredentials`: remove the `salt` column; comment `// 'argon2id'`.
- `pnpm --filter @localess/server remove firebase-admin`; remove `"localess:import"` from the root `package.json`.
- Docs: remove `import:firebase` / `localess:import` / `FIREBASE_SCRYPT_*` mentions from `CLAUDE.md` (Commands block), `apps/server/README.md` ("Migrating from a Firebase install" section → one line pointing to Admin → Spaces → Import from Firebase and `docs/deployment/migrate-from-firebase.md`), `docs/deployment/overview.md`.

- [ ] **Step 4: Regenerate the migration, run the tests**

Run: `rm -rf apps/server/drizzle && (cd apps/server && pnpm db:generate --name init) && pnpm server:build && pnpm server:test`
Expected: PASS; `grep -rn "firebase-admin\|firebase-scrypt\|import:firebase" apps packages CLAUDE.md` finds nothing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(server): remove the import:firebase CLI and Firebase password hashes"
```

### Task B2: Narrow legacy ids to spaces and assets

**Files:**
- Modify: `apps/server/src/infra/database/schema.ts` (drop `users.legacy_id`, `webhooks.legacy_id` + `webhooks_legacy_idx`, `contents.legacy_id` + `contents_legacy_idx`; `spaces.legacy_id` stays `.unique()`)
- Delete: `apps/server/src/infra/database/legacy-ids.ts`
- Modify: `apps/server/src/infra/http/space-id.ts` (resolve old space ids only on asset routes), `apps/server/src/modules/contents/content-delivery.service.ts` (exact `inArray(… .id …)` in `resolveAssets`, `resolveLinks`, `resolveReferences`; drop `findContentIdByLegacyId`), `apps/server/src/modules/contents/contents.public.controller.ts` (drop the legacy redirect and the `redirect` parameter), `apps/server/src/modules/contents/contents.service.ts` and `apps/server/src/modules/assets/assets.service.ts` (`?ids=` → `inArray(table.id, ids.filter(isUuid))`, `sql\`false\`` when empty), `apps/server/src/modules/tasks/task-runner.service.ts` (content import: map non-UUID ids to `newUuid()` without `legacyId`), `apps/server/src/modules/webhooks/webhooks.controller.ts` (dto omit list back to `['spaceId']`)
- Modify (shared/web): `packages/shared/src/models/content.model.ts` (remove `legacyId`), `apps/web/src/app/features/spaces/contents/shared/{assets-select,asset-select,references-select,link-select}/*.ts` (remove the `legacyId` fallbacks; `asset-select` back to `findById`), their specs (remove the legacy cases)
- Tests: `apps/server/test/v1-cdn.test.ts`, `apps/server/test/app-contents.test.ts`, `apps/server/test/app-assets.test.ts`, `apps/server/test/v1-assets.test.ts`, `apps/server/test/tasks.test.ts`, `apps/server/test/app-spaces.test.ts`

**Interfaces:**
- Produces: `registerSpaceIdResolution(fastify, resolver)` that resolves a non-UUID `:spaceId` only for URLs matching `^/api/v1/spaces/[^/]+/assets/`; everything else with a non-UUID space id answers 404.

- [ ] **Step 1: Write the failing tests**

In `apps/server/test/v1-cdn.test.ts` replace the `describe('Firestore content ids (imported from Firebase)'…)` block with:

```ts
  describe('old Firebase ids', () => {
    it('are not accepted for documents or for the space outside asset routes', async () => {
      await t.db.update(spaces).set({ legacyId: 'FirestoreSpace' }).where(eq(spaces.id, S1));
      expect((await get(`/api/v1/spaces/FirestoreSpace/contents/${C.home}?cv=7&token=${TOKEN_DRAFT}`)).statusCode).toBe(404);
      expect((await get(`/api/v1/spaces/${S1}/contents/FirestoreHome?cv=7&token=${TOKEN_DRAFT}`)).statusCode).toBe(404);
      await t.db.update(spaces).set({ legacyId: null }).where(eq(spaces.id, S1));
    });
  });
```

In `apps/server/test/v1-assets.test.ts` extend the existing Firestore-id redirect test so the old **space** id also works:

```ts
      await t.db.update(spaces).set({ legacyId: 'FirestoreSpace' }).where(eq(spaces.id, S1));
      const viaOldSpace = await get(`/api/v1/spaces/FirestoreSpace/assets/FirestoreAsset000002/original`);
      expect(viaOldSpace.statusCode).toBe(301);
      expect(viaOldSpace.headers.location).toBe(`/api/v1/spaces/FirestoreSpace/assets/${id}/original`);
      expect((await get(viaOldSpace.headers.location as string)).statusCode).toBe(200);
      await t.db.update(spaces).set({ legacyId: null }).where(eq(spaces.id, S1));
```

In `apps/server/test/app-contents.test.ts` replace the `?ids=` legacy test with:

```ts
    it('gives documents UUIDv7 ids; `?ids=` matches ids exactly', async () => {
      expect(post.id).toMatch(UUID_V7);
      expect((await reader.get(`${base}?ids=not-a-uuid,${post.id}`)).json().map((c: { id: string }) => c.id)).toEqual([post.id]);
    });
```

and the same shape in `app-assets.test.ts` (`?ids=FirestoreAsset000001` now returns `[]`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/server && npx vitest run test/v1-cdn.test.ts test/v1-assets.test.ts test/app-contents.test.ts test/app-assets.test.ts`
Expected: FAIL (old space id resolves on content routes, legacy `?ids=` still matches).

- [ ] **Step 3: Implement**

`space-id.ts`, replace the hook body's v1 branch:

```ts
const ASSET_ROUTE = /^\/api\/v1\/spaces\/[^/]+\/assets\//;

export function registerSpaceIdResolution(fastify: FastifyInstance, resolver: SpaceIdResolver): void {
  fastify.addHook('preHandler', async (request, reply) => {
    const params = request.params as Record<string, string> | undefined;
    const spaceId = params?.['spaceId'];
    if (spaceId === undefined || isUuid(spaceId)) return;
    const v1 = request.url.startsWith('/api/v1/');
    if (v1 && ['spaceId', 'contentId', 'assetId'].some(name => name in params! && !isValidId(params![name]))) return;
    // An imported space's Firestore id still reaches its old asset URLs (customer sites, emails, CDNs); nothing else.
    const id = v1 && ASSET_ROUTE.test(request.url) ? await resolver.resolve(spaceId) : undefined;
    if (id) {
      params!['spaceId'] = id;
      return;
    }
    if (v1) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: CONTENT_CACHE });
    else void reply.code(404).send({ statusCode: 404, error: 'Not Found', message: 'Space not found' });
    return reply;
  });
}
```

`content-delivery.service.ts`:

```ts
  async resolveReferences(spaceId: string, ids: string[], locale: string, version: unknown): Promise<Record<string, ContentDocumentApi>> {
    // A malformed stored id is skipped like a missing one rather than failing the whole response.
    const valid = [...new Set(ids.filter(isUuid))];
    const found = await this.localeDocuments(spaceId, valid, locale, isDraft(version));
    const resolved: Record<string, ContentDocumentApi> = {};
    for (const id of valid) {
      const document = found.get(id);
      if (document) resolved[id] = stripStorageIds(document) as ContentDocumentApi;
    }
    return resolved;
  }

  async resolveLinks(spaceId: string, ids: string[]): Promise<Record<string, ContentMetadata>> {
    const unique = [...new Set(ids.filter(isUuid))];
    if (!unique.length) return {};
    const rows = await this.db.select().from(contents).where(and(eq(contents.spaceId, spaceId), inArray(contents.id, unique)));
    return Object.fromEntries(rows.map(row => [row.id, toContentMetadata(row)]));
  }
```

and in `resolveAssets`: `const unique = [...new Set(ids.filter(isUuid))]`, `.where(and(eq(assets.spaceId, spaceId), inArray(assets.id, unique)))`, `const byId = new Map(rows.map(row => [row.id, row]))`. Remove `findContentIdByLegacyId` and the `legacy-ids.js` import; `git rm apps/server/src/infra/database/legacy-ids.ts`.

`contents.public.controller.ts` `contentById`: back to

```ts
    await this.sendContent(request, reply, token, space, contentId, `/api/v1/spaces/${spaceId}/contents/${q(contentId)}`);
```

and remove the `redirect` parameter from `sendContent` (`if (needsRedirect(cv, space.contentVersion))`).

`contents.service.ts` / `assets.service.ts` `list`:

```ts
    if (query.ids) {
      const ids = query.ids.filter(isUuid);
      conditions.push(ids.length ? inArray(contents.id, ids) : sql`false`);
    }
```

(`assets.id` in the assets service).

`task-runner.service.ts` content import:

```ts
    const imported = entries.map(it => ({ ...it, id: isUuid(it.id) ? it.id : newUuid() }));
```

and `await tx.insert(contents).values({ id: content.id, spaceId, ...columns });`. Asset import keeps its `legacy_id` mapping.

Schema: delete the three `legacyId` columns and the two indexes named above; keep `spaces.legacyId` with `.unique()` and its comment rewritten to: `// Firestore id of a space imported from Firebase: one import per Firebase space; its old asset URLs keep working.`

Web: in `assets-select.component.ts` and `references-select.component.ts` go back to `new Map(items.map(item => [item.id, item]))`; in `asset-select.component.ts` back to `this.assetService.findById(this.space().id, id).subscribe({ next: asset => this.asset.set(asset as AssetFile) })`; in `link-select.component.ts` remove `matchesUri` and use `it.id === uri`. Remove the legacy spec cases added for them and restore `asset-select.component.spec.ts` to `findById`. Remove `legacyId` from `ContentBase` in `packages/shared/src/models/content.model.ts`.

Fix the remaining tests: `app-spaces.test.ts`, `tasks.test.ts` (content import of a Firebase-era file: assert `row.id` is a UUIDv7 found by `fullSlug = 'legacy'`, and that a re-import creates a second row only if the slug is free — adjust to expect the 409/`total changes` behaviour the task gives), drop `legacyId` from webhook/content inserts.

- [ ] **Step 4: Regenerate the migration, run everything**

Run: `rm -rf apps/server/drizzle && (cd apps/server && pnpm db:generate --name init) && pnpm server:build && pnpm build && pnpm server:test && pnpm test && pnpm shared:test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: keep legacy ids only on spaces and assets; references resolve by UUID only"
```

### Task B3: Import tables and the space import status

**Files:**
- Modify: `apps/server/src/infra/database/schema.ts`, `apps/server/src/modules/spaces/spaces.service.ts`, `packages/shared/src/models/space.model.ts`
- Create: `packages/shared/src/models/firebase-import.model.ts` (export from `packages/shared/src/index.ts`)
- Test: `apps/server/test/app-spaces.test.ts`

**Interfaces:**
- Produces (shared):

```ts
// packages/shared/src/models/firebase-import.model.ts
export type FirebaseImportStatus = 'RUNNING' | 'FINISHED' | 'FAILED';
export type FirebaseImportStageName =
  | 'space' | 'locales' | 'environments' | 'tokens' | 'webhooks'
  | 'translations' | 'schemas' | 'assets' | 'contents' | 'contentMigration';
export const FIREBASE_IMPORT_STAGES: readonly FirebaseImportStageName[] = [
  'space', 'locales', 'environments', 'tokens', 'webhooks', 'translations', 'schemas', 'assets', 'contents', 'contentMigration',
];
export interface FirebaseImportStage {
  stage: FirebaseImportStageName;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  count: number;
  total?: number;
  warnings?: string[];
  warningCount?: number;
  error?: string;
}
export interface FirebaseImport {
  id: string;
  origin: string;
  sourceSpaceId: string;
  sourceSpaceName: string;
  spaceId?: string;
  status: FirebaseImportStatus;
  stages: FirebaseImportStage[];
  error?: { stage: FirebaseImportStageName; message: string };
  startedBy: { name: string; email: string };
  startedAt: string;
  finishedAt?: string;
}
/** A space of the Firebase environment, as `POST /admin/firebase-import/spaces` lists it. */
export interface FirebaseSourceSpace {
  id: string;
  name: string;
  createdAt?: string;
  importedAs: { id: string; name: string } | null;
}
```

- `Space` gains `importStatus?: 'IMPORTING' | 'FAILED'`.
- Schema: `spaces.importStatus = text('import_status')`; table `firebaseImports` (below).
- `SpacesService.delete` answers `409` while `import_status = 'IMPORTING'`.

- [ ] **Step 1: Write the failing test** (`app-spaces.test.ts`)

```ts
    it('refuses to delete a space while it is being imported, allows it once the import failed', async () => {
      const id = newUuid();
      await t.db.insert(spaces).values({ id, name: 'Importing', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' }, importStatus: 'IMPORTING' });
      expect((await admin.get(`/api/app/spaces/${id}`)).json()).toMatchObject({ importStatus: 'IMPORTING' });
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(409);
      await t.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, id));
      expect((await admin.delete(`/api/app/spaces/${id}`)).statusCode).toBe(204);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run test/app-spaces.test.ts`
Expected: FAIL (`importStatus` column does not exist).

- [ ] **Step 3: Implement**

`schema.ts`, in `spaces` after `legacyId`:

```ts
    // 'IMPORTING' while an import from Firebase fills the space, 'FAILED' after a failed one, null otherwise.
    importStatus: text('import_status'),
```

New table after `webhookLogs`:

```ts
// ---------------------------------------------------------------------------------------------------
// Imports from a Firebase environment (Admin → Spaces → Import from Firebase), one row per run
// ---------------------------------------------------------------------------------------------------

export const firebaseImports = pgTable(
  'firebase_imports',
  {
    id: uuid('id').primaryKey(),
    origin: text('origin').notNull(),
    sourceSpaceId: text('source_space_id').notNull(),
    sourceSpaceName: text('source_space_name').notNull(),
    spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'set null' }),
    // 'RUNNING' | 'FINISHED' | 'FAILED'
    status: text('status').notNull(),
    stages: jsonb('stages').$type<FirebaseImportStage[]>().notNull(),
    error: jsonb('error').$type<{ stage: FirebaseImportStageName; message: string }>(),
    startedBy: jsonb('started_by').$type<UpdatedBy>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  // At most one running import per install, whichever instance started it.
  t => [uniqueIndex('firebase_imports_running_idx').on(t.status).where(sql`${t.status} = 'RUNNING'`), index('firebase_imports_started_idx').on(t.startedAt.desc())],
);
```

(import `FirebaseImportStage`, `FirebaseImportStageName` as types from `@localess/shared`).

`spaces.service.ts` `delete`:

```ts
  async delete(spaceId: string): Promise<void> {
    await this.db.transaction(async tx => {
      const space = await requireSpace(tx, spaceId);
      if (space.importStatus === 'IMPORTING') throw new ConflictException('The space is being imported');
      await tx.delete(spaces).where(eq(spaces.id, spaceId));
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, tx);
    });
    await this.storage.deletePrefix(`spaces/${spaceId}/`);
  }
```

`space.model.ts`: add `importStatus?: 'IMPORTING' | 'FAILED';` with a doc comment. Export the new model from `packages/shared/src/index.ts`.

- [ ] **Step 4: Regenerate the migration, run tests**

Run: `rm -rf apps/server/drizzle && (cd apps/server && pnpm db:generate --name init) && pnpm server:build && cd apps/server && npx vitest run test/app-spaces.test.ts src/infra/database/migrate.test.ts`
Expected: PASS (add `'firebase_imports'` to `EXPECTED_TABLES` in `migrate.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): firebase_imports table and space import status"
```

### Task B4: Reference rewrite

**Files:**
- Create: `apps/server/src/modules/firebase-import/rewrite-references.ts`
- Test: `apps/server/src/modules/firebase-import/rewrite-references.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ReferenceMaps { assets: Map<string, string>; contents: Map<string, string> }
export interface RewriteResult<T> { value: T; changed: boolean; missing: { kind: 'asset' | 'content'; id: string }[] }
export function rewriteData(data: unknown, maps: ReferenceMaps): RewriteResult<unknown>;
export function rewriteIds(ids: string[] | null, map: Map<string, string>, kind: 'asset' | 'content'): RewriteResult<string[] | null>;
```

- [ ] **Step 1: Write the failing test**

```ts
// apps/server/src/modules/firebase-import/rewrite-references.test.ts
import { describe, expect, it } from 'vitest';
import { rewriteData, rewriteIds } from './rewrite-references.js';

const maps = {
  assets: new Map([['a1', 'A-1'], ['a2', 'A-2']]),
  contents: new Map([['c1', 'C-1']]),
};

describe('rewriteData', () => {
  it('rewrites ASSET, content LINK and REFERENCE uris at any depth and in locale variants', () => {
    const data = {
      _id: 'root',
      _schema: 'page',
      hero: { kind: 'ASSET', uri: 'a1' },
      gallery: [{ kind: 'ASSET', uri: 'a2' }],
      cta: { kind: 'LINK', type: 'content', uri: 'c1' },
      external: { kind: 'LINK', type: 'url', uri: 'https://example.com' },
      author: { kind: 'REFERENCE', uri: 'c1' },
      blocks: [{ _id: 'b1', _schema: 'card', image_i18n_de: { kind: 'ASSET', uri: 'a1' }, refs: [{ kind: 'REFERENCE', uri: 'c1' }] }],
    };
    const { value, changed, missing } = rewriteData(data, maps);
    expect(changed).toBe(true);
    expect(missing).toEqual([]);
    expect(value).toEqual({
      _id: 'root',
      _schema: 'page',
      hero: { kind: 'ASSET', uri: 'A-1' },
      gallery: [{ kind: 'ASSET', uri: 'A-2' }],
      cta: { kind: 'LINK', type: 'content', uri: 'C-1' },
      external: { kind: 'LINK', type: 'url', uri: 'https://example.com' },
      author: { kind: 'REFERENCE', uri: 'C-1' },
      blocks: [{ _id: 'b1', _schema: 'card', image_i18n_de: { kind: 'ASSET', uri: 'A-1' }, refs: [{ kind: 'REFERENCE', uri: 'C-1' }] }],
    });
  });

  it('keeps unmatched ids and reports them', () => {
    const { value, changed, missing } = rewriteData({ hero: { kind: 'ASSET', uri: 'gone' }, link: { kind: 'LINK', type: 'content', uri: 'lost' } }, maps);
    expect(changed).toBe(false);
    expect(value).toEqual({ hero: { kind: 'ASSET', uri: 'gone' }, link: { kind: 'LINK', type: 'content', uri: 'lost' } });
    expect(missing).toEqual([{ kind: 'asset', id: 'gone' }, { kind: 'content', id: 'lost' }]);
  });

  it('leaves null and plain values alone', () => {
    expect(rewriteData(null, maps)).toEqual({ value: null, changed: false, missing: [] });
    expect(rewriteData({ title: 'a1' }, maps).value).toEqual({ title: 'a1' });
  });
});

describe('rewriteIds', () => {
  it('maps every id, keeps and reports unmatched ones', () => {
    expect(rewriteIds(['a1', 'x'], maps.assets, 'asset')).toEqual({ value: ['A-1', 'x'], changed: true, missing: [{ kind: 'asset', id: 'x' }] });
    expect(rewriteIds(null, maps.assets, 'asset')).toEqual({ value: null, changed: false, missing: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/modules/firebase-import/rewrite-references.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/server/src/modules/firebase-import/rewrite-references.ts

/** Firebase id → new UUID, per entity, for one imported space. */
export interface ReferenceMaps {
  assets: Map<string, string>;
  contents: Map<string, string>;
}

export interface RewriteResult<T> {
  value: T;
  changed: boolean;
  /** Ids no map knows (their target was deleted in Firebase before the import): kept as they are. */
  missing: { kind: 'asset' | 'content'; id: string }[];
}

type Missing = RewriteResult<unknown>['missing'];

function lookup(id: string, map: Map<string, string>, kind: 'asset' | 'content', missing: Missing): string {
  const mapped = map.get(id);
  if (mapped === undefined) missing.push({ kind, id });
  return mapped ?? id;
}

/**
 * Rewrites the references in content `data` by shape, at any depth and in every locale variant:
 * `{ kind: 'ASSET', uri }`, `{ kind: 'LINK', type: 'content', uri }`, `{ kind: 'REFERENCE', uri }`.
 * Block ids (`_id`) and schema names (`_schema`) are not references and stay.
 */
export function rewriteData(data: unknown, maps: ReferenceMaps): RewriteResult<unknown> {
  const missing: Missing = [];
  let changed = false;
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    const node = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(node)) out[key] = walk(item);
    if (typeof node['uri'] === 'string') {
      const kind = node['kind'] === 'ASSET' ? 'asset' : node['kind'] === 'REFERENCE' || (node['kind'] === 'LINK' && node['type'] === 'content') ? 'content' : undefined;
      if (kind) {
        const uri = lookup(node['uri'], kind === 'asset' ? maps.assets : maps.contents, kind, missing);
        if (uri !== node['uri']) changed = true;
        out['uri'] = uri;
      }
    }
    return out;
  };
  const value = walk(data);
  return { value, changed, missing };
}

/** Rewrites an id array (`assets`, `links`, `references`). */
export function rewriteIds(ids: string[] | null, map: Map<string, string>, kind: 'asset' | 'content'): RewriteResult<string[] | null> {
  const missing: Missing = [];
  if (!ids) return { value: null, changed: false, missing };
  const value = ids.map(id => lookup(id, map, kind, missing));
  return { value, changed: value.some((id, i) => id !== ids[i]), missing };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/modules/firebase-import/rewrite-references.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/firebase-import/rewrite-references.ts apps/server/src/modules/firebase-import/rewrite-references.test.ts
git commit -m "feat(server): rewrite Firebase ids in imported content references"
```

### Task B5: Client for the Firebase migration API

**Files:**
- Create: `apps/server/src/modules/firebase-import/firebase-client.ts`
- Create: `apps/server/test/fake-firebase.ts` (test fixture server, reused by B6/B7)
- Test: `apps/server/src/modules/firebase-import/firebase-client.test.ts`

**Interfaces:**
- Produces:

```ts
export type FirebaseDoc = { id: string } & Record<string, unknown>;
export class FirebaseConnectionError extends Error { readonly reason: 'unreachable' | 'unauthorized' | 'disabled' | 'failed'; }
export function normalizeOrigin(origin: string): string; // throws on non-https (http allowed for localhost/127.0.0.1)
export class FirebaseClient {
  constructor(origin: string, token: string);
  readonly origin: string;
  spaces(): Promise<{ id: string; name: string; createdAt?: string }[]>;
  space(id: string): Promise<FirebaseDoc>;
  list(spaceId: string, name: 'tokens' | 'webhooks' | 'schemas'): Promise<FirebaseDoc[]>;
  pages(spaceId: string, name: 'translations' | 'assets' | 'contents'): AsyncGenerator<FirebaseDoc[]>;
  assetFile(spaceId: string, assetId: string): Promise<Readable | null>; // null on 404
}
// test/fake-firebase.ts
export interface FakeFirebaseSpace { id: string; name: string; doc: Record<string, unknown>; tokens?: FirebaseDocLike[]; webhooks?: FirebaseDocLike[]; schemas?: FirebaseDocLike[]; translations?: FirebaseDocLike[]; assets?: FirebaseDocLike[]; contents?: FirebaseDocLike[]; files?: Record<string, Buffer> }
export async function fakeFirebase(spaces: FakeFirebaseSpace[], options?: { token?: string; pageSize?: number; failAfterFiles?: number }): Promise<{ url: string; requests: string[]; close(): Promise<void> }>;
```

- [ ] **Step 1: Write the fixture server and the failing test**

```ts
// apps/server/test/fake-firebase.ts
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type FirebaseDocLike = { id: string } & Record<string, unknown>;

export interface FakeFirebaseSpace {
  id: string;
  name: string;
  doc: Record<string, unknown>;
  tokens?: FirebaseDocLike[];
  webhooks?: FirebaseDocLike[];
  schemas?: FirebaseDocLike[];
  translations?: FirebaseDocLike[];
  assets?: FirebaseDocLike[];
  contents?: FirebaseDocLike[];
  /** Asset id → bytes served at /api/v1/spaces/{space}/assets/{id}/original; absent ids answer 404. */
  files?: Record<string, Buffer>;
}

/** Plays a Firebase environment's migration API and asset `/original` route for import tests. */
export async function fakeFirebase(
  spaces: FakeFirebaseSpace[],
  options: { token?: string; pageSize?: number; failAfterFiles?: number } = {},
): Promise<{ url: string; requests: string[]; close(): Promise<void> }> {
  const token = options.token ?? 'migration-secret';
  const pageSize = options.pageSize ?? 500;
  const requests: string[] = [];
  let filesServed = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake');
    requests.push(url.pathname + url.search);
    const json = (status: number, body: unknown) => response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    const file = /^\/api\/v1\/spaces\/([^/]+)\/assets\/([^/]+)\/original$/.exec(url.pathname);
    if (file) {
      if (options.failAfterFiles !== undefined && filesServed >= options.failAfterFiles) return void response.destroy();
      const bytes = spaces.find(it => it.id === file[1])?.files?.[file[2]];
      if (!bytes) return json(404, { message: 'Not found' });
      filesServed++;
      return void response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(bytes);
    }
    if (!url.pathname.startsWith('/api/migration/')) return json(404, { message: 'Not found' });
    if (request.headers.authorization !== `Bearer ${token}`) return json(401, { message: 'Missing or invalid migration token' });
    const parts = url.pathname.split('/').slice(3); // ['spaces', id?, collection?]
    if (parts.length === 1) return json(200, spaces.map(it => ({ id: it.id, name: it.name, createdAt: it.doc['createdAt'] })));
    const space = spaces.find(it => it.id === parts[1]);
    if (!space) return json(404, { message: 'Space not found' });
    if (parts.length === 2) return json(200, { id: space.id, name: space.name, ...space.doc });
    const items = (space as unknown as Record<string, FirebaseDocLike[] | undefined>)[parts[2]] ?? [];
    if (['tokens', 'webhooks', 'schemas'].includes(parts[2])) return json(200, items);
    const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
    const cursor = url.searchParams.get('cursor');
    const from = cursor ? sorted.filter(it => it.id > cursor) : sorted;
    const page = from.slice(0, pageSize);
    return json(200, { items: page, cursor: page.length === pageSize ? page[page.length - 1].id : null });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}
```

```ts
// apps/server/src/modules/firebase-import/firebase-client.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fakeFirebase } from '../../../test/fake-firebase.js';
import { FirebaseClient, FirebaseConnectionError, normalizeOrigin } from './firebase-client.js';

let fake: Awaited<ReturnType<typeof fakeFirebase>>;

beforeAll(async () => {
  fake = await fakeFirebase(
    [
      {
        id: 's1',
        name: 'Site',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        tokens: [{ id: 'TOKEN000000000000001', name: 'web' }],
        translations: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        files: { a1: Buffer.from('bytes') },
      },
    ],
    { pageSize: 2 },
  );
});
afterAll(() => fake.close());

describe('normalizeOrigin', () => {
  it('accepts https and local http, strips trailing slashes, refuses the rest', () => {
    expect(normalizeOrigin('https://cms.example.com/')).toBe('https://cms.example.com');
    expect(normalizeOrigin('http://localhost:5000')).toBe('http://localhost:5000');
    expect(() => normalizeOrigin('http://cms.example.com')).toThrow();
    expect(() => normalizeOrigin('ftp://x')).toThrow();
  });
});

describe('FirebaseClient', () => {
  const client = () => new FirebaseClient(`${fake.url}/`, 'migration-secret');

  it('joins paths under an origin with a trailing slash', async () => {
    expect(await client().spaces()).toEqual([{ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' }]);
    expect(fake.requests.at(-1)).toBe('/api/migration/spaces');
  });

  it('reads a space and a small collection', async () => {
    expect(await client().space('s1')).toMatchObject({ id: 's1', name: 'Site' });
    expect(await client().list('s1', 'tokens')).toEqual([{ id: 'TOKEN000000000000001', name: 'web' }]);
  });

  it('follows cursors until the last page', async () => {
    const pages: string[][] = [];
    for await (const page of client().pages('s1', 'translations')) pages.push(page.map(it => it.id));
    expect(pages).toEqual([['a', 'b'], ['c']]);
  });

  it('streams asset files, null when missing', async () => {
    const stream = await client().assetFile('s1', 'a1');
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('bytes');
    expect(await client().assetFile('s1', 'missing')).toBeNull();
  });

  it('names the failure: wrong token, disabled API, unreachable', async () => {
    await expect(new FirebaseClient(fake.url, 'wrong').spaces()).rejects.toMatchObject({ reason: 'unauthorized' });
    await expect(new FirebaseClient(`${fake.url}/nothing-here`, 'migration-secret').spaces()).rejects.toMatchObject({ reason: 'disabled' });
    await expect(new FirebaseClient('http://127.0.0.1:1', 'x').spaces()).rejects.toBeInstanceOf(FirebaseConnectionError);
  });
});
```

(For the "disabled" case the fake answers 404 for paths that are not under `/api/migration/`; with the origin `…/nothing-here` the client requests `/nothing-here/api/migration/spaces`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run src/modules/firebase-import/firebase-client.test.ts`
Expected: FAIL, cannot find module `./firebase-client.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/server/src/modules/firebase-import/firebase-client.ts
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

export type FirebaseDoc = { id: string } & Record<string, unknown>;

/** Why a Firebase environment could not be read, worded for the admin. */
export class FirebaseConnectionError extends Error {
  constructor(
    readonly reason: 'unreachable' | 'unauthorized' | 'disabled' | 'failed',
    message: string,
  ) {
    super(message);
  }
}

/** `https:` (or `http:` on localhost), without trailing slashes. */
export function normalizeOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new FirebaseConnectionError('failed', 'The origin is not a URL');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new FirebaseConnectionError('failed', 'The origin must use https');
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/**
 * The read-only migration API of a Firebase-era Localess environment (`/api/migration/**`, bearer migration token),
 * plus its public asset `/original` route for files.
 */
export class FirebaseClient {
  /** The normalised origin, recorded on the import run. */
  readonly origin: string;

  constructor(
    origin: string,
    private readonly token: string,
  ) {
    this.origin = normalizeOrigin(origin);
  }

  private async get<T>(path: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.origin}/api/migration${path}`, { headers: { authorization: `Bearer ${this.token}` } });
    } catch (error) {
      throw new FirebaseConnectionError('unreachable', `Cannot reach ${this.origin}: ${(error as Error).message}`);
    }
    if (response.status === 401) throw new FirebaseConnectionError('unauthorized', 'The migration token was refused');
    if (response.status === 404 && path === '/spaces') {
      throw new FirebaseConnectionError('disabled', 'The migration API is not enabled on this environment (Admin → Settings → Migration)');
    }
    if (!response.ok) throw new FirebaseConnectionError('failed', `GET /api/migration${path} answered ${response.status}`);
    return (await response.json()) as T;
  }

  spaces(): Promise<{ id: string; name: string; createdAt?: string }[]> {
    return this.get('/spaces');
  }

  space(id: string): Promise<FirebaseDoc> {
    return this.get(`/spaces/${encodeURIComponent(id)}`);
  }

  list(spaceId: string, name: 'tokens' | 'webhooks' | 'schemas'): Promise<FirebaseDoc[]> {
    return this.get(`/spaces/${encodeURIComponent(spaceId)}/${name}`);
  }

  async *pages(spaceId: string, name: 'translations' | 'assets' | 'contents'): AsyncGenerator<FirebaseDoc[]> {
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const page: { items: FirebaseDoc[]; cursor: string | null } = await this.get(`/spaces/${encodeURIComponent(spaceId)}/${name}${query}`);
      if (page.items.length) yield page.items;
      cursor = page.cursor;
    } while (cursor);
  }

  /** The stored original of an asset, or null when Firebase has no file for it. */
  async assetFile(spaceId: string, assetId: string): Promise<Readable | null> {
    const url = `${this.origin}/api/v1/spaces/${encodeURIComponent(spaceId)}/assets/${encodeURIComponent(assetId)}/original`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new FirebaseConnectionError('unreachable', `Cannot download asset ${assetId}: ${(error as Error).message}`);
    }
    if (response.status === 404) return null;
    if (!response.ok || !response.body) throw new FirebaseConnectionError('failed', `Asset ${assetId} answered ${response.status}`);
    return Readable.fromWeb(response.body as unknown as WebReadableStream);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run src/modules/firebase-import/firebase-client.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/firebase-import/firebase-client.ts apps/server/src/modules/firebase-import/firebase-client.test.ts apps/server/test/fake-firebase.ts
git commit -m "feat(server): client for a Firebase environment's migration API"
```

### Task B6: The import run (stages)

**Files:**
- Create: `apps/server/src/modules/firebase-import/firebase-import.runner.ts` (stage execution and progress), `apps/server/src/modules/firebase-import/firebase-docs.ts` (Firestore value helpers moved from the removed importer)
- Test: `apps/server/test/firebase-import.test.ts`

**Interfaces:**
- Consumes: `FirebaseClient` (B5), `rewriteData`, `rewriteIds` (B4), schema tables, `newUuid`, `AssetMetadataService.extract(key, type, alt)`, `StorageDriver.put(key, stream)`, `bumpVersion(db, spaceId, 'content' | 'translation')`.
- Produces:

```ts
export class FirebaseImportRunner {
  constructor(db: Database, storage: StorageDriver, metadata: AssetMetadataService, events: EventsService);
  /** Runs the import of `run` (already inserted as RUNNING with PENDING stages); never throws, records the outcome. */
  execute(runId: string, client: FirebaseClient, sourceSpaceId: string): Promise<void>;
}
// firebase-docs.ts
export function toDate(value: unknown): Date | undefined;
export const str: (value: unknown) => string | null;
export const strings: (value: unknown) => string[] | null;
export const obj: <T>(value: unknown) => T | null;
export function timestamps(data: Record<string, unknown>): { createdAt: Date; updatedAt: Date };
export function parseData(value: unknown): { data: Record<string, unknown> | null; invalid: boolean };
```

- [ ] **Step 1: Write the failing test** (end to end against the fake, through the runner; the controller comes in B7)

```ts
// apps/server/test/firebase-import.test.ts
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { newUuid } from '../src/infra/database/id.js';
import { assets, contents, firebaseImports, schemas, spaces, tokens, translations, webhooks } from '../src/infra/database/schema.js';
import { FirebaseClient } from '../src/modules/firebase-import/firebase-client.js';
import { FirebaseImportRunner } from '../src/modules/firebase-import/firebase-import.runner.js';
import { fakeFirebase, FakeFirebaseSpace } from './fake-firebase.js';
import { UUID_V7 } from './ids.js';
import { createTestApp, TestApp } from './test-app.js';

const photo = Buffer.from('photo-bytes');
const site: FakeFirebaseSpace = {
  id: 'fbSpace',
  name: 'Site',
  doc: {
    locales: [{ id: 'en', name: 'English' }, { id: 'de', name: 'German' }],
    localeFallback: { id: 'en', name: 'English' },
    environments: [{ name: 'Preview', url: 'https://preview.example.com' }],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  tokens: [
    { id: 'TOKENV1000000000000A', name: 'legacy', createdAt: '2025-01-02T00:00:00.000Z' },
    { id: 'TOKENV2000000000000B', name: 'web', version: 2, permissions: ['CONTENT_PUBLIC'], createdAt: '2025-01-02T00:00:00.000Z' },
  ],
  webhooks: [{ id: 'w1', name: 'Site', url: 'https://example.com/hook', enabled: true, events: ['content.published'], secret: 's' }],
  schemas: [{ id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] }],
  translations: [{ id: 'greeting', type: 'STRING', locales: { en: 'Hello' } }, { id: 'bye', type: 'STRING', locales: { en: 'Bye' } }],
  assets: [
    { id: 'f1', kind: 'FOLDER', name: 'Photos', parentPath: '' },
    { id: 'a1', kind: 'FILE', name: 'photo', parentPath: 'f1', extension: '.jpg', type: 'image/jpeg', size: photo.length, createdAt: '2025-02-01T00:00:00.000Z' },
    { id: 'a2', kind: 'FILE', name: 'missing', parentPath: 'gone', extension: '.jpg', type: 'image/jpeg', size: 1 },
  ],
  contents: [
    { id: 'blog', kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog' },
    {
      id: 'post',
      kind: 'DOCUMENT',
      name: 'Post',
      slug: 'post',
      parentSlug: 'blog',
      fullSlug: 'blog/post',
      schema: 'page',
      publishedAt: '2025-03-01T00:00:00.000Z',
      data: JSON.stringify({ _id: 'r', _schema: 'page', title: 'Hi', hero: { kind: 'ASSET', uri: 'a1' }, next: { kind: 'LINK', type: 'content', uri: 'home' }, lost: { kind: 'REFERENCE', uri: 'deleted' } }),
      assets: ['a1'],
      links: ['home'],
      references: ['deleted'],
    },
    { id: 'home', kind: 'DOCUMENT', name: 'Home', slug: 'home', parentSlug: '', fullSlug: 'home', schema: 'page', data: '{not json' },
  ],
  files: { a1: photo },
};

describe('Firebase import run', () => {
  let t: TestApp;
  let fake: Awaited<ReturnType<typeof fakeFirebase>>;

  beforeAll(async () => {
    t = await createTestApp();
    fake = await fakeFirebase([site, { id: 'empty', name: 'Empty', doc: { locales: [], createdAt: '2025-01-01T00:00:00.000Z' } }]);
  });
  afterAll(async () => {
    await t?.close();
    await fake?.close();
  });

  const start = async (sourceSpaceId: string) => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: fake.url,
      sourceSpaceId,
      sourceSpaceName: sourceSpaceId,
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(fake.url, 'migration-secret'), sourceSpaceId);
    return (await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id)))[0];
  };

  it('imports a space stage by stage', async () => {
    const run = await start('fbSpace');
    expect(run.status).toBe('FINISHED');
    const counts = Object.fromEntries(run.stages.map(it => [it.stage, [it.status, it.count]]));
    expect(counts).toEqual({
      space: ['DONE', 1],
      locales: ['DONE', 2],
      environments: ['DONE', 1],
      tokens: ['DONE', 2],
      webhooks: ['DONE', 1],
      translations: ['DONE', 2],
      schemas: ['DONE', 1],
      assets: ['DONE', 3],
      contents: ['DONE', 3],
      contentMigration: ['DONE', 1],
    });

    const [space] = await t.db.select().from(spaces).where(eq(spaces.id, run.spaceId!));
    expect(space).toMatchObject({ name: 'Site', legacyId: 'fbSpace', importStatus: null, environments: [{ name: 'Preview', url: 'https://preview.example.com' }] });

    expect((await t.db.select().from(tokens).where(eq(tokens.spaceId, space.id))).map(it => it.token).sort()).toEqual(['TOKENV1000000000000A', 'TOKENV2000000000000B']);
    expect((await t.db.select().from(webhooks).where(eq(webhooks.spaceId, space.id)))[0]).toMatchObject({ enabled: false, secret: 's' });
    expect((await t.db.select().from(translations).where(eq(translations.spaceId, space.id))).map(it => it.key).sort()).toEqual(['bye', 'greeting']);
    expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, space.id)))[0].name).toBe('page');

    const rows = await t.db.select().from(assets).where(eq(assets.spaceId, space.id));
    const folder = rows.find(it => it.legacyId === 'f1')!;
    const file = rows.find(it => it.legacyId === 'a1')!;
    expect(file).toMatchObject({ id: expect.stringMatching(UUID_V7), parentPath: folder.id, md5: createHash('md5').update(photo).digest('base64') });
    const served = await t.request({ method: 'GET', url: `/api/v1/spaces/${space.id}/assets/${file.id}/original` });
    expect(served.rawPayload.equals(photo)).toBe(true);

    const docs = await t.db.select().from(contents).where(eq(contents.spaceId, space.id));
    const post = docs.find(it => it.fullSlug === 'blog/post')!;
    const home = docs.find(it => it.fullSlug === 'home')!;
    expect(post.publishedAt).toBeNull();
    expect(post.data).toMatchObject({ hero: { kind: 'ASSET', uri: file.id }, next: { kind: 'LINK', type: 'content', uri: home.id }, lost: { kind: 'REFERENCE', uri: 'deleted' } });
    expect(post).toMatchObject({ assets: [file.id], links: [home.id], references: ['deleted'] });

    const warnings = run.stages.flatMap(it => it.warnings ?? []).join('\n');
    expect(warnings).toMatch(/missing: no file/); // a2 has no file in Firebase
    expect(warnings).toMatch(/keeps an unmapped parent folder 'gone'/); // a2's parent folder is missing
    expect(warnings).toMatch(/home: data is not valid JSON/);
    expect(warnings).toMatch(/blog\/post: no content 'deleted'/);
  });

  it('imports an empty space', async () => {
    const run = await start('empty');
    expect(run.status).toBe('FINISHED');
    expect(run.stages.every(it => it.status === 'DONE')).toBe(true);
    expect(run.stages.find(it => it.stage === 'contents')!.count).toBe(0);
  });

  it('records the failing stage and keeps the space flagged', async () => {
    const failing = await fakeFirebase([{ ...site, id: 'fbFail' }], { failAfterFiles: 0 });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: failing.url, sourceSpaceId: 'fbFail', sourceSpaceName: 'Site', status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(failing.url, 'migration-secret'), 'fbFail');
    await failing.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FAILED');
    expect(run.error).toMatchObject({ stage: 'assets', message: expect.stringContaining('asset') });
    expect(run.stages.find(it => it.stage === 'translations')!.status).toBe('DONE');
    expect(run.stages.find(it => it.stage === 'assets')!.status).toBe('FAILED');
    expect(run.stages.find(it => it.stage === 'contents')!.status).toBe('PENDING');
    const [space] = await t.db.select().from(spaces).where(eq(spaces.id, run.spaceId!));
    expect(space.importStatus).toBe('FAILED');
  });
});
```

The three warning lines above also pin the Review Focus items "unmapped parent folder" and "invalid JSON data".

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run test/firebase-import.test.ts`
Expected: FAIL, cannot find module `firebase-import.runner.js`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/server/src/modules/firebase-import/firebase-docs.ts

/** Firestore values as the migration API returns them (ISO strings), or `{ seconds }` objects in older data. */
export function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value);
  if (value && typeof value === 'object') {
    const seconds = (value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return undefined;
}

export const str = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
export const strings = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((it): it is string => typeof it === 'string') : null;
export const obj = <T>(value: unknown): T | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : null);

export function timestamps(data: Record<string, unknown>): { createdAt: Date; updatedAt: Date } {
  const createdAt = toDate(data['createdAt']) ?? new Date();
  return { createdAt, updatedAt: toDate(data['updatedAt']) ?? createdAt };
}

/** Content `data` as Firestore stored it: an object, or a JSON string. */
export function parseData(value: unknown): { data: Record<string, unknown> | null; invalid: boolean } {
  if (typeof value === 'string') {
    try {
      return { data: JSON.parse(value) as Record<string, unknown>, invalid: false };
    } catch {
      return { data: null, invalid: true };
    }
  }
  return { data: obj<Record<string, unknown>>(value), invalid: false };
}
```

```ts
// apps/server/src/modules/firebase-import/firebase-import.runner.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { FirebaseImportStage, FirebaseImportStageName, Locale } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { newUuid } from '../../infra/database/id.js';
import { assets, contents, firebaseImports, schemas, spaces, tokens, translations, webhooks } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../assets/asset-metadata.service.js';
import { FirebaseClient, type FirebaseDoc } from './firebase-client.js';
import { obj, parseData, str, strings, timestamps } from './firebase-docs.js';
import { ReferenceMaps, rewriteData, rewriteIds } from './rewrite-references.js';

const MAX_WARNINGS = 50;

class StageFailure extends Error {
  constructor(
    readonly stage: FirebaseImportStageName,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Executes one import run (Admin → Spaces → Import from Firebase): the stages of the spec in order, each recorded on
 * the `firebase_imports` row as it progresses. The space is created first and flagged `IMPORTING`; a failure leaves it
 * flagged `FAILED` for inspection and records the failing stage.
 */
@Injectable()
export class FirebaseImportRunner {
  private readonly logger = new Logger(FirebaseImportRunner.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
    private readonly events: EventsService,
  ) {}

  async execute(runId: string, client: FirebaseClient, sourceSpaceId: string): Promise<void> {
    const [run] = await this.db.select().from(firebaseImports).where(eq(firebaseImports.id, runId));
    const stages: FirebaseImportStage[] = run.stages.map(it => ({ ...it }));
    let current: FirebaseImportStageName = 'space';
    let spaceId: string | undefined;
    const save = (extra: Partial<typeof firebaseImports.$inferInsert> = {}) =>
      this.db.update(firebaseImports).set({ stages, ...extra }).where(eq(firebaseImports.id, runId));
    const stage = (name: FirebaseImportStageName) => stages.find(it => it.stage === name)!;
    const begin = async (name: FirebaseImportStageName) => {
      current = name;
      stage(name).status = 'RUNNING';
      await save();
    };
    const done = async (name: FirebaseImportStageName, count: number) => {
      Object.assign(stage(name), { status: 'DONE', count });
      await save();
    };
    const warn = (name: FirebaseImportStageName, message: string) => {
      const it = stage(name);
      it.warningCount = (it.warningCount ?? 0) + 1;
      if ((it.warnings ??= []).length < MAX_WARNINGS) it.warnings.push(message);
    };

    try {
      // 1 space
      await begin('space');
      const source = await client.space(sourceSpaceId);
      spaceId = newUuid(timestamps(source).createdAt);
      const locales = (Array.isArray(source['locales']) ? source['locales'] : []) as Locale[];
      const fallback = obj<Locale>(source['localeFallback']) ?? locales[0] ?? { id: 'en', name: 'English' };
      await this.db.insert(spaces).values({
        id: spaceId,
        legacyId: sourceSpaceId,
        name: str(source['name']) ?? sourceSpaceId,
        locales: locales.length ? locales : [fallback],
        localeFallback: fallback,
        importStatus: 'IMPORTING',
        ...timestamps(source),
      });
      await save({ spaceId });
      await done('space', 1);
      const sid = spaceId;

      // 2 locales, 3 environments (set with the space; counted separately for the progress view)
      await begin('locales');
      await done('locales', locales.length);
      await begin('environments');
      const environments = Array.isArray(source['environments']) ? (source['environments'] as { name: string; url: string }[]) : [];
      if (environments.length) await this.db.update(spaces).set({ environments }).where(eq(spaces.id, sid));
      await done('environments', environments.length);

      // 4 tokens
      await begin('tokens');
      const tokenDocs = await client.list(sourceSpaceId, 'tokens');
      for (const doc of tokenDocs) {
        const [taken] = await this.db
          .select({ space: spaces.name })
          .from(tokens)
          .innerJoin(spaces, eq(spaces.id, tokens.spaceId))
          .where(eq(tokens.token, doc.id));
        if (taken) throw new StageFailure('tokens', `Token '${str(doc['name']) ?? doc.id}' already exists in space '${taken.space}'`);
        await this.db.insert(tokens).values({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: sid,
          token: doc.id,
          name: str(doc['name']) ?? 'Token',
          version: typeof doc['version'] === 'number' ? doc['version'] : null,
          permissions: strings(doc['permissions']),
          cacheTtl: typeof doc['cacheTtl'] === 'number' ? doc['cacheTtl'] : null,
          ...timestamps(doc),
        });
      }
      await done('tokens', tokenDocs.length);

      // 5 webhooks, disabled: both environments may run in parallel
      await begin('webhooks');
      const hookDocs = await client.list(sourceSpaceId, 'webhooks');
      for (const doc of hookDocs) {
        await this.db.insert(webhooks).values({
          id: newUuid(timestamps(doc).createdAt),
          spaceId: sid,
          name: str(doc['name']) ?? 'Webhook',
          url: str(doc['url']) ?? '',
          enabled: false,
          events: strings(doc['events']) ?? [],
          headers: obj<Record<string, string>>(doc['headers']),
          secret: str(doc['secret']),
          ...timestamps(doc),
        });
      }
      await done('webhooks', hookDocs.length);

      // 6 translations
      await begin('translations');
      let translationCount = 0;
      for await (const page of client.pages(sourceSpaceId, 'translations')) {
        await this.db.insert(translations).values(
          page.map(doc => ({
            id: newUuid(timestamps(doc).createdAt),
            spaceId: sid,
            key: doc.id,
            type: str(doc['type']) ?? 'STRING',
            locales: obj<Record<string, string>>(doc['locales']) ?? {},
            labels: strings(doc['labels']),
            description: str(doc['description']),
            ...timestamps(doc),
          })),
        );
        translationCount += page.length;
        stage('translations').count = translationCount;
        await save();
      }
      await done('translations', translationCount);

      // 7 schemas
      await begin('schemas');
      const schemaDocs = await client.list(sourceSpaceId, 'schemas');
      if (schemaDocs.length) {
        await this.db.insert(schemas).values(
          schemaDocs.map(doc => ({
            id: newUuid(timestamps(doc).createdAt),
            spaceId: sid,
            name: doc.id,
            type: str(doc['type']) ?? 'ROOT',
            displayName: str(doc['displayName']),
            description: str(doc['description']),
            labels: strings(doc['labels']),
            previewField: str(doc['previewField']),
            fields: Array.isArray(doc['fields']) ? (doc['fields'] as unknown[]) : null,
            values: Array.isArray(doc['values']) ? (doc['values'] as { name: string; value: string }[]) : null,
            ...timestamps(doc),
          })),
        );
      }
      await done('schemas', schemaDocs.length);

      // 8 assets: ids first, so folder paths can be mapped; then rows and files
      await begin('assets');
      const assetDocs: FirebaseDoc[] = [];
      for await (const page of client.pages(sourceSpaceId, 'assets')) assetDocs.push(...page);
      const assetIds = new Map(assetDocs.map(doc => [doc.id, newUuid(timestamps(doc).createdAt)]));
      const files = assetDocs.filter(doc => doc['kind'] === 'FILE');
      stage('assets').total = files.length;
      let assetCount = 0;
      for (const doc of assetDocs) {
        const id = assetIds.get(doc.id)!;
        const parent = typeof doc['parentPath'] === 'string' ? doc['parentPath'] : '';
        const parentPath = parent
          .split('/')
          .filter(Boolean)
          .map(segment => {
            const mapped = assetIds.get(segment);
            if (!mapped) warn('assets', `${str(doc['name']) ?? doc.id}: keeps an unmapped parent folder '${segment}'`);
            return mapped ?? segment;
          })
          .join('/');
        const isFile = doc['kind'] === 'FILE';
        let stored: { size: number; md5: string } | undefined;
        let extracted: { metadata?: Record<string, unknown>; alt?: string } | undefined;
        if (isFile) {
          const stream = await client.assetFile(sourceSpaceId, doc.id).catch(error => {
            throw new StageFailure('assets', `Downloading asset '${str(doc['name']) ?? doc.id}' failed: ${(error as Error).message}`);
          });
          if (stream) {
            const key = `spaces/${sid}/assets/${id}/original`;
            stored = await this.storage.put(key, stream);
            if (!obj(doc['metadata'])) extracted = await this.metadata.extract(key, str(doc['type']) ?? 'application/octet-stream', str(doc['alt']));
          } else {
            warn('assets', `${str(doc['name']) ?? doc.id}: no file in Firebase, the asset is kept without it`);
          }
        }
        await this.db.insert(assets).values({
          id,
          spaceId: sid,
          legacyId: doc.id,
          kind: isFile ? 'FILE' : 'FOLDER',
          name: str(doc['name']) ?? doc.id,
          parentPath,
          extension: isFile ? (typeof doc['extension'] === 'string' ? doc['extension'] : '') : null,
          type: isFile ? str(doc['type']) : null,
          size: isFile ? (stored?.size ?? (typeof doc['size'] === 'number' ? doc['size'] : null)) : null,
          md5: stored?.md5 ?? null,
          alt: str(doc['alt']) ?? extracted?.alt ?? null,
          source: str(doc['source']),
          metadata: obj<Record<string, unknown>>(doc['metadata']) ?? extracted?.metadata ?? null,
          inProgress: false,
          ...timestamps(doc),
        });
        assetCount++;
        if (assetCount % 50 === 0) {
          stage('assets').count = assetCount;
          await save();
        }
      }
      await done('assets', assetCount);

      // 9 contents, as stored; references are rewritten in the next stage
      await begin('contents');
      const contentDocs: FirebaseDoc[] = [];
      for await (const page of client.pages(sourceSpaceId, 'contents')) contentDocs.push(...page);
      const contentIds = new Map(contentDocs.map(doc => [doc.id, newUuid(timestamps(doc).createdAt)]));
      for (const doc of contentDocs) {
        const isDocument = doc['kind'] === 'DOCUMENT';
        const slug = str(doc['slug']) ?? doc.id;
        const parentSlug = typeof doc['parentSlug'] === 'string' ? doc['parentSlug'] : '';
        const fullSlug = str(doc['fullSlug']) ?? (parentSlug ? `${parentSlug}/${slug}` : slug);
        const parsed = isDocument ? parseData(doc['data']) : { data: null, invalid: false };
        if (parsed.invalid) warn('contents', `${fullSlug}: data is not valid JSON, imported empty`);
        await this.db.insert(contents).values({
          id: contentIds.get(doc.id)!,
          spaceId: sid,
          kind: isDocument ? 'DOCUMENT' : 'FOLDER',
          name: str(doc['name']) ?? slug,
          slug,
          parentSlug,
          fullSlug,
          schema: isDocument ? str(doc['schema']) : null,
          data: parsed.data,
          assets: strings(doc['assets']),
          links: strings(doc['links']),
          references: strings(doc['references']),
          publishedAt: null,
          updatedBy: obj<{ name: string; email: string }>(doc['updatedBy']),
          ...timestamps(doc),
        });
      }
      await done('contents', contentDocs.length);

      // 10 content migration
      await begin('contentMigration');
      const maps: ReferenceMaps = { assets: assetIds, contents: contentIds };
      const rows = await this.db.select().from(contents).where(eq(contents.spaceId, sid));
      let rewritten = 0;
      for (const row of rows) {
        const data = rewriteData(row.data, maps);
        const assetRefs = rewriteIds(row.assets, maps.assets, 'asset');
        const links = rewriteIds(row.links, maps.contents, 'content');
        const references = rewriteIds(row.references, maps.contents, 'content');
        const missing = new Set([...data.missing, ...assetRefs.missing, ...links.missing, ...references.missing].map(it => `${it.kind} '${it.id}'`));
        for (const it of missing) warn('contentMigration', `${row.fullSlug}: no ${it}`);
        if (data.changed || assetRefs.changed || links.changed || references.changed) {
          await this.db
            .update(contents)
            .set({ data: data.value as Record<string, unknown> | null, assets: assetRefs.value, links: links.value, references: references.value })
            .where(eq(contents.id, row.id));
          rewritten++;
        }
      }
      await done('contentMigration', rewritten);

      await this.db
        .update(spaces)
        .set({ importStatus: null, contentVersion: sql`${spaces.contentVersion} + 1`, translationVersion: sql`${spaces.translationVersion} + 1` })
        .where(eq(spaces.id, sid));
      await save({ status: 'FINISHED', finishedAt: new Date() });
      await this.events.publish({ spaceId: null, entity: 'spaces', id: sid, op: 'created' });
    } catch (error) {
      const failedStage = error instanceof StageFailure ? error.stage : current;
      const message = (error as Error).message;
      this.logger.warn(`Import ${runId} failed at ${failedStage}: ${message}`);
      Object.assign(stage(failedStage), { status: 'FAILED', error: message });
      await save({ status: 'FAILED', error: { stage: failedStage, message }, finishedAt: new Date() });
      if (spaceId) await this.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, spaceId));
    }
  }
}
```

Register in a new module (also used by B7):

```ts
// apps/server/src/modules/firebase-import/firebase-import.module.ts
import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module.js';
import { FirebaseImportRunner } from './firebase-import.runner.js';

@Module({
  imports: [AssetsModule],
  providers: [FirebaseImportRunner],
  exports: [FirebaseImportRunner],
})
export class FirebaseImportModule {}
```

Add `FirebaseImportModule` to `AppModule` imports (after `TasksModule`) and make sure `AssetsModule` exports `AssetMetadataService` (add it to `exports` if it is not there).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/server && npx vitest run test/firebase-import.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): import a Firebase space stage by stage, rewriting references"
```

### Task B7: Admin import API

**Files:**
- Create: `apps/server/src/modules/firebase-import/firebase-import.controller.ts`, `apps/server/src/modules/firebase-import/firebase-import.service.ts`
- Modify: `apps/server/src/auth/decorators.ts` (`RequireAdmin`), `apps/server/src/auth/auth.guard.ts` (handle it), `apps/server/src/modules/firebase-import/firebase-import.module.ts`
- Test: `apps/server/test/app-firebase-import.test.ts`

**Interfaces:**
- Consumes: `FirebaseClient`, `FirebaseConnectionError`, `normalizeOrigin` (B5); `FirebaseImportRunner.execute` (B6).
- Produces: `RequireAdmin()` decorator; endpoints of the spec's "Import API" table; `FirebaseImportService.failInterrupted()` run at bootstrap.

- [ ] **Step 1: Write the failing test**

```ts
// apps/server/test/app-firebase-import.test.ts
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { newUuid } from '../src/infra/database/id.js';
import { firebaseImports, spaces } from '../src/infra/database/schema.js';
import { FirebaseImportService } from '../src/modules/firebase-import/firebase-import.service.js';
import { fakeFirebase } from './fake-firebase.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

const base = '/api/app/admin/firebase-import';

describe('app API: import from Firebase', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let fake: Awaited<ReturnType<typeof fakeFirebase>>;

  beforeAll(async () => {
    fake = await fakeFirebase([
      { id: 'fbA', name: 'Site A', doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' } },
      { id: 'fbB', name: 'Site B', doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' } },
    ]);
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'custom', permissions: ['SPACE_MANAGEMENT'] }));
  });
  afterAll(async () => {
    await t?.close();
    await fake?.close();
  });

  const connection = () => ({ origin: fake.url, token: 'migration-secret' });
  const waitFor = async (id: string) => {
    for (let i = 0; i < 100; i++) {
      const run = (await admin.get(`${base}/${id}`)).json();
      if (run.status !== 'RUNNING') return run;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('import did not finish');
  };

  it('is for admins only', async () => {
    expect((await manager.post(`${base}/spaces`, connection())).statusCode).toBe(403);
    expect((await manager.get(base)).statusCode).toBe(403);
  });

  it('names connection failures with 502', async () => {
    const wrong = await admin.post(`${base}/spaces`, { origin: fake.url, token: 'wrong' });
    expect(wrong.statusCode).toBe(502);
    expect(wrong.json().message).toMatch(/token was refused/);
    expect((await admin.post(`${base}/spaces`, { origin: 'http://127.0.0.1:1', token: 'x' })).statusCode).toBe(502);
    expect((await admin.post(`${base}/spaces`, { origin: 'http://cms.example.com', token: 'x' })).statusCode).toBe(400);
  });

  it('lists the spaces, imports one, then marks it imported', async () => {
    const list = (await admin.post(`${base}/spaces`, connection())).json();
    expect(list).toEqual([
      { id: 'fbA', name: 'Site A', createdAt: '2025-01-01T00:00:00.000Z', importedAs: null },
      { id: 'fbB', name: 'Site B', createdAt: '2025-01-01T00:00:00.000Z', importedAs: null },
    ]);
    const started = await admin.post(base, { ...connection(), spaceId: 'fbA' });
    expect(started.statusCode).toBe(202);
    expect(started.json()).not.toHaveProperty('token');
    const run = await waitFor(started.json().id);
    expect(run).toMatchObject({ status: 'FINISHED', sourceSpaceId: 'fbA', sourceSpaceName: 'Site A', startedBy: { email: 'admin@example.com' } });
    const again = (await admin.post(`${base}/spaces`, connection())).json();
    expect(again[0].importedAs).toEqual({ id: run.spaceId, name: 'Site A' });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbA' })).statusCode).toBe(409);
    expect((await admin.get(base)).json()[0]).toMatchObject({ id: run.id });
    const rows = await t.db.select().from(firebaseImports);
    expect(JSON.stringify(rows)).not.toContain('migration-secret');
  });

  it('refuses a second import while one is running', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: 'https://other.example.com', sourceSpaceId: 'x', sourceSpaceName: 'x', status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Other', email: 'other@example.com' },
    });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbB' })).statusCode).toBe(409);
    await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
  });

  it('marks a run interrupted by a restart as failed', async () => {
    const id = newUuid();
    const spaceId = newUuid();
    await t.db.insert(spaces).values({ id: spaceId, name: 'Half', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' }, importStatus: 'IMPORTING' });
    await t.db.insert(firebaseImports).values({
      id, origin: fake.url, sourceSpaceId: 'fbB', sourceSpaceName: 'Site B', spaceId, status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: stage === 'space' ? ('DONE' as const) : stage === 'locales' ? ('RUNNING' as const) : ('PENDING' as const), count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportService).failInterrupted();
    const run = (await admin.get(`${base}/${id}`)).json();
    expect(run).toMatchObject({ status: 'FAILED', error: { stage: 'locales', message: 'Interrupted by a server restart' } });
    expect((await t.db.select().from(spaces).where(eq(spaces.id, spaceId)))[0].importStatus).toBe('FAILED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/server && npx vitest run test/app-firebase-import.test.ts`
Expected: FAIL, cannot find module `firebase-import.service.js`.

- [ ] **Step 3: Implement**

`decorators.ts`:

```ts
export type RequiredAccess =
  | { kind: 'admin' }
  | { kind: 'anyRole' }
  | { kind: 'anyOf'; permissions: UserPermission[] }
  | { kind: 'allOf'; permissions: UserPermission[] };

/** The `admin` role only — e.g. importing spaces from a Firebase environment. */
export const RequireAdmin = () => SetMetadata(REQUIRED_ACCESS, { kind: 'admin' } satisfies RequiredAccess);
```

`auth.guard.ts`, the `allowed` expression:

```ts
    const allowed =
      access.kind === 'admin'
        ? principal.role === 'admin'
        : access.kind === 'anyRole'
          ? hasAnyRole(principal)
          : access.kind === 'anyOf'
            ? access.permissions.some(permission => canPerform(principal, permission))
            : access.permissions.every(permission => canPerform(principal, permission));
```

```ts
// apps/server/src/modules/firebase-import/firebase-import.service.ts
import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { FIREBASE_IMPORT_STAGES, type FirebaseImport, type FirebaseSourceSpace } from '@localess/shared';
import type { UserRow } from '../../auth/users/users.service.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { firebaseImports, spaces } from '../../infra/database/schema.js';
import { FirebaseClient, FirebaseConnectionError } from './firebase-client.js';
import { FirebaseImportRunner } from './firebase-import.runner.js';

type Row = typeof firebaseImports.$inferSelect;
const isUniqueViolation = (error: unknown) =>
  (error as { cause?: { code?: string } })?.cause?.code === '23505' || (error as { code?: string })?.code === '23505';

export const toFirebaseImport = (row: Row): FirebaseImport => ({
  id: row.id,
  origin: row.origin,
  sourceSpaceId: row.sourceSpaceId,
  sourceSpaceName: row.sourceSpaceName,
  ...(row.spaceId ? { spaceId: row.spaceId } : {}),
  status: row.status as FirebaseImport['status'],
  stages: row.stages,
  ...(row.error ? { error: row.error } : {}),
  startedBy: row.startedBy,
  startedAt: row.startedAt.toISOString(),
  ...(row.finishedAt ? { finishedAt: row.finishedAt.toISOString() } : {}),
});

/** Admin → Spaces → Import from Firebase: one run at a time per install, runs kept as history. */
@Injectable()
export class FirebaseImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseImportService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly runner: FirebaseImportRunner,
  ) {}

  onApplicationBootstrap(): Promise<void> {
    return this.failInterrupted();
  }

  /** A run still RUNNING at boot was cut off by a restart: failed at the stage it reached. */
  async failInterrupted(): Promise<void> {
    const running = await this.db.select().from(firebaseImports).where(eq(firebaseImports.status, 'RUNNING'));
    for (const run of running) {
      const current = run.stages.find(it => it.status === 'RUNNING') ?? run.stages.find(it => it.status === 'PENDING') ?? run.stages[0];
      const message = 'Interrupted by a server restart';
      const stages = run.stages.map(it => (it.stage === current.stage ? { ...it, status: 'FAILED' as const, error: message } : it));
      await this.db
        .update(firebaseImports)
        .set({ status: 'FAILED', stages, error: { stage: current.stage, message }, finishedAt: new Date() })
        .where(eq(firebaseImports.id, run.id));
      if (run.spaceId) await this.db.update(spaces).set({ importStatus: 'FAILED' }).where(eq(spaces.id, run.spaceId));
    }
  }

  private client(origin: string, token: string): FirebaseClient {
    try {
      return new FirebaseClient(origin, token);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  async sourceSpaces(origin: string, token: string): Promise<FirebaseSourceSpace[]> {
    let remote: Awaited<ReturnType<FirebaseClient['spaces']>>;
    try {
      remote = await this.client(origin, token).spaces();
    } catch (error) {
      if (error instanceof FirebaseConnectionError) throw new BadGatewayException(error.message);
      throw error;
    }
    const imported = remote.length
      ? await this.db
          .select({ id: spaces.id, name: spaces.name, legacyId: spaces.legacyId })
          .from(spaces)
          .where(inArray(spaces.legacyId, remote.map(it => it.id)))
      : [];
    return remote.map(it => {
      const local = imported.find(row => row.legacyId === it.id);
      return { id: it.id, name: it.name, ...(it.createdAt ? { createdAt: it.createdAt } : {}), importedAs: local ? { id: local.id, name: local.name } : null };
    });
  }

  async start(origin: string, token: string, sourceSpaceId: string, user: UserRow): Promise<FirebaseImport> {
    const client = this.client(origin, token);
    const [existing] = await this.db.select({ name: spaces.name }).from(spaces).where(eq(spaces.legacyId, sourceSpaceId));
    if (existing) throw new ConflictException(`This space is already imported as '${existing.name}'`);
    let source: { id: string; name: string } | undefined;
    try {
      source = (await client.spaces()).find(it => it.id === sourceSpaceId);
    } catch (error) {
      if (error instanceof FirebaseConnectionError) throw new BadGatewayException(error.message);
      throw error;
    }
    if (!source) throw new NotFoundException('No such space in the Firebase environment');
    const id = newUuid();
    try {
      await this.db.insert(firebaseImports).values({
        id,
        origin: client.origin,
        sourceSpaceId,
        sourceSpaceName: source.name,
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: user.displayName ?? user.email, email: user.email },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Another import is running');
      throw error;
    }
    // In the background: the caller polls GET /:id. The runner records every outcome itself.
    void this.runner.execute(id, client, sourceSpaceId).catch(error => this.logger.error(error));
    return this.get(id);
  }

  async list(): Promise<FirebaseImport[]> {
    return (await this.db.select().from(firebaseImports).orderBy(desc(firebaseImports.startedAt))).map(toFirebaseImport);
  }

  async get(id: string): Promise<FirebaseImport> {
    const [row] = isUuid(id) ? await this.db.select().from(firebaseImports).where(eq(firebaseImports.id, id)) : [];
    if (!row) throw new NotFoundException('Import not found');
    return toFirebaseImport(row);
  }
}
```

```ts
// apps/server/src/modules/firebase-import/firebase-import.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { RequireAdmin } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import type { UserRow } from '../../auth/users/users.service.js';
import { UuidParamPipe } from '../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { FirebaseImportService } from './firebase-import.service.js';

const connection = z.object({ origin: z.string().min(1).max(2048), token: z.string().min(1).max(500) });
const startSchema = connection.extend({ spaceId: z.string().min(1).max(128) });

/** Admin → Spaces → Import from Firebase. The migration token is used for the request and never stored. */
@Controller('api/app/admin/firebase-import')
@RequireAdmin()
export class FirebaseImportController {
  constructor(private readonly imports: FirebaseImportService) {}

  @Post('spaces')
  @HttpCode(200)
  spaces(@Body(new ZodValidationPipe(connection)) body: z.infer<typeof connection>) {
    return this.imports.sourceSpaces(body.origin, body.token);
  }

  @Post()
  @HttpCode(202)
  start(@Body(new ZodValidationPipe(startSchema)) body: z.infer<typeof startSchema>, @CurrentUser() user: UserRow) {
    return this.imports.start(body.origin, body.token, body.spaceId, user);
  }

  @Get()
  list() {
    return this.imports.list();
  }

  @Get(':id')
  get(@Param('id', UuidParamPipe) id: string) {
    return this.imports.get(id);
  }
}
```

Module: add `controllers: [FirebaseImportController]` and `FirebaseImportService` to `providers`.

- [ ] **Step 4: Run tests**

Run: `cd apps/server && npx vitest run test/app-firebase-import.test.ts test/firebase-import.test.ts && cd ../.. && pnpm server:build && pnpm server:test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): admin API to import a space from a Firebase environment"
```

### Task B8: Admin UI — Import from Firebase

**Files:**
- Create: `apps/web/src/app/core/services/firebase-import.service.ts` (+ `.spec.ts`)
- Create: `apps/web/src/app/features/admin/spaces/firebase-import-dialog/firebase-import-dialog.component.{ts,html,spec.ts}`
- Create: `apps/web/src/app/features/admin/spaces/firebase-import-progress/firebase-import-progress.component.{ts,html,spec.ts}`
- Create: `apps/web/src/app/features/admin/spaces/firebase-imports-dialog/firebase-imports-dialog.component.{ts,html,spec.ts}`
- Modify: `apps/web/src/app/features/admin/spaces/spaces.component.{ts,html,spec.ts}` (buttons, badges, block opening an importing/failed space), `apps/web/src/app/features/spaces/settings/...` general settings component (show "Imported from Firebase: `<legacyId>`")

**Interfaces:**
- Consumes: shared `FirebaseImport`, `FirebaseSourceSpace`, `FIREBASE_IMPORT_STAGES` (B3); endpoints (B7).
- Produces: `FirebaseImportService` with `sourceSpaces(origin, token): Observable<FirebaseSourceSpace[]>`, `start(origin, token, spaceId): Observable<FirebaseImport>`, `findAll(): Observable<FirebaseImport[]>`, `poll(id): Observable<FirebaseImport>` (every 2 s until not RUNNING, last value included).

- [ ] **Step 1: Write the failing service test**

```ts
// apps/web/src/app/core/services/firebase-import.service.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { vi } from 'vitest';
import { FirebaseImportService } from './firebase-import.service';

const BASE = '/api/app/admin/firebase-import';

describe('FirebaseImportService', () => {
  let http: HttpTestingController;
  const setup = () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(FirebaseImportService);
  };

  it('lists source spaces and starts an import with origin and token in the body', async () => {
    const service = setup();
    const spaces = firstValueFrom(service.sourceSpaces('https://cms.example.com', 't'));
    const list = http.expectOne({ method: 'POST', url: `${BASE}/spaces` });
    expect(list.request.body).toEqual({ origin: 'https://cms.example.com', token: 't' });
    list.flush([]);
    expect(await spaces).toEqual([]);
    const started = firstValueFrom(service.start('https://cms.example.com', 't', 's1'));
    const start = http.expectOne({ method: 'POST', url: BASE });
    expect(start.request.body).toEqual({ origin: 'https://cms.example.com', token: 't', spaceId: 's1' });
    start.flush({ id: 'r1', status: 'RUNNING' });
    expect(await started).toMatchObject({ id: 'r1' });
  });

  it('polls every 2 s until the run is no longer RUNNING', async () => {
    vi.useFakeTimers();
    const service = setup();
    const values = firstValueFrom(service.poll('r1').pipe(toArray()));
    http.expectOne(`${BASE}/r1`).flush({ id: 'r1', status: 'RUNNING' });
    await vi.advanceTimersByTimeAsync(2000);
    http.expectOne(`${BASE}/r1`).flush({ id: 'r1', status: 'FINISHED' });
    expect((await values).map(it => it.status)).toEqual(['RUNNING', 'FINISHED']);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @localess/web exec ng test --include src/app/core/services/firebase-import.service.spec.ts`
Expected: FAIL, cannot find `./firebase-import.service`.

- [ ] **Step 3: Implement the service**

```ts
// apps/web/src/app/core/services/firebase-import.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FirebaseImport, FirebaseSourceSpace } from '@localess/shared';
import { Observable, switchMap, takeWhile, timer } from 'rxjs';

const POLL_MS = 2000;

/** Admin → Spaces → Import from Firebase (`/api/app/admin/firebase-import`). The token is sent, never kept. */
@Injectable({ providedIn: 'root' })
export class FirebaseImportService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/app/admin/firebase-import';

  sourceSpaces(origin: string, token: string): Observable<FirebaseSourceSpace[]> {
    return this.http.post<FirebaseSourceSpace[]>(`${this.base}/spaces`, { origin, token });
  }

  start(origin: string, token: string, spaceId: string): Observable<FirebaseImport> {
    return this.http.post<FirebaseImport>(this.base, { origin, token, spaceId });
  }

  findAll(): Observable<FirebaseImport[]> {
    return this.http.get<FirebaseImport[]>(this.base);
  }

  /** The run every 2 s while RUNNING; completes after the first FINISHED or FAILED value. */
  poll(id: string): Observable<FirebaseImport> {
    return timer(0, POLL_MS).pipe(
      switchMap(() => this.http.get<FirebaseImport>(`${this.base}/${id}`)),
      takeWhile(run => run.status === 'RUNNING', true),
    );
  }
}
```

- [ ] **Step 4: Write the failing dialog/progress tests**

```ts
// apps/web/src/app/features/admin/spaces/firebase-import-dialog/firebase-import-dialog.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { FirebaseImportDialogComponent } from './firebase-import-dialog.component';

describe('FirebaseImportDialogComponent', () => {
  function setup(service: Partial<Record<keyof FirebaseImportService, unknown>>) {
    TestBed.overrideComponent(FirebaseImportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseImportService, useValue: service },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(FirebaseImportDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('connects, lists spaces with imported ones disabled, starts the selected one', () => {
    const start = vi.fn().mockReturnValue(of({ id: 'r1', status: 'RUNNING', stages: [] }));
    const component = setup({
      sourceSpaces: vi.fn().mockReturnValue(of([
        { id: 'a', name: 'A', importedAs: null },
        { id: 'b', name: 'B', importedAs: { id: 'x', name: 'B (imported)' } },
      ])),
      start,
      poll: vi.fn().mockReturnValue(of({ id: 'r1', status: 'FINISHED', stages: [] })),
    });
    component.form.setValue({ origin: 'https://cms.example.com', token: 't' });
    component.connect();
    expect(component.spaces().map(it => it.id)).toEqual(['a', 'b']);
    expect(component.isSelectable(component.spaces()[1])).toBe(false);
    component.selected.set('a');
    component.startImport();
    expect(start).toHaveBeenCalledWith('https://cms.example.com', 't', 'a');
    expect(component.run()).toMatchObject({ id: 'r1', status: 'FINISHED' });
  });

  it('shows the connection error', () => {
    const component = setup({ sourceSpaces: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'The migration token was refused' } }))) });
    component.form.setValue({ origin: 'https://cms.example.com', token: 'bad' });
    component.connect();
    expect(component.error()).toBe('The migration token was refused');
  });
});
```

```ts
// apps/web/src/app/features/admin/spaces/firebase-import-progress/firebase-import-progress.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { FirebaseImport } from '@localess/shared';
import { FirebaseImportProgressComponent } from './firebase-import-progress.component';

describe('FirebaseImportProgressComponent', () => {
  it('labels stages and formats counts with totals', () => {
    TestBed.overrideComponent(FirebaseImportProgressComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(FirebaseImportProgressComponent);
    fixture.componentRef.setInput('run', {
      status: 'RUNNING',
      stages: [{ stage: 'assets', status: 'RUNNING', count: 50, total: 120 }],
    } as unknown as FirebaseImport);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.label('contentMigration')).toBe('Content migration');
    expect(component.countText(component.run().stages[0])).toBe('50 / 120');
  });
});
```

- [ ] **Step 5: Run to verify they fail**

Run: `pnpm --filter @localess/web exec ng test --include "src/app/features/admin/spaces/firebase-import-*/**/*.spec.ts"`
Expected: FAIL, components not found.

- [ ] **Step 6: Implement the components**

```ts
// apps/web/src/app/features/admin/spaces/firebase-import-progress/firebase-import-progress.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FirebaseImport, FirebaseImportStage, FirebaseImportStageName } from '@localess/shared';

const LABELS: Record<FirebaseImportStageName, string> = {
  space: 'Space',
  locales: 'Locales',
  environments: 'Environments',
  tokens: 'Tokens',
  webhooks: 'Webhooks (imported disabled)',
  translations: 'Translations',
  schemas: 'Schemas',
  assets: 'Assets',
  contents: 'Contents',
  contentMigration: 'Content migration',
};

/** The stages of one import run: status, count, warnings and the error of a failed stage. */
@Component({
  selector: 'll-firebase-import-progress',
  templateUrl: './firebase-import-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirebaseImportProgressComponent {
  readonly run = input.required<FirebaseImport>();

  label(stage: FirebaseImportStageName): string {
    return LABELS[stage];
  }

  countText(stage: FirebaseImportStage): string {
    return stage.total !== undefined ? `${stage.count} / ${stage.total}` : `${stage.count}`;
  }
}
```

```html
<!-- firebase-import-progress.component.html -->
<ol class="flex flex-col gap-2">
  @for (stage of run().stages; track stage.stage) {
    <li class="flex flex-col rounded-md border px-3 py-2">
      <div class="flex items-center justify-between gap-2">
        <span class="font-medium">{{ label(stage.stage) }}</span>
        <span class="text-muted-foreground text-sm">{{ stage.status }} · {{ countText(stage) }}</span>
      </div>
      @if (stage.error) {
        <p class="text-destructive text-sm">{{ stage.error }}</p>
      }
      @if (stage.warningCount) {
        <details class="text-sm">
          <summary>{{ stage.warningCount }} warning(s)</summary>
          <ul class="list-disc pl-5">
            @for (warning of stage.warnings; track $index) {
              <li>{{ warning }}</li>
            }
          </ul>
        </details>
      }
    </li>
  }
</ol>
```

```ts
// apps/web/src/app/features/admin/spaces/firebase-import-dialog/firebase-import-dialog.component.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirebaseImportService } from '@core/services/firebase-import.service';
import { FirebaseImport, FirebaseSourceSpace } from '@localess/shared';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { FirebaseImportProgressComponent } from '../firebase-import-progress/firebase-import-progress.component';

/** Connect to a Firebase environment, pick one space, import it and follow its progress. */
@Component({
  selector: 'll-firebase-import-dialog',
  templateUrl: './firebase-import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, HlmButtonImports, HlmDialogImports, HlmFieldImports, HlmInputImports, FirebaseImportProgressComponent],
})
export class FirebaseImportDialogComponent {
  private readonly imports = inject(FirebaseImportService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    origin: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    token: ['', Validators.required],
  });
  readonly spaces = signal<FirebaseSourceSpace[]>([]);
  readonly selected = signal<string | undefined>(undefined);
  readonly run = signal<FirebaseImport | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly busy = signal(false);

  isSelectable(space: FirebaseSourceSpace): boolean {
    return space.importedAs === null;
  }

  connect(): void {
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.busy.set(true);
    this.imports.sourceSpaces(origin, token).subscribe({
      next: spaces => {
        this.spaces.set(spaces);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Cannot connect to the Firebase environment');
        this.busy.set(false);
      },
    });
  }

  startImport(): void {
    const spaceId = this.selected();
    if (!spaceId) return;
    const { origin, token } = this.form.getRawValue();
    this.error.set(undefined);
    this.imports.start(origin, token, spaceId).subscribe({
      next: run => {
        this.run.set(run);
        this.imports.poll(run.id).subscribe(it => this.run.set(it));
      },
      error: err => this.error.set(err?.error?.message ?? 'The import could not be started'),
    });
  }
}
```

```html
<!-- firebase-import-dialog.component.html -->
<hlm-dialog-header>
  <h2 hlmDialogTitle>Import from Firebase</h2>
</hlm-dialog-header>
@if (run(); as current) {
  <p class="text-sm">{{ current.sourceSpaceName }}: {{ current.status }}</p>
  <ll-firebase-import-progress [run]="current" />
} @else {
  <form [formGroup]="form" class="flex flex-col gap-3" (ngSubmit)="connect()">
    <div hlmField>
      <label hlmFieldLabel for="origin">Firebase environment URL</label>
      <input hlmInput id="origin" formControlName="origin" placeholder="https://cms.example.com" autocomplete="off" />
    </div>
    <div hlmField>
      <label hlmFieldLabel for="token">Migration token</label>
      <input hlmInput id="token" type="password" formControlName="token" autocomplete="off" />
      <p class="text-muted-foreground text-xs">Generated in the Firebase environment under Admin → Settings → Migration.</p>
    </div>
    <button hlmBtn type="submit" [disabled]="form.invalid || busy()">Connect</button>
  </form>
  @if (spaces().length) {
    <ul class="flex flex-col gap-1">
      @for (space of spaces(); track space.id) {
        <li>
          <label class="flex items-center gap-2" [class.opacity-50]="!isSelectable(space)">
            <input type="radio" name="space" [value]="space.id" [disabled]="!isSelectable(space)" (change)="selected.set(space.id)" />
            {{ space.name }}
            @if (space.importedAs; as imported) {
              <span class="text-muted-foreground text-xs">Imported as {{ imported.name }}</span>
            }
          </label>
        </li>
      }
    </ul>
    <button hlmBtn [disabled]="!selected()" (click)="startImport()">Import</button>
  }
}
@if (error()) {
  <p class="text-destructive text-sm">{{ error() }}</p>
}
```

`firebase-imports-dialog` (history): a component with `runs = signal<FirebaseImport[]>([])` loaded from `findAll()` in `ngOnInit`, a list of rows (origin, `sourceSpaceName`, `status`, `startedBy.email`, `startedAt | date`), and a selected run rendered with `<ll-firebase-import-progress [run]="…" />`. Its spec: `findAll` mocked with two runs, `component.runs().length === 2`, `component.select(runs[1])` sets `selectedRun()`.

`spaces.component`:

```ts
  openFirebaseImport(): void {
    this.dialog
      .open(FirebaseImportDialogComponent, { contentClass: DIALOG_WIDTH_SM })
      .closed$.pipe(take(1))
      .subscribe();
  }

  openFirebaseImports(): void {
    this.dialog.open(FirebaseImportsDialogComponent, { contentClass: DIALOG_WIDTH_SM });
  }
```

Template: two buttons next to "Add" (`Import from Firebase`, `Imports`); in the name column a badge `@if (element.importStatus === 'IMPORTING') { <span hlmBadge>Importing</span> } @else if (element.importStatus === 'FAILED') { <span hlmBadge variant="destructive">Import failed</span> }`; the row link/open action is disabled when `element.importStatus` is set. Spec: a space with `importStatus: 'FAILED'` renders the badge text and `canOpen(space)` is false.

Space settings (general tab): `@if (space.legacyId) { <p class="text-muted-foreground text-sm">Imported from Firebase: <code>{{ space.legacyId }}</code></p> }`.

- [ ] **Step 7: Run tests and build**

Run: `pnpm build && pnpm test && pnpm lint:fix`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): Admin → Spaces → Import from Firebase with stage progress and history"
```

### Task B9: Documentation

**Files:**
- Rewrite: `docs/deployment/migrate-from-firebase.md`
- Modify: `docs/roadmap/firebase-migration-uuidv7.md` (status + pointer; remove "Deferred reference migration"), `docs/roadmap/firebase-space-import.md` (status: implemented), `docs/v1-api.md` (legacy ids: asset routes only), `docs/concepts.md` (ids paragraph), `docs/features/admin/admin-spaces.md` (the import), `apps/server/README.md` (App API table row for `/api/app/admin/firebase-import`), `CLAUDE.md` (knowledge-base row for the import spec)

- [ ] **Step 1: Rewrite the operator guide** with this content:

```markdown
# Migrating from a Firebase install

Spaces move one at a time from a running Firebase-era Localess environment, from the admin UI.

1. **Firebase environment:** deploy the version with the migration API, then Admin → Settings → Migration →
   *Generate token*. Copy it (it is shown once).
2. **This install:** Admin → Spaces → *Import from Firebase*. Enter the Firebase environment's URL and the token,
   *Connect*, pick a space, *Import*. Follow the stages; warnings (files missing in Firebase, references to deleted
   documents, unreadable data) are listed per stage.
3. Repeat for each space. A space can be imported once; to repeat an import, delete the imported space first.
   A failed import leaves its space flagged *Import failed* with the failing stage; delete it and import again.
4. **After each import:** publish the space's content and translations, re-invite users, re-enable the webhooks
   (they are imported disabled), and update your SDK configuration: the new origin and the new space id. API tokens
   keep their values.
5. **Old asset URLs:** they keep working if the old host now points at this install (a custom domain you move with
   DNS); `/api/v1/spaces/<old space id>/assets/<old asset id>` redirects (301) to the new URL. On the default Firebase
   domains, keep the Firebase environment running as long as old asset URLs are in use.
6. Revoke the migration token in the Firebase environment when you are done.

Not imported: users, global settings, published snapshots (publish again), webhook logs, tasks.
```

- [ ] **Step 2: Update the other docs** as listed in **Files** (concise, matching the spec's decisions D1–D13).

- [ ] **Step 3: Verify**

Run: `pnpm build && pnpm lint:fix && grep -rn "import:firebase\|Deferred reference migration\|legacy-ids.ts" docs apps CLAUDE.md`
Expected: build clean, grep finds nothing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: importing spaces from a Firebase environment"
```

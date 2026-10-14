# API Token Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five token permissions with three prefixed token types (`public`, `preview`, `management`), split the
public API into the CDN API (`/api/v1`, `?token=`) and the Management API (`/api/manage/v1`, `Authorization: Bearer`),
enforced by guards, with an auto-generated preview token per space.

**Architecture:** Token values are `pub_`/`prv_`/`mgt_` + 32 base62 + a CRC32 checksum; every lookup goes through
`sha256(value)`, and management values are stored only as that hash. Two route decorators (`@CdnToken`, `@ManagementToken`)
attach their own guard and a `V1ExceptionFilter`; the global `AuthGuard` skips routes carrying them. A data rule writes the
preview token in the transaction that inserts a space (App API and Firebase import).

**Tech Stack:** NestJS 12 on Fastify, Drizzle + Postgres (embedded in tests), vitest, Angular 22 + Spartan/Helm, `@localess/shared`.

**Spec:** `docs/roadmap/api-token-types.md` (approved). Read it before Task 1.

## Global Constraints

- Token types, lower case in the database: `public`, `preview`, `management`; shared enum `TokenType { PUBLIC = 'public', PREVIEW = 'preview', MANAGEMENT = 'management' }`.
- Prefixes `pub_`, `prv_`, `mgt_`; value pattern `^(pub|prv|mgt)_[A-Za-z0-9]{38}$` (32 random + 6 checksum).
- CDN API stays at `/api/v1/spaces/:spaceId/…` with `?token=`; Management API at `/api/manage/v1/spaces/:spaceId/…`, `Authorization: Bearer` only.
- The CDN refuses management tokens; the Management API accepts only management tokens. On the CDN `preview` satisfies `public`.
- Management tokens: stored as `token_hash` only (`token` is null), shown once (create and regenerate responses).
- Auto preview token name: exactly `Auto Generated Preview Token`.
- No token migration; Firebase import has no `tokens` stage.
- Table names stay plural. Domain types are defined once in `@localess/shared`.
- Business checks in the service; repositories do atomic locks/checks and return results.
- Angular: OnPush, signals, `inject()`, `input()`/`output()`, `@if`/`@for`, no `standalone: true`.
- Schema changes: `pnpm --filter @localess/server db:regenerate` (rewrites `apps/server/drizzle/0000_init.sql`); tell the user to delete `.data`.
- After code changes: `pnpm build`, `pnpm lint:fix`, `pnpm server:build`.
- **Never commit** unless the user says "commit" or "push". Commit steps below are "ask the user"; when told to commit, use
  `git -c user.name="alexcibotari" -c user.email="alexandru.cibotari@gmail.com" commit …`, no `Co-Authored-By` trailer.

## Review Focus

1. `Authorization: bearer mgt_…` (lower-case scheme, RFC 7235 says case-insensitive) must work; extra spaces or a second value must not. → Task 4 test.
2. Every Management API response, errors included (401, 404, 400), carries `Cache-Control: no-store`. → Task 4 test.
3. A token of space A used on space B gets 401 on both APIs (lookup is by hash *and* space). → Task 2 (CDN) and Task 4 (Management) tests.
4. A regenerated or deleted token stops working at once on every instance although the cache is now keyed by hash. → Task 2 test.
5. The management value never leaves the server after the create/regenerate response: not in list, get, or the `tokens` change event. → Task 2 test.

---

### Task 1: Token type enum and token format

**Files:**
- Modify: `packages/shared/src/models/token.model.ts`
- Create: `apps/server/src/shared/utils/api-token-format.ts`
- Test: `apps/server/src/shared/utils/api-token-format.test.ts`

**Interfaces:**
- Produces (shared): `enum TokenType { PUBLIC = 'public', PREVIEW = 'preview', MANAGEMENT = 'management' }` (added next to `TokenPermission`, which stays until Task 6).
- Produces (server, `shared/utils/api-token-format.ts`):
  - `newApiToken(type: TokenType): string`
  - `parseApiToken(value: unknown): TokenType | undefined` — the type the prefix claims, `undefined` for a bad pattern or checksum
  - `tokenHint(value: string): string` — e.g. `mgt_…aB3x`
  - `tokenColumns(type: TokenType, value: string): { token: string | null; tokenHash: string; hint: string }`

- [ ] **Step 1: Add the enum to `packages/shared/src/models/token.model.ts`** (above `TokenPermission`):

```ts
/** What a space API token is for; its value starts with the type's prefix (`pub_`, `prv_`, `mgt_`). */
export enum TokenType {
  /** Published content and translations on the CDN API; safe in browser code. */
  PUBLIC = 'public',
  /** Drafts and published on the CDN API: preview sites, the Visual Editor. */
  PREVIEW = 'preview',
  /** The Management API (CLI, CI), `Authorization: Bearer` only; stored hashed, shown once. */
  MANAGEMENT = 'management',
}
```

- [ ] **Step 2: Write the failing test** `apps/server/src/shared/utils/api-token-format.test.ts`:

```ts
import { TokenType } from '@localess/shared';
import { describe, expect, it } from 'vitest';
import { hashToken } from '../../auth/utils/token-hash.js';
import { newApiToken, parseApiToken, tokenColumns, tokenHint } from './api-token-format.js';

describe('API token format', () => {
  it.each([
    [TokenType.PUBLIC, 'pub_'],
    [TokenType.PREVIEW, 'prv_'],
    [TokenType.MANAGEMENT, 'mgt_'],
  ])('makes %s tokens with the %s prefix, 42 characters', (type, prefix) => {
    const value = newApiToken(type);
    expect(value).toMatch(/^(pub|prv|mgt)_[A-Za-z0-9]{38}$/);
    expect(value.startsWith(prefix)).toBe(true);
    expect(parseApiToken(value)).toBe(type);
  });

  it('makes a different value every time', () => {
    expect(new Set(Array.from({ length: 100 }, () => newApiToken(TokenType.PUBLIC))).size).toBe(100);
  });

  it('rejects a value whose checksum does not match (one character changed)', () => {
    const value = newApiToken(TokenType.PREVIEW);
    const i = 10;
    const changed = value.slice(0, i) + (value[i] === 'a' ? 'b' : 'a') + value.slice(i + 1);
    expect(parseApiToken(changed)).toBeUndefined();
  });

  it('rejects another prefix, the old 20-character format, and non-strings', () => {
    const value = newApiToken(TokenType.PUBLIC);
    expect(parseApiToken(`xyz_${value.slice(4)}`)).toBeUndefined();
    expect(parseApiToken('AAAAAAAAAAAAAAAAAAAA')).toBeUndefined();
    expect(parseApiToken(undefined)).toBeUndefined();
    expect(parseApiToken(['a'])).toBeUndefined();
  });

  it('hints with the prefix and the last 4 characters', () => {
    const value = newApiToken(TokenType.MANAGEMENT);
    expect(tokenHint(value)).toBe(`mgt_…${value.slice(-4)}`);
  });

  it('keeps the value for public and preview tokens, only the hash for management ones', () => {
    const pub = newApiToken(TokenType.PUBLIC);
    expect(tokenColumns(TokenType.PUBLIC, pub)).toEqual({ token: pub, tokenHash: hashToken(pub), hint: tokenHint(pub) });
    const mgt = newApiToken(TokenType.MANAGEMENT);
    expect(tokenColumns(TokenType.MANAGEMENT, mgt)).toEqual({ token: null, tokenHash: hashToken(mgt), hint: tokenHint(mgt) });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm --filter @localess/server exec vitest run src/shared/utils/api-token-format.test.ts`
Expected: FAIL — cannot resolve `./api-token-format.js`.

- [ ] **Step 4: Implement** `apps/server/src/shared/utils/api-token-format.ts`:

```ts
import { randomInt } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { TokenType } from '@localess/shared';
import { hashToken } from '../../auth/utils/token-hash.js';

/*
 * Space API token values (docs/auth-tokens.md): `<prefix>_<32 random base62><6 base62 CRC32 checksum>`. The prefix says
 * what the token is for, so people and secret scanners can tell; the checksum rejects a mistyped or made-up value without
 * a database query. What a token may do is always read from its row, never from the prefix.
 */

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const RANDOM_LENGTH = 32;
const CHECKSUM_LENGTH = 6;
const PATTERN = /^(pub|prv|mgt)_[A-Za-z0-9]{38}$/;

const PREFIX: Record<TokenType, string> = { [TokenType.PUBLIC]: 'pub', [TokenType.PREVIEW]: 'prv', [TokenType.MANAGEMENT]: 'mgt' };
const TYPE_BY_PREFIX = new Map(Object.entries(PREFIX).map(([type, prefix]) => [prefix, type as TokenType]));

/** `n` in base62, left-padded with the zero digit: 62^6 is above 2^32, so a CRC32 always fits in 6 characters. */
function base62(n: number, length: number): string {
  let out = '';
  for (let rest = n; rest > 0; rest = Math.floor(rest / 62)) out = BASE62[rest % 62] + out;
  return out.padStart(length, BASE62[0]);
}

const checksum = (body: string) => base62(crc32(body), CHECKSUM_LENGTH);

export function newApiToken(type: TokenType): string {
  let random = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) random += BASE62[randomInt(BASE62.length)];
  const body = `${PREFIX[type]}_${random}`;
  return body + checksum(body);
}

/** The type a well-formed value claims, or undefined (wrong shape, unknown prefix, checksum mismatch). */
export function parseApiToken(value: unknown): TokenType | undefined {
  if (typeof value !== 'string' || !PATTERN.test(value)) return undefined;
  const body = value.slice(0, -CHECKSUM_LENGTH);
  if (checksum(body) !== value.slice(-CHECKSUM_LENGTH)) return undefined;
  return TYPE_BY_PREFIX.get(value.slice(0, 3));
}

/** What the token list shows instead of the value: the prefix and the last 4 characters. */
export const tokenHint = (value: string): string => `${value.slice(0, 4)}…${value.slice(-4)}`;

/** The stored columns for a new value: management tokens keep only the hash. */
export function tokenColumns(type: TokenType, value: string): { token: string | null; tokenHash: string; hint: string } {
  return { token: type === TokenType.MANAGEMENT ? null : value, tokenHash: hashToken(value), hint: tokenHint(value) };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `pnpm --filter @localess/server exec vitest run src/shared/utils/api-token-format.test.ts`
Expected: PASS (6 tests, 3 parameterised cases).

- [ ] **Step 6: Verify the build** — `pnpm shared:test && pnpm server:build`. Expected: both succeed.

- [ ] **Step 7: Ask the user whether to commit** ("feat(server): token types and the prefixed token format").

---

### Task 2: Tokens stored by type and hash

The `tokens` table, the tokens App API, the token lookup and every test seed move to types in one task, because the column
change touches all of them. The CDN and dev-tools controllers keep their hand-written checks for now (Task 4 replaces them),
with type lists instead of permission lists. The Firebase import loses its `tokens` stage here, because it wrote permissions.

**Files:**
- Modify: `apps/server/src/infra/database/schema.ts:516-541` (the `tokens` table)
- Regenerate: `apps/server/drizzle/0000_init.sql` (+ its snapshot/journal) via `db:regenerate`
- Modify: `apps/server/src/infra/database/schema-enums.test.ts:11,40`
- Modify: `apps/server/src/auth/utils/api-token.ts` (ApiToken shape; remove `validateToken`, `canPerform*`)
- Modify: `apps/server/src/auth/repositories/api-tokens.repository.ts` (lookup by hash)
- Modify: `apps/server/src/auth/services/token-auth.service.ts` (hash cache, type checks)
- Modify: `apps/server/src/modules/contents/controllers/contents.public.controller.ts:103-119`
- Modify: `apps/server/src/modules/translations/controllers/translations.public.controller.ts:41-53`
- Modify: `apps/server/src/modules/tokens/{repositories/tokens.repository.ts,services/tokens.service.ts,controllers/tokens.controller.ts}`
- Modify: `apps/server/src/shared/transformers/token.transformer.ts`
- Delete: `apps/server/src/modules/firebase-import/services/token-import.service.ts`, `apps/server/src/modules/firebase-import/repositories/token-import.repository.ts`
- Modify: `apps/server/src/modules/firebase-import/firebase-import.module.ts`, `apps/server/src/modules/firebase-import/workers/firebase-import.runner.ts:9,30,94`
- Modify: `packages/shared/src/models/firebase-import.model.ts:5,8` (drop `'tokens'`)
- Modify: `apps/web/src/app/features/admin/spaces/firebase-import-progress/firebase-import-progress.component.ts:8` (drop the `tokens` label)
- Modify: `apps/server/src/infra/database/id.ts` (remove `newTokenSecret`) and `apps/server/src/infra/database/id.test.ts`
- Test: `apps/server/test/seed.ts`, `test/app-dev-settings.test.ts`, `test/v1-cdn.test.ts`, `test/v1-dev-tools-manage.test.ts`,
  `test/content-snapshots.test.ts`, `test/translation-snapshots.test.ts`, `test/v1-import-window.test.ts`, `test/firebase-import.test.ts`,
  `test/app-firebase-import.test.ts`

**Interfaces:**
- Consumes: `TokenType`, `newApiToken`, `parseApiToken`, `tokenColumns`, `tokenHint` (Task 1); `hashToken` (`auth/utils/token-hash.ts`).
- Produces:
  - `interface ApiToken { id: string; type: TokenType; cacheTtl: number | null }` (`auth/utils/api-token.ts`)
  - `ApiTokensRepository.findByHash(spaceId: string, tokenHash: string): Promise<ApiToken | undefined>`
  - `TokenAuthService.find(spaceId, value: string)`, `findCached(spaceId, value: string)`, `invalidate(spaceId, id?)` (unchanged names; keyed by hash)
  - App API: `GET /api/app/spaces/:spaceId/tokens?type=&limit=`, `POST {name,type,cacheTtl?}` → token incl. `token`, `PUT {name,cacheTtl?}`, `POST /:id/regenerate` → token incl. `token`
  - Seed exports (`test/seed.ts`): `TOKEN_PUBLIC`, `TOKEN_READ` (preview, default TTL), `TOKEN_DRAFT` (preview, TTL 30), `TOKEN_MANAGEMENT`, `TOKEN_NO_CACHE` (public, TTL 0), `tokenRow(spaceId, type, value, name, cacheTtl?)`

- [ ] **Step 1: Rewrite the seed** — `apps/server/test/seed.ts`, replace the token constants and the `tokens` insert in `seedSpace`:

```ts
import { TokenType } from '@localess/shared';
import { newApiToken, tokenColumns } from '../src/shared/utils/api-token-format.js';

export const TOKEN_PUBLIC = newApiToken(TokenType.PUBLIC);
/** Preview, default redirect TTL: reads published and drafts. */
export const TOKEN_READ = newApiToken(TokenType.PREVIEW);
/** Preview with a 30-second redirect TTL. */
export const TOKEN_DRAFT = newApiToken(TokenType.PREVIEW);
export const TOKEN_MANAGEMENT = newApiToken(TokenType.MANAGEMENT);
export const TOKEN_NO_CACHE = newApiToken(TokenType.PUBLIC);

/** A `tokens` row for `value`. */
export const tokenRow = (spaceId: string, type: TokenType, value: string, name: string, cacheTtl: number | null = null) => ({
  id: newUuid(),
  spaceId,
  type,
  name,
  cacheTtl,
  ...tokenColumns(type, value),
});

// in seedSpace, replacing the old insert:
  await t.db.insert(tokens).values([
    tokenRow(spaceId, TokenType.PREVIEW, TOKEN_READ, 'read'),
    tokenRow(spaceId, TokenType.PUBLIC, TOKEN_PUBLIC, 'public'),
    tokenRow(spaceId, TokenType.PREVIEW, TOKEN_DRAFT, 'draft', 30),
    tokenRow(spaceId, TokenType.MANAGEMENT, TOKEN_MANAGEMENT, 'management'),
    tokenRow(spaceId, TokenType.PUBLIC, TOKEN_NO_CACHE, 'no cache', 0),
  ]);
```

Remove `TOKEN_DEV` and `TOKEN_NONE`; drop the `createHash` import if nothing else uses it.

- [ ] **Step 2: Update the tests to the new tokens and expectations (they fail until Step 6)**

`test/v1-cdn.test.ts`:
- Line 35 (`EMPTY_TOKEN`): `export`-free `const EMPTY_TOKEN = newApiToken(TokenType.PUBLIC);` and insert `tokenRow(EMPTY_SPACE, TokenType.PUBLIC, EMPTY_TOKEN, 'read')`.
- The 401 test (lines 43-53): the URL list becomes no token, `token=short`, the old format `token=ZZZZZZZZZZZZZZZZZZZZ`, a
  well-formed unknown `token=${newApiToken(TokenType.PUBLIC)}`, and a checksum-broken `token=${TOKEN_PUBLIC.slice(0, -1)}A`
  (if the last char is `A`, use `B`) — each expects the same body `{"message":"Missing or invalid API token","status":"UNAUTHENTICATED"}`.
- The 403 test (line 60-72): request `contents/${C.home}?token=${TOKEN_PUBLIC}&version=draft` and expect

```ts
expect(response.statusCode).toBe(403);
expect(response.json()).toEqual({
  details: {
    requiredTypes: ['preview'],
    reason: 'This request includes a `version` query parameter, which requires a preview token.',
    hint: 'Use a token of one of the required types.',
  },
  message: 'Token is missing a required permission',
  status: 'PERMISSION_DENIED',
});
```

- Line 79: `TOKEN_DEV` with `version=draft` now expects **403** (management tokens don't read the CDN), not 302.
- Add after the "another space" test:

```ts
it('reads published with a preview token too (preview includes public)', async () => {
  expect((await get(`/api/v1/spaces/${S1}/links?token=${TOKEN_READ}`)).statusCode).toBe(302);
});
```

`test/content-snapshots.test.ts:156`, `test/v1-import-window.test.ts`, `test/translation-snapshots.test.ts`: replace
`TOKEN_DEV` with `TOKEN_MANAGEMENT`; nothing else changes (they use `TOKEN_PUBLIC`/`TOKEN_READ`/`TOKEN_DRAFT`, which keep their roles).

`test/v1-dev-tools-manage.test.ts`: `TOKEN_DEV` → `TOKEN_MANAGEMENT` everywhere (still `?token=` and `x-api-key` in this task);
the "refuses tokens without DEV_TOOLS" test keeps `TOKEN_PUBLIC` → 403.

`test/app-dev-settings.test.ts`, replace the whole `describe('tokens', …)` block:

```ts
describe('tokens', () => {
  const base = `/api/app/spaces/${S1}/tokens`;
  const cdn = (value: string) => t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/links?token=${value}` });

  it('creates typed tokens with a UUIDv7 id and a prefixed value, for SPACE_MANAGEMENT only', async () => {
    const response = await manager.post(base, { name: 'Website', type: 'public', cacheTtl: 120 });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toMatchObject({ id: expect.stringMatching(UUID_V7), type: 'public', name: 'Website', cacheTtl: 120 });
    expect(body.token).toMatch(/^pub_[A-Za-z0-9]{38}$/);
    expect(body.hint).toBe(`pub_…${body.token.slice(-4)}`);
    expect(body).not.toHaveProperty('tokenHash');
    expect((await nobody.get(base)).statusCode).toBe(403);
    expect((await manager.post(base, { name: 'Bad', type: 'everything' })).statusCode).toBe(400);
    expect((await manager.post(base, { name: 'Bad', permissions: ['CONTENT_PUBLIC'] })).statusCode).toBe(400);
  });

  it('shows a management token once: in the create response, never in list or get', async () => {
    const created = (await manager.post(base, { name: 'CI', type: 'management' })).json();
    expect(created.token).toMatch(/^mgt_[A-Za-z0-9]{38}$/);
    expect(created.hint).toBe(`mgt_…${created.token.slice(-4)}`);
    const listed = (await manager.get(base)).json().find((it: { id: string }) => it.id === created.id);
    expect(listed).not.toHaveProperty('token');
    expect(listed.hint).toBe(created.hint);
    expect((await manager.get(`${base}/${created.id}`)).json()).not.toHaveProperty('token');
    const [row] = await t.db.select().from(tokens).where(eq(tokens.id, created.id));
    expect(row.token).toBeNull();
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a cache TTL on a management token', async () => {
    expect((await manager.post(base, { name: 'CI', type: 'management', cacheTtl: 10 })).statusCode).toBe(400);
    const created = (await manager.post(base, { name: 'CI2', type: 'management' })).json();
    expect((await manager.put(`${base}/${created.id}`, { name: 'CI2', cacheTtl: 10 })).statusCode).toBe(400);
  });

  it('filters by type', async () => {
    expect((await manager.get(`${base}?type=management&limit=1`)).json().map((it: { type: string }) => it.type)).toEqual(['management']);
    expect((await manager.get(`${base}?type=public`)).json().every((it: { type: string }) => it.type === 'public')).toBe(true);
  });

  it('keeps the type on edit: PUT takes a name and a cache TTL only', async () => {
    const created = (await manager.post(base, { name: 'Site', type: 'public' })).json();
    expect((await manager.put(`${base}/${created.id}`, { name: 'Site', type: 'preview' })).statusCode).toBe(400);
    const updated = await manager.put(`${base}/${created.id}`, { name: 'Renamed', cacheTtl: 5 });
    expect(updated.json()).toMatchObject({ id: created.id, type: 'public', name: 'Renamed', cacheTtl: 5 });
  });

  it('regenerates under a new value of the same type; the old value stops working at once', async () => {
    const created = (await manager.post(base, { name: 'Legacy', type: 'public' })).json();
    expect((await cdn(created.token)).statusCode).toBe(302); // now cached
    const response = await manager.post(`${base}/${created.id}/regenerate`);
    expect(response.json()).toMatchObject({ id: created.id, name: 'Legacy', type: 'public' });
    expect(response.json().token).toMatch(/^pub_/);
    expect(response.json().token).not.toBe(created.token);
    await eventually(async () => expect((await cdn(created.token)).statusCode).toBe(401));
    expect((await cdn(response.json().token)).statusCode).toBe(302);
  });

  it('returns a regenerated management value once', async () => {
    const created = (await manager.post(base, { name: 'CI3', type: 'management' })).json();
    const regenerated = (await manager.post(`${base}/${created.id}/regenerate`)).json();
    expect(regenerated.token).toMatch(/^mgt_/);
    expect(regenerated.token).not.toBe(created.token);
    expect((await manager.get(`${base}/${created.id}`)).json()).not.toHaveProperty('token');
  });

  it('answers 404 for an id that is not a UUID, such as a token value', async () => {
    const value = (await manager.post(base, { name: 'X', type: 'public' })).json().token;
    expect((await manager.get(`${base}/${value}`)).statusCode).toBe(404);
    expect((await manager.post(`${base}/${value}/regenerate`)).statusCode).toBe(404);
    expect((await manager.get(`${base}/${newUuid()}`)).statusCode).toBe(404);
  });

  it('revokes a token for the CDN immediately, despite its 5-minute cache', async () => {
    const token = (await manager.post(base, { name: 'Short-lived', type: 'public' })).json();
    expect((await cdn(token.token)).statusCode).toBe(302); // now cached
    expect((await manager.delete(`${base}/${token.id}`)).statusCode).toBe(204);
    await eventually(async () => expect((await cdn(token.token)).statusCode).toBe(401));
  });
});
```

Add `import { eq } from 'drizzle-orm';` if missing. Check the change event payload carries no value (Review Focus 5) in
`test/app-events.test.ts` only if it already asserts token event payloads; events carry `{ spaceId, entity, id, op }` only, so no change is needed.

`src/infra/database/schema-enums.test.ts`: import `TokenType` instead of `TokenPermission`; line 40 becomes
`['tokens', 'type', Object.values(TokenType)],`.

Add to `test/app-dev-settings.test.ts` (inside `describe('tokens')`) the schema rules:

```ts
it('enforces token rules in the database', async () => {
  const value = newApiToken(TokenType.MANAGEMENT);
  const insert = (row: object) => t.db.insert(tokens).values({ ...tokenRow(S1, TokenType.MANAGEMENT, value, 'x'), ...row });
  await expect(insert({ token: value })).rejects.toThrow(/tokens_token_check/);
  await expect(insert({ cacheTtl: 5 })).rejects.toThrow(/tokens_cache_ttl_check/);
  await expect(insert({ type: 'public', token: null })).rejects.toThrow(/tokens_token_check/);
  await insert({});
  await expect(insert({ id: newUuid() })).rejects.toThrow(/token_hash/);
});
```

(Import `tokenRow` from `./seed.js`, `newApiToken` from `../src/shared/utils/api-token-format.js`, `TokenType` from `@localess/shared`.)

`test/firebase-import.test.ts`:
- Remove `tokens` from the fake site fixture (line 25) and every `tokens: […]` override (lines 161, 195, 566).
- In the stage expectation (line 99) remove `tokens: ['DONE', 2],`.
- Remove the token assertions (lines ~117 and 195-220) and the whole test "fails at tokens when a token value already belongs to another space" (546-561).
- Add: `expect(FIREBASE_IMPORT_STAGES).not.toContain('tokens');` in the first test.

- [ ] **Step 3: Run the changed tests to see them fail**

Run: `pnpm --filter @localess/server exec vitest run test/app-dev-settings.test.ts test/v1-cdn.test.ts src/infra/database/schema-enums.test.ts`
Expected: FAIL — e.g. `column "type" of relation "tokens" does not exist` / `tokens.type` undefined in drizzle.

- [ ] **Step 4: Change the schema** — `apps/server/src/infra/database/schema.ts`, replace the `tokens` table (import `TokenType` instead of `TokenPermission` at the top):

```ts
export const tokens = pgTable(
  'tokens',
  {
    id: uuid('id').primaryKey(),
    spaceId: spaceId(),
    // `public`/`preview` read the CDN API, `management` the Management API (docs/auth-tokens.md). Never changes: the value's
    // prefix names it.
    type: text('type', { enum: values(TokenType) }).notNull(),
    name: text('name').notNull(),
    // The value (`pub_…`/`prv_…`), so the app can show and copy it; null for `management`, kept only as its hash.
    token: text('token'),
    // sha256 of the value (`hashToken()`): every lookup goes through it.
    tokenHash: text('token_hash').notNull().unique(),
    // The prefix and the last 4 characters, e.g. `mgt_…aB3x`: what the list shows.
    hint: text('hint').notNull(),
    // Seconds the `cv` redirect is cached (0: not cached); null: the default. CDN tokens only.
    cacheTtl: integer('cache_ttl'),
    ...timestamps,
  },
  t => [
    index('tokens_space_idx').on(t.spaceId, t.createdAt.desc()),
    oneOf('tokens_type_check', t.type, values(TokenType)),
    check('tokens_token_check', sql`(${t.type} = 'management') = (${t.token} is null)`),
    check('tokens_cache_ttl_check', sql`${t.type} <> 'management' or ${t.cacheTtl} is null`),
  ],
);
```

Then run `pnpm --filter @localess/server db:regenerate`. Expected: `apps/server/drizzle/0000_init.sql` now has
`"type" text NOT NULL`, `"token_hash" text NOT NULL`, `tokens_token_hash_unique`, and the three checks; no `permissions` column on `tokens`.

- [ ] **Step 5: Token lookup by hash**

`apps/server/src/auth/utils/api-token.ts` becomes:

```ts
import type { TokenType } from '@localess/shared';

/** A space API token as the public APIs see it. */
export interface ApiToken {
  /** The row's UUID, not the value. */
  id: string;
  type: TokenType;
  cacheTtl: number | null;
}
```

`apps/server/src/auth/repositories/api-tokens.repository.ts`:

```ts
/** The token with this value hash in this space. */
async findByHash(spaceId: string, tokenHash: string): Promise<ApiToken | undefined> {
  const [row] = await this.db
    .select({ id: tokens.id, type: tokens.type, cacheTtl: tokens.cacheTtl })
    .from(tokens)
    .where(and(eq(tokens.spaceId, spaceId), eq(tokens.tokenHash, tokenHash)));
  return row as ApiToken | undefined;
}
```

(remove `find`; import `hashToken` is not needed here.)

`apps/server/src/auth/services/token-auth.service.ts`: `find(spaceId, value)` returns `this.tokens.findByHash(spaceId, hashToken(value))`;
`findCached` keys the map by `${spaceId}:${hashToken(value)}` (the value itself is never kept in memory); `invalidate` unchanged.
Replace `authorize` with a type check (Task 4 deletes it):

```ts
async authorize(
  reply: FastifyReply,
  spaceId: string,
  value: unknown,
  required: TokenType[],
  options: { cached: boolean; reason?: string },
): Promise<ApiToken | undefined> {
  if (!parseApiToken(value)) {
    sendV1Error(reply, 401, 'unauthenticated', 'Missing or invalid API token');
    return undefined;
  }
  const token = options.cached ? await this.findCached(spaceId, value as string) : await this.find(spaceId, value as string);
  if (!token) {
    sendV1Error(reply, 401, 'unauthenticated', 'Missing or invalid API token');
    return undefined;
  }
  if (!required.includes(token.type)) {
    sendV1Error(reply, 403, 'permission-denied', 'Token is missing a required permission', {
      details: { requiredTypes: required, ...(options.reason ? { reason: options.reason } : {}), hint: 'Use a token of one of the required types.' },
    });
    return undefined;
  }
  return token;
}
```

`authorizeDevTools` and `authorizeApiKey` pass `[TokenType.MANAGEMENT]`.

`contents.public.controller.ts` `authorizeContent` and `translations.public.controller.ts` `translations`:

```ts
draft ? [TokenType.PREVIEW] : [TokenType.PUBLIC, TokenType.PREVIEW],
{
  cached: true,
  reason: draft
    ? 'This request includes a `version` query parameter, which requires a preview token.'
    : 'Published content requires a public or preview token.', // translations: 'Published translations require a public or preview token.'
},
```

- [ ] **Step 6: Tokens App API**

`tokens.repository.ts`: `TokenValues = Pick<TokenEntity, 'type' | 'token' | 'tokenHash' | 'hint' | 'name' | 'cacheTtl'>`;
`findAll(spaceId, filter: { type?: TokenType; limit?: number })` uses `if (filter.type) conditions.push(eq(tokens.type, filter.type));` (drop the `sql` import if unused).

`shared/transformers/token.transformer.ts`:

```ts
/** A token as the App API returns it (SPACE_MANAGEMENT only): no hash, no `spaceId`; a management token has no `token`. */
export const toToken = (entity: typeof tokens.$inferSelect) => toDto(entity, ['spaceId', 'tokenHash']);
```

`tokens.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TokenType } from '@localess/shared';
import { newApiToken, tokenColumns } from '../../../shared/utils/api-token-format.js';
import { toToken } from '../../../shared/transformers/token.transformer.js';
import { type TokenEntity, TokensRepository } from '../repositories/tokens.repository.js';

export interface TokenInput {
  name: string;
  type: TokenType;
  cacheTtl?: number | null;
}

export type TokenChange = Omit<TokenInput, 'type'>;

const NO_CACHE_FOR_MANAGEMENT = 'Management tokens are never cached: leave the cache TTL empty.';

function found(entity: TokenEntity | undefined) {
  if (!entity) throw new NotFoundException('Token not found');
  return toToken(entity);
}

/** Space API tokens. The value is returned on create and regenerate; afterwards only for public and preview tokens. */
@Injectable()
export class TokensService {
  constructor(private readonly tokens: TokensRepository) {}

  async list(spaceId: string, type?: TokenType, limit?: number) {
    return (await this.tokens.findAll(spaceId, { type, limit })).map(toToken);
  }

  async get(spaceId: string, id: string) {
    return found(await this.tokens.findById(spaceId, id));
  }

  async create(spaceId: string, input: TokenInput) {
    if (input.type === TokenType.MANAGEMENT && input.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
    const value = newApiToken(input.type);
    const entity = await this.tokens.create(spaceId, {
      type: input.type,
      name: input.name,
      cacheTtl: input.cacheTtl ?? null,
      ...tokenColumns(input.type, value),
    });
    if (!entity) throw new NotFoundException('Space not found');
    return { ...toToken(entity), token: value };
  }

  async update(spaceId: string, id: string, input: TokenChange) {
    return found(
      await this.tokens.update(spaceId, id, current => {
        if (current.type === TokenType.MANAGEMENT && input.cacheTtl != null) throw new BadRequestException(NO_CACHE_FOR_MANAGEMENT);
        return { name: input.name, cacheTtl: input.cacheTtl ?? null };
      }),
    );
  }

  /** The same token (id, type, name) under a new value, returned once. */
  async regenerate(spaceId: string, id: string) {
    let value = '';
    const entity = await this.tokens.update(spaceId, id, current => {
      value = newApiToken(current.type);
      return tokenColumns(current.type, value);
    });
    return { ...found(entity), token: value };
  }

  async delete(spaceId: string, id: string): Promise<void> {
    if (!(await this.tokens.delete(spaceId, id))) throw new NotFoundException('Token not found');
  }
}
```

`tokens.controller.ts`:

```ts
const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(TokenType),
  cacheTtl: z.number().int().min(0).max(31_536_000).nullish(),
}).strict();
const updateSchema = createSchema.omit({ type: true }).strict();
```

`list` reads `@Query('type') type?: string`; when `type` is given and not one of `Object.values(TokenType)` it throws
`new BadRequestException('Unknown token type')` (a typo is visible, not an empty list); otherwise it passes `type as TokenType | undefined`.
Add to the "filters by type" test: `expect((await manager.get(\`${base}?type=DEV_TOOLS\`)).statusCode).toBe(400);`.
`create` uses `createSchema`, `update` uses `updateSchema` (`.strict()` makes a `type` or `permissions` key a 400).

- [ ] **Step 7: Firebase import without tokens**

- Delete `token-import.service.ts` and `token-import.repository.ts`; remove them from `firebase-import.module.ts` and the runner
  (constructor parameter and line 94 `await done('tokens', …)`).
- `packages/shared/src/models/firebase-import.model.ts`: remove `'tokens'` from `FirebaseImportStageName` and `FIREBASE_IMPORT_STAGES`.
- `firebase-import-progress.component.ts`: remove `tokens: 'Tokens',`.
- `infra/database/id.ts`: delete `newTokenSecret` and its `ALPHABET`/`randomInt` import if unused; delete its test case in `id.test.ts`.
- `grep -rn "permissions\b" apps/server/src/modules/firebase-import` — no token reference remains.

- [ ] **Step 8: Run the whole server suite**

Run: `pnpm server:test`
Expected: PASS. If `v1-dev-tools-manage` fails on `x-api-key`, check it sends `TOKEN_MANAGEMENT`.

- [ ] **Step 9: Build** — `pnpm build && pnpm lint:fix && pnpm server:build`. Expected: success. (The web app still compiles:
  it uses `TokenPermission` and `Token.permissions`, which the shared package still declares; the server no longer returns
  `permissions`, so the tokens page is broken at runtime until Task 5 — acceptable inside this branch.)

- [ ] **Step 10: Tell the user to delete `.data`** (the migration was regenerated), then **ask whether to commit**
  ("feat(server): tokens stored by type and hash; Firebase import drops tokens").

---

### Task 3: Auto-generated preview token

**Files:**
- Create: `apps/server/src/shared/data-rules/space-tokens.ts`
- Modify: `apps/server/src/modules/spaces/repositories/spaces.repository.ts:37-45`
- Modify: `apps/server/src/modules/firebase-import/repositories/space-import.repository.ts:31-37`
- Test: `apps/server/test/app-spaces.test.ts`, `apps/server/test/firebase-import.test.ts`

**Interfaces:**
- Consumes: `newApiToken`, `tokenColumns` (Task 1); `tokens` table (Task 2).
- Produces: `AUTO_PREVIEW_TOKEN_NAME = 'Auto Generated Preview Token'`, `createPreviewToken(tx: Transaction, spaceId: string): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

`test/app-spaces.test.ts` (inside the describe that has an admin session; use its existing `admin` helper and `t`):

```ts
it('gives a new space one preview token, "Auto Generated Preview Token", that reads drafts', async () => {
  const space = (await admin.post('/api/app/spaces', { name: 'With token' })).json();
  const list = (await admin.get(`/api/app/spaces/${space.id}/tokens`)).json();
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ type: 'preview', name: 'Auto Generated Preview Token' });
  expect(list[0].token).toMatch(/^prv_/);
  const draft = await t.request({ method: 'GET', url: `/api/v1/spaces/${space.id}/links?version=draft&token=${list[0].token}` });
  expect(draft.statusCode).not.toBe(401);
  expect(draft.statusCode).not.toBe(403);
});

it('leaves no token behind when the space is rolled back', async () => {
  const before = (await t.db.select({ id: tokens.id }).from(tokens)).length;
  await expect(
    transaction(t.db, undefined, async tx => {
      await t.app.get(SpacesRepository).create('Rolled back', 'en', tx);
      throw new Error('boom');
    }),
  ).rejects.toThrow('boom');
  expect((await t.db.select({ id: tokens.id }).from(tokens)).length).toBe(before);
});
```

(Imports: `tokens` from `../src/infra/database/schema.js`, `transaction` from `../src/infra/database/transaction.js`,
`SpacesRepository` from `../src/modules/spaces/repositories/spaces.repository.js`; `t.app` is the Nest application.)

`test/firebase-import.test.ts`, in the first full-import test, after the space assertions:

```ts
const spaceTokens = await t.db.select().from(tokens).where(eq(tokens.spaceId, space.id));
expect(spaceTokens).toHaveLength(1);
expect(spaceTokens[0]).toMatchObject({ type: 'preview', name: 'Auto Generated Preview Token' });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @localess/server exec vitest run test/app-spaces.test.ts test/firebase-import.test.ts`
Expected: FAIL — `expected [] to have a length of 1`.

- [ ] **Step 3: Implement the data rule** `apps/server/src/shared/data-rules/space-tokens.ts`:

```ts
import { TokenType } from '@localess/shared';
import { newUuid } from '../../infra/database/id.js';
import { tokens } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';
import { newApiToken, tokenColumns } from '../utils/api-token-format.js';

/*
 * Every space starts with one preview token (docs/auth-tokens.md), so preview sites, the Visual Editor and the app's draft
 * links work without setting anything up. Whoever inserts a space (the spaces module, the Firebase import) writes it in
 * the same transaction. Afterwards it is an ordinary token: it can be renamed, regenerated or deleted.
 */

export const AUTO_PREVIEW_TOKEN_NAME = 'Auto Generated Preview Token';

export async function createPreviewToken(tx: Transaction, spaceId: string): Promise<void> {
  const value = newApiToken(TokenType.PREVIEW);
  await tx.insert(tokens).values({
    id: newUuid(),
    spaceId,
    type: TokenType.PREVIEW,
    name: AUTO_PREVIEW_TOKEN_NAME,
    ...tokenColumns(TokenType.PREVIEW, value),
  });
}
```

Call it in `SpacesRepository.create` after the `spaceLocales` insert (`await createPreviewToken(t, id);`) and in
`SpaceImportRepository.create` after its `spaceLocales` insert (`await createPreviewToken(t, space.id);`).

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm --filter @localess/server exec vitest run test/app-spaces.test.ts test/firebase-import.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite** — `pnpm server:test`. Expected: PASS. A test that counts a space's tokens or lists them right
  after creating a space through the API may now see one more; update its expected count, not the rule.

- [ ] **Step 6: Add the rule to `docs/server-architecture.md`** — the `shared/data-rules/` row (line ~116): append
  "`space-tokens.ts`: `createPreviewToken`: whoever inserts a space writes its auto-generated preview token (spaces, the Firebase import)".

- [ ] **Step 7: Build** (`pnpm build && pnpm lint:fix && pnpm server:build`), then **ask whether to commit** ("feat(server): every space starts with a preview token").

---

### Task 4: Token guards, CDN API and Management API

**Files:**
- Create: `apps/server/src/infra/http/v1/v1-error.ts` (`V1Error`, `V1ExceptionFilter`)
- Modify: `apps/server/src/infra/http/v1/v1-request.ts` (add `assertValidIdParams`)
- Modify: `apps/server/src/auth/decorators.ts` (markers), `apps/server/src/auth/auth.guard.ts` (skip token routes; CSRF by marker)
- Create: `apps/server/src/auth/token-auth.decorators.ts` (`CdnToken`, `ManagementToken`)
- Create: `apps/server/src/auth/guards/cdn-token.guard.ts`, `apps/server/src/auth/guards/management-token.guard.ts`
- Modify: `apps/server/src/auth/request-context.ts` (`apiToken`, `CurrentToken`)
- Modify: `apps/server/src/auth/services/token-auth.service.ts` (remove `authorize*`), `apps/server/src/auth/api-tokens.module.ts`
- Rename + modify: `modules/{contents,translations,assets}/controllers/*.public.controller.ts` → `*.cdn.controller.ts`
  (classes `ContentsCdnController`, `TranslationsCdnController`, `AssetsCdnController`)
- Delete: `modules/spaces/controllers/spaces.public.controller.ts`, `modules/schemas/controllers/schemas.public.controller.ts`
- Create: `modules/spaces/controllers/spaces.management.controller.ts`, `modules/schemas/controllers/schemas.management.controller.ts`,
  `modules/translations/controllers/translations.management.controller.ts`
- Modify: the five feature modules' `controllers` arrays
- Test: rename `test/v1-dev-tools-manage.test.ts` → `test/manage-api.test.ts`; modify `test/v1-cdn.test.ts`,
  `test/translation-snapshots.test.ts`, `test/auth.test.ts`

**Interfaces:**
- Consumes: `ApiToken`, `TokenAuthService.find/findCached` (Task 2); `parseApiToken` (Task 1).
- Produces:
  - `class V1Error extends Error { constructor(httpStatus: number, code: V1ErrorCode, message: string, options?: { details?: unknown; cacheControl?: string; headers?: Record<string, string> }) }`
  - `@CdnToken(rule: CdnTokenRule)`, `@ManagementToken()`; `interface CdnTokenRule { published: TokenType; draft: TokenType; reason: { published: string; draft: string } }`
  - `request.apiToken?: ApiToken`, `@CurrentToken(): ApiToken`
  - Management routes under `/api/manage/v1/spaces/:spaceId`: `GET` (space), `GET /open-api`, `GET|POST /schemas`, `GET|POST /translations/:locale`

- [ ] **Step 1: Move the dev-tools tests to the Management API (failing)**

`git mv apps/server/test/v1-dev-tools-manage.test.ts apps/server/test/manage-api.test.ts`, then:
- `describe('management API', …)`.
- Helpers:

```ts
const base = `/api/manage/v1/spaces/${S1}`;
const bearer = (value: string | null = TOKEN_MANAGEMENT) => (value ? { authorization: `Bearer ${value}` } : {});
const get = (path: string, value: string | null = TOKEN_MANAGEMENT) => t.request({ method: 'GET', url: `${base}${path}`, headers: bearer(value) });
const post = (path: string, payload: unknown, value: string | null = TOKEN_MANAGEMENT) =>
  t.request({ method: 'POST', url: `${base}${path}`, payload: payload as object, headers: bearer(value) });
```

- Every old URL maps: `/api/v1/spaces/${S1}?token=…` → `get('')`; `/open-api?token=` → `get('/open-api')`;
  `/schemas?token=` → `get('/schemas')`; `/translations/de/values?token=` → `get('/translations/de')`;
  `post(\`/api/v1/spaces/${S1}/translations/de\`, …)` → `post('/translations/de', …)`; schema push → `post('/schemas', …)`.
- The values test expects `cache-control: no-store` instead of `no-cache`.
- Replace "refuses tokens without DEV_TOOLS" and "authenticates with the X-API-KEY header only" with:

```ts
describe('authentication', () => {
  const unauthenticated = { message: 'Missing or invalid API token', status: 'UNAUTHENTICATED' };

  it.each([
    ['no header', {}],
    ['X-API-KEY', { 'x-api-key': TOKEN_MANAGEMENT }],
    ['another scheme', { authorization: `Basic ${TOKEN_MANAGEMENT}` }],
    ['a public token', { authorization: `Bearer ${TOKEN_PUBLIC}` }],
    ['a preview token', { authorization: `Bearer ${TOKEN_READ}` }],
    ['an unknown management token', { authorization: `Bearer ${newApiToken(TokenType.MANAGEMENT)}` }],
    ['two values', { authorization: `Bearer ${TOKEN_MANAGEMENT} ${TOKEN_MANAGEMENT}` }],
  ])('answers %s with 401, WWW-Authenticate: Bearer and no-store', async (_, headers) => {
    const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers });
    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual(unauthenticated);
  });

  it('ignores ?token=', async () => {
    expect((await t.request({ method: 'GET', url: `${base}/schemas?token=${TOKEN_MANAGEMENT}` })).statusCode).toBe(401);
  });

  it('accepts the scheme in any case', async () => {
    const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers: { authorization: `bearer ${TOKEN_MANAGEMENT}` } });
    expect(response.statusCode).toBe(200);
  });

  it('does not accept a token from another space', async () => {
    await insertSpace(t.db, { id: S2, name: 'Other', locales: [{ id: 'en', name: 'English' }] });
    const other = newApiToken(TokenType.MANAGEMENT);
    await t.db.insert(tokens).values(tokenRow(S2, TokenType.MANAGEMENT, other, 'other'));
    expect((await get('/schemas', other)).statusCode).toBe(401);
  });

  it('answers a bad space id with 400 before checking the token', async () => {
    const response = await t.request({ method: 'GET', url: '/api/manage/v1/spaces/bad%2Fid/schemas' });
    expect(response.statusCode).toBe(400);
  });

  it('marks every response no-store, errors included', async () => {
    expect((await get('')).headers['cache-control']).toBe('no-store');
    expect((await get('/translations/fr')).headers['cache-control']).toBe('no-store'); // 400
    expect((await post('/schemas', { bad: true })).headers['cache-control']).toBe('no-store'); // 400
  });

  it('sends no CORS headers', async () => {
    const response = await t.request({ method: 'GET', url: `${base}/schemas`, headers: { ...bearer(), origin: 'https://site.example' } });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('needs no X-Requested-With on POST (no cookie)', async () => {
    expect((await post('/translations/de', { type: 'add-missing', values: {} })).statusCode).toBe(200);
  });

  it('no longer serves the old dev-tools URLs', async () => {
    expect((await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/schemas?token=${TOKEN_MANAGEMENT}` })).statusCode).toBe(404);
    expect((await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/translations/de/values?token=${TOKEN_MANAGEMENT}` })).statusCode).toBe(404);
    expect((await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/open-api?token=${TOKEN_MANAGEMENT}` })).statusCode).toBe(404);
  });
});
```

(`S2` comes from `./ids.js`; `insertSpace` from `./test-app.js`; `tokenRow` from `./seed.js`. For the POST payload use the
exact body the existing "says when there is nothing to do" test sends — it is valid for `zTranslationManageUpdateSchema`.)

Note `GET /api/v1/spaces/:spaceId` (space info) is removed too, but `/api/v1/spaces/:spaceId/translations/:locale` still exists
on the CDN, so the old `…/translations/de/values` path must 404 rather than match it — keep the test.

`test/v1-cdn.test.ts`, add to `describe('token authentication')`:

```ts
it('refuses a management token in the URL before any lookup, saying where it goes', async () => {
  const response = await get(`/api/v1/spaces/${S1}/links?token=${TOKEN_MANAGEMENT}`);
  expect(response.statusCode).toBe(401);
  expect(response.json()).toEqual({
    details: { hint: 'Management tokens go in the Authorization header on /api/manage/v1.' },
    message: 'Missing or invalid API token',
    status: 'UNAUTHENTICATED',
  });
});
```

and change the Task 2 expectation for `TOKEN_MANAGEMENT` + `version=draft` (line 79) from 403 to this same 401.

`test/translation-snapshots.test.ts:52`: the push goes to `/api/manage/v1/spaces/${S1}/translations/…` with
`headers: { authorization: \`Bearer ${TOKEN_MANAGEMENT}\` }`.

`test/auth.test.ts:91` (the existing CSRF test) stays as it is: it proves cookie routes still need `X-Requested-With`
once the URL exemption is gone; the "needs no X-Requested-With on POST" test above proves token routes are exempt by marker.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @localess/server exec vitest run test/manage-api.test.ts test/v1-cdn.test.ts`
Expected: FAIL — 404 on `/api/manage/v1/…`, and the management-in-URL test gets 403.

- [ ] **Step 3: Error plumbing** — `apps/server/src/infra/http/v1/v1-error.ts`:

```ts
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { sendV1Error, type V1ErrorCode } from './v1-response.js';

export interface V1ErrorOptions {
  details?: unknown;
  cacheControl?: string;
  headers?: Record<string, string>;
}

/** An error a guard or handler of the public APIs throws; `V1ExceptionFilter` answers it with the v1 body. */
export class V1Error extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: V1ErrorCode,
    message: string,
    readonly options: V1ErrorOptions = {},
  ) {
    super(message);
  }
}

/** Writes `{ details?, message, status }` (sendV1Error), so guard errors look like handler errors. */
@Catch(V1Error)
export class V1ExceptionFilter implements ExceptionFilter {
  catch(error: V1Error, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    for (const [name, value] of Object.entries(error.options.headers ?? {})) void reply.header(name, value);
    sendV1Error(reply, error.httpStatus, error.code, error.message, error.options);
  }
}
```

`v1-request.ts`, add:

```ts
/** `validIdParams` for guards: throws the same 400 instead of answering it. */
export function assertValidIdParams(params: Params): void {
  for (const name of ['spaceId', 'contentId', 'assetId']) {
    if (name in params && !isValidId(params[name])) {
      throw new V1Error(400, 'invalid-argument', `Invalid '${name}'.`, { cacheControl: publicCache(CACHE_BAD_REQUEST_MAX_AGE) });
    }
  }
}
```

(The Management guard passes its own `no-store`; give `assertValidIdParams` an optional `cacheControl` parameter defaulting to the public one.)

- [ ] **Step 4: Markers, decorators, request context**

`auth/decorators.ts`, add:

```ts
import type { TokenType } from '@localess/shared';

/** Routes authenticated by an API token, not a session: `AuthGuard` leaves them to their own guard. */
export const AUTH_KIND = 'localess:authKind';
export type AuthKind = 'cdn-token' | 'management-token';
export const CDN_TOKEN_RULE = 'localess:cdnTokenRule';

/** The token type a CDN route needs, without and with `?version` (drafts), and why (the 403 `reason`). */
export interface CdnTokenRule {
  published: TokenType;
  draft: TokenType;
  reason: { published: string; draft: string };
}
```

`auth/token-auth.decorators.ts`:

```ts
import { applyDecorators, SetMetadata, UseFilters, UseGuards } from '@nestjs/common';
import { V1ExceptionFilter } from '../infra/http/v1/v1-error.js';
import { AUTH_KIND, type AuthKind, CDN_TOKEN_RULE, type CdnTokenRule } from './decorators.js';
import { CdnTokenGuard } from './guards/cdn-token.guard.js';
import { ManagementTokenGuard } from './guards/management-token.guard.js';

/** A CDN API route: `?token=` with a public or preview token, by `rule`. On a class, every handler; a handler may override. */
export const CdnToken = (rule: CdnTokenRule) =>
  applyDecorators(
    SetMetadata(AUTH_KIND, 'cdn-token' satisfies AuthKind),
    SetMetadata(CDN_TOKEN_RULE, rule),
    UseGuards(CdnTokenGuard),
    UseFilters(V1ExceptionFilter),
  );

/** A Management API controller: `Authorization: Bearer` with a management token, on every handler. */
export const ManagementToken = () =>
  applyDecorators(
    SetMetadata(AUTH_KIND, 'management-token' satisfies AuthKind),
    UseGuards(ManagementTokenGuard),
    UseFilters(V1ExceptionFilter),
  );
```

`auth/request-context.ts`: add to the `FastifyRequest` augmentation `apiToken?: ApiToken;` (import type from `./utils/api-token.js`) and

```ts
/** The API token a token guard accepted (routes behind `@CdnToken` / `@ManagementToken` always have one). */
export const CurrentToken = createParamDecorator((_: unknown, context: ExecutionContext): ApiToken => {
  return context.switchToHttp().getRequest<FastifyRequest>().apiToken as ApiToken;
});
```

- [ ] **Step 5: The guards**

`auth/guards/cdn-token.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { TokenType } from '@localess/shared';
import { assertValidIdParams, type Params, type Query } from '../../infra/http/v1/v1-request.js';
import { V1Error } from '../../infra/http/v1/v1-error.js';
import { parseApiToken } from '../../shared/utils/api-token-format.js';
import { CDN_TOKEN_RULE, type CdnTokenRule } from '../decorators.js';
import { TokenAuthService } from '../services/token-auth.service.js';

const INVALID = 'Missing or invalid API token';
const MANAGEMENT_HINT = 'Management tokens go in the Authorization header on /api/manage/v1.';
/** On the CDN a preview token can do what a public one can. */
const RANK: Partial<Record<TokenType, number>> = { [TokenType.PUBLIC]: 0, [TokenType.PREVIEW]: 1 };
const CDN_TYPES = [TokenType.PUBLIC, TokenType.PREVIEW];

/**
 * `?token=` on the CDN API: ids first (400), then the value's shape and checksum, then the cached lookup (401, the same body
 * whatever was wrong), then the type the route needs (403). A management value is refused before any lookup: it doesn't
 * belong in a URL.
 */
@Injectable()
export class CdnTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const rule = this.reflector.getAllAndOverride<CdnTokenRule>(CDN_TOKEN_RULE, [context.getHandler(), context.getClass()]);
    const params = request.params as Params;
    assertValidIdParams(params);
    const { token: value, version } = request.query as Query;
    const claimed = parseApiToken(value);
    if (claimed === TokenType.MANAGEMENT) throw new V1Error(401, 'unauthenticated', INVALID, { details: { hint: MANAGEMENT_HINT } });
    if (!claimed) throw new V1Error(401, 'unauthenticated', INVALID);
    const token = await this.tokens.findCached(params['spaceId'], value as string);
    if (!token || RANK[token.type] === undefined) throw new V1Error(401, 'unauthenticated', INVALID);
    const draft = version !== undefined;
    const required = draft ? rule.draft : rule.published;
    if ((RANK[token.type] as number) < (RANK[required] as number)) {
      throw new V1Error(403, 'permission-denied', 'Token is missing a required permission', {
        details: {
          requiredTypes: CDN_TYPES.filter(it => (RANK[it] as number) >= (RANK[required] as number)),
          reason: draft ? rule.reason.draft : rule.reason.published,
          hint: 'Use a token of one of the required types.',
        },
      });
    }
    request.apiToken = token;
    return true;
  }
}
```

`auth/guards/management-token.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenType } from '@localess/shared';
import { assertValidIdParams, type Params } from '../../infra/http/v1/v1-request.js';
import { V1Error } from '../../infra/http/v1/v1-error.js';
import { parseApiToken } from '../../shared/utils/api-token-format.js';
import { TokenAuthService } from '../services/token-auth.service.js';

const NO_STORE = 'no-store';
const BEARER = /^Bearer ([^\s]+)$/i;

/**
 * `Authorization: Bearer mgt_…` on the Management API, checked against the database on every request (no cache: a revoked
 * token stops at once). Any failure is the same 401 with `WWW-Authenticate: Bearer`. Every response is `no-store`.
 */
@Injectable()
export class ManagementTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokenAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    void http.getResponse<FastifyReply>().header('cache-control', NO_STORE);
    const params = request.params as Params;
    assertValidIdParams(params, NO_STORE);
    const value = BEARER.exec(request.headers.authorization ?? '')?.[1];
    const unauthenticated = new V1Error(401, 'unauthenticated', 'Missing or invalid API token', {
      cacheControl: NO_STORE,
      headers: { 'www-authenticate': 'Bearer' },
    });
    if (parseApiToken(value) !== TokenType.MANAGEMENT) throw unauthenticated;
    const token = await this.tokens.find(params['spaceId'], value as string);
    if (!token || token.type !== TokenType.MANAGEMENT) throw unauthenticated;
    request.apiToken = token;
    return true;
  }
}
```

`api-tokens.module.ts`: `providers: [TokenAuthService, ApiTokensRepository, CdnTokenGuard, ManagementTokenGuard]`,
`exports: [TokenAuthService, CdnTokenGuard, ManagementTokenGuard]` (guards attached with `UseGuards` are resolved in the
controller's module, which imports `ApiTokensModule`).

`token-auth.service.ts`: delete `authorize`, `authorizeDevTools`, `authorizeApiKey` and the now-unused imports.

- [ ] **Step 6: `AuthGuard` skips token routes**

In `auth/auth.guard.ts` `canActivate`, before the CSRF check:

```ts
// Token routes are authenticated by their own guard (@CdnToken / @ManagementToken) and send no cookie, so no CSRF check.
if (this.reflector.getAllAndOverride<AuthKind | undefined>(AUTH_KIND, targets)) return true;

if (!SAFE_METHODS.has(request.method) && !request.headers[CSRF_HEADER]) {
  throw new ForbiddenException('Missing X-Requested-With header');
}
```

(The `!request.url.startsWith('/api/v1/')` exemption is removed.) Update the class comment: "The public APIs authenticate with
tokens through their own guards, so they are exempt."

- [ ] **Step 7: CDN controllers**

- `git mv` each `contents|translations|assets` `*.public.controller.ts` to `*.cdn.controller.ts`; rename the classes and update module imports.
- Contents: replace `@Public()` with

```ts
@CdnToken({
  published: TokenType.PUBLIC,
  draft: TokenType.PREVIEW,
  reason: {
    published: 'Published content requires a public or preview token.',
    draft: 'This request includes a `version` query parameter, which requires a preview token.',
  },
})
```

  Each handler takes `@CurrentToken() token: ApiToken` and drops `validIdParams` and `authorizeContent` (delete that method and
  the `TokenAuthService` constructor parameter); `const { …, token: tokenId } = request.query as Query;` stays for the redirect URL.
- Translations CDN controller: keep only the `translations/:locale` GET, with the same decorator (reasons
  `'Published translations require a public or preview token.'` / the draft one above); move the other two handlers to the
  management controller (Step 8).
- Assets: rename only; it stays `@Public()`.

- [ ] **Step 8: Management controllers** (each `@ManagementToken()`, `@Controller('api/manage/v1/spaces/:spaceId')`)

`modules/spaces/controllers/spaces.management.controller.ts`:

```ts
/** The space itself on the Management API (the CLI's `localess login` check). */
@ManagementToken()
@Controller('api/manage/v1/spaces/:spaceId')
export class SpacesManagementController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  async space(@Param('spaceId') spaceId: string, @Res() reply: FastifyReply): Promise<void> {
    const space = await this.spaces.findPublic(spaceId);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: 'no-store' });
      return;
    }
    void reply.send(space);
  }
}
```

`modules/schemas/controllers/schemas.management.controller.ts`: the three handlers from `schemas.public.controller.ts`
(`open-api` GET, `schemas` GET, `schemas` POST with `@HttpCode(200)`), bodies unchanged except: no `authorize*` line, and every
`cacheControl: publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE)` becomes `cacheControl: 'no-store'`. Constructor without `TokenAuthService`.

`modules/translations/controllers/translations.management.controller.ts`: `@Get('translations/:locale')` with the body of the
old `translationValues` (every `'no-cache'` → `'no-store'`), and `@Post('translations/:locale') @HttpCode(200)` with the body of
the old `updateTranslations`; no `authorize*` lines.

Register them in `SpacesModule`, `SchemasModule`, `TranslationsModule` `controllers` (replacing the deleted public ones);
those modules already import `ApiTokensModule` — keep it.

- [ ] **Step 9: Run the targeted tests to see them pass**

Run: `pnpm --filter @localess/server exec vitest run test/manage-api.test.ts test/v1-cdn.test.ts test/auth.test.ts test/translation-snapshots.test.ts`
Expected: PASS.

- [ ] **Step 10: Full suite** — `pnpm server:test`. Expected: PASS (the CDN acceptance tests prove bodies, redirects and
  `Cache-Control` unchanged; `v1-import-window` proves the 503 still comes first).

- [ ] **Step 11: Build** (`pnpm build && pnpm lint:fix && pnpm server:build`), then **ask whether to commit**
  ("feat(server): token guards; Management API at /api/manage/v1 with Bearer tokens").

---

### Task 5: Web app — token types, choice cards, show-once dialog

**Files:**
- Modify: `packages/shared/src/models/token.model.ts` (`Token` shape)
- Modify: `apps/web/src/app/shared/models/token.model.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/core/services/token.service.ts` (+ `.spec.ts`)
- Modify: `apps/web/src/app/features/spaces/settings/tokens/token-dialog/token-dialog.component.{ts,html,spec.ts}`
- Create: `apps/web/src/app/features/spaces/settings/tokens/token-secret-dialog/token-secret-dialog.component.{ts,html,spec.ts}`
- Modify: `apps/web/src/app/features/spaces/settings/tokens/tokens.component.{ts,html,spec.ts}`, `token.validator.ts`
- Modify: `apps/web/src/app/features/spaces/contents/contents.component.ts:470-490`,
  `contents/edit-document/edit-document.component.ts:389-440`, `translations/translations.component.ts:400-440` (+ their specs)

**Interfaces:**
- Consumes: App API from Task 2 (`?type=`, create `{name,type,cacheTtl}`, update `{name,cacheTtl}`, value in create/regenerate responses).
- Produces (shared): `interface Token { id: string; type: TokenType; name: string; hint: string; token?: string; cacheTtl?: number; createdAt: Timestamp; updatedAt: Timestamp }`
- Produces (web): `TokenForm = Pick<Token, 'name' | 'type' | 'cacheTtl'>`; `TOKEN_TYPES: TokenTypeInfo[]`, `TOKEN_TYPE_INFO: Record<TokenType, TokenTypeInfo>`;
  `TokenService.findFirstByType(spaceId, type)`; `TokenSecretDialogComponent` with context `{ name: string; token: string; cliLogin: string }`.

- [ ] **Step 1: Shared `Token`** — replace the interface in `packages/shared/src/models/token.model.ts`:

```ts
/** A space API token. */
export interface Token {
  id: string;
  type: TokenType;
  name: string;
  /** The prefix and the last 4 characters of the value, e.g. `mgt_…aB3x`. */
  hint: string;
  /** The value: always for public and preview tokens; for management tokens only in the create and regenerate responses. */
  token?: string;
  /** Seconds the `cv` redirect is cached (0: not cached); absent: the default. Public and preview only. */
  cacheTtl?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

- [ ] **Step 2: Write the failing web tests**

`shared/models/token.model.spec.ts` (replace):

```ts
import { TokenType } from '@localess/shared';
import { TOKEN_TYPE_INFO, TOKEN_TYPES } from './token.model';

describe('token types', () => {
  it('lists Public, Preview, Management in that order, each with an icon and a description', () => {
    expect(TOKEN_TYPES.map(it => it.type)).toEqual([TokenType.PUBLIC, TokenType.PREVIEW, TokenType.MANAGEMENT]);
    expect(TOKEN_TYPES.map(it => it.label)).toEqual(['Public', 'Preview', 'Management']);
    expect(TOKEN_TYPES.map(it => it.icon)).toEqual(['lucideGlobe', 'lucideEye', 'lucideKeyRound']);
    for (const it of TOKEN_TYPES) expect(it.description.length).toBeGreaterThan(20);
  });

  it('warns about drafts on preview and secrecy on management', () => {
    expect(TOKEN_TYPE_INFO[TokenType.PREVIEW].description).toContain("Don't use it on your production site");
    expect(TOKEN_TYPE_INFO[TokenType.MANAGEMENT].description).toContain('shown only once');
  });
});
```

`token-dialog.component.spec.ts` (replace the permission tests):

```ts
it('starts as a public token with empty defaults', () => {
  const { component } = setup(undefined);
  expect(component.form.getRawValue()).toEqual({ name: '', type: TokenType.PUBLIC, cacheTtl: null });
  expect(component.isEdit).toBe(false);
});

it('prefills on edit and locks the type', () => {
  const { component } = setup({ name: 'CI', type: TokenType.PREVIEW, cacheTtl: 60 });
  expect(component.form.getRawValue()).toEqual({ name: 'CI', type: TokenType.PREVIEW, cacheTtl: 60 });
  expect(component.form.controls.type.disabled).toBe(true);
  expect(component.isEdit).toBe(true);
});

it('hides and clears the cache TTL for management tokens', () => {
  const { component } = setup(undefined);
  component.form.controls.cacheTtl.setValue(30);
  component.form.controls.type.setValue(TokenType.MANAGEMENT);
  expect(component.showCacheTtl()).toBe(false);
  expect(component.form.controls.cacheTtl.value).toBeNull();
  component.form.controls.type.setValue(TokenType.PREVIEW);
  expect(component.showCacheTtl()).toBe(true);
});

it('closes with name, type and cache TTL', () => {
  const { component, close } = setup(undefined);
  component.form.setValue({ name: 'Site', type: TokenType.PREVIEW, cacheTtl: 5 });
  component.save();
  expect(close).toHaveBeenCalledWith({ name: 'Site', type: TokenType.PREVIEW, cacheTtl: 5 });
});
```

`token.service.spec.ts`: `findFirstByType` sends `GET /api/app/spaces/s1/tokens?type=preview&limit=1`; `create` posts
`{ name, type, cacheTtl }`; `update` puts `{ name, cacheTtl }` (no `type`). Follow the file's existing HttpTestingController pattern.

`token-secret-dialog.component.spec.ts`:

```ts
it('shows the token and the CLI login command, and copies them', () => {
  // setup with context { name: 'CI', token: 'mgt_x', cliLogin: 'localess login --origin o --space s --token mgt_x' }
  // render the real template; expect the text to contain 'mgt_x', the cliLogin, and "You won't see this token again".
});
```

`tokens.component.spec.ts`: (a) columns are `['hint', 'name', 'type', 'cacheTtl', 'updatedAt', 'actions']`; (b) after
`openAddDialog` resolves `{ name, type: 'management' }` and `create` returns `{ …, token: 'mgt_x' }`, the secret dialog opens
with `cliLogin` `localess login --origin ${origin} --space ${spaceId} --token mgt_x`; for `public` it does not open; (c) after
regenerating a management token the secret dialog opens with the new value. Use the spec's existing `HlmDialogService` stub.

`edit-document.component.spec.ts`, `translations.component.spec.ts`, `contents.component.spec.ts`: the draft link asks
`findFirstByType(spaceId, TokenType.PREVIEW)` and the published link `findFirstByType(spaceId, TokenType.PUBLIC)`; a published
link after a draft link asks again (no shared cache across types); with no token the error reads
`Please create a Preview Token in your Space Settings` / `Please create a Public Token in your Space Settings`.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm --filter @localess/web test -- --include='src/app/{shared/models/token.model.spec.ts,core/services/token.service.spec.ts,features/spaces/settings/tokens/**/*.spec.ts,features/spaces/contents/**/*.spec.ts,features/spaces/translations/**/*.spec.ts}'`
Expected: FAIL (missing `TOKEN_TYPES`, `findFirstByType`, `TokenSecretDialogComponent`).

- [ ] **Step 4: UI model** — `apps/web/src/app/shared/models/token.model.ts` (replace the file):

```ts
import { Token, TokenType } from '@localess/shared';

// UI-only token helpers (labels, icons, where to use each type); the token model itself is in @localess/shared.

export type TokenForm = Pick<Token, 'name' | 'type' | 'cacheTtl'>;

export interface TokenTypeInfo {
  type: TokenType;
  label: string;
  icon: string;
  description: string;
}

export const TOKEN_TYPES: TokenTypeInfo[] = [
  {
    type: TokenType.PUBLIC,
    label: 'Public',
    icon: 'lucideGlobe',
    description: 'Reads published content and translations. Safe in browser code: websites, mobile apps, static site builds.',
  },
  {
    type: TokenType.PREVIEW,
    label: 'Preview',
    icon: 'lucideEye',
    description:
      "Reads drafts and published content. For preview sites, the Visual Editor and staging builds. Don't use it on your production site.",
  },
  {
    type: TokenType.MANAGEMENT,
    label: 'Management',
    icon: 'lucideKeyRound',
    description:
      'The CLI and CI: push and pull schemas and translations, generate the OpenAPI spec. Secret: sent in the Authorization header, shown only once.',
  },
];

export const TOKEN_TYPE_INFO = Object.fromEntries(TOKEN_TYPES.map(it => [it.type, it])) as Record<TokenType, TokenTypeInfo>;
```

- [ ] **Step 5: Service** — `core/services/token.service.ts`: replace `findFirstByPermission` with

```ts
findFirstByType(spaceId: string, type: TokenType): Observable<Token[]> {
  const params = new HttpParams().set('type', type).set('limit', 1);
  return liveQueryWith(this.events, { spaceId, entities: ['tokens'] }, () => this.http.get<Token[]>(this.base(spaceId), { params }));
}
```

`create` posts `{ name: model.name, type: model.type, cacheTtl: model.cacheTtl ?? null }`; `update(spaceId, id, model: Omit<TokenForm, 'type'>)`
puts `{ name: model.name, cacheTtl: model.cacheTtl ?? null }`.

- [ ] **Step 6: Token dialog** — `token-dialog.component.ts`: remove the permission items, groups, `usageInfo`,
`isPermissionSelected`, `togglePermission`, `HlmCheckboxImports`, `HlmBadgeImports`; add `HlmRadioGroupImports` (import path as in
`features/admin/spaces/space-create-dialog/space-create-dialog.component.ts`) and icons `lucideGlobe, lucideEye, lucideKeyRound, lucideX`.

```ts
readonly types = TOKEN_TYPES;
readonly isEdit = this.context != null;

readonly form = this.fb.group({
  name: this.fb.control<string>('', TokenValidator.NAME),
  type: this.fb.control<TokenType>({ value: TokenType.PUBLIC, disabled: this.isEdit }, Validators.required),
  cacheTtl: this.fb.control<number | null>(null, TokenValidator.CACHE_TTL),
});

private readonly typeValue = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
readonly showCacheTtl = computed(() => this.typeValue() !== TokenType.MANAGEMENT);

constructor() {
  // A management token is never cached: its TTL field is hidden and emptied.
  this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(type => {
    if (type === TokenType.MANAGEMENT) this.form.controls.cacheTtl.setValue(null);
  });
}

ngOnInit(): void {
  if (this.context != null) this.form.patchValue(this.context);
}

save(): void {
  this.dialogRef.close(this.form.getRawValue() as TokenForm);
}
```

(Keep `resetCacheTtl`. `TokenValidator.PERMISSIONS` is deleted from `token.validator.ts`.)

`token-dialog.component.html` — replace the Permissions block with the choice cards (same markup as the space template choice):

```html
<fieldset hlmFieldSet>
  <legend hlmFieldLegend>Type</legend>
  <p hlmFieldDescription>
    @if (isEdit) {
      The type can't be changed. To use the token another way, create a new one.
    } @else {
      What the token is for. It can't be changed later.
    }
  </p>
  <hlm-radio-group formControlName="type">
    @for (item of types; track item.type) {
      <label hlmFieldLabel [for]="'token-type-' + item.type">
        <div hlmField orientation="horizontal">
          <div hlmFieldContent>
            <div hlmFieldTitle>
              <ng-icon hlm size="sm" [name]="item.icon" />
              {{ item.label }}
            </div>
            <div hlmFieldDescription>{{ item.description }}</div>
          </div>
          <hlm-radio [value]="item.type" [inputId]="'token-type-' + item.type">
            <hlm-radio-indicator indicator />
          </hlm-radio>
        </div>
      </label>
    }
  </hlm-radio-group>
</fieldset>
```

and wrap the separator + Cache TTL field in `@if (showCacheTtl()) { … }`.

- [ ] **Step 7: Show-once dialog** — `token-secret-dialog/token-secret-dialog.component.ts`:

```ts
export interface TokenSecretDialogContext {
  name: string;
  token: string;
  cliLogin: string;
}

/** The value of a new or regenerated management token: the only time it is shown. */
@Component({
  selector: 'll-token-secret-dialog',
  templateUrl: './token-secret-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, HlmButtonImports, HlmFieldImports, HlmIconImports, ClipboardModule],
  providers: [provideIcons({ lucideCopy, lucideSquareTerminal, lucideTriangleAlert })],
})
export class TokenSecretDialogComponent {
  readonly context = injectBrnDialogContext<TokenSecretDialogContext>();
  private readonly notifications = inject(NotificationService);

  copied(what: string): void {
    this.notifications.success(`${what} copied to clipboard.`);
  }
}
```

`token-secret-dialog.component.html`:

```html
<hlm-dialog-header>
  <h2 hlmDialogTitle>Copy your token</h2>
  <p hlmDialogDescription class="flex items-center gap-2">
    <ng-icon hlm size="sm" name="lucideTriangleAlert" />
    You won't see this token again. Store it in your CI secrets or a password manager now.
  </p>
</hlm-dialog-header>
<div hlmField>
  <label hlmFieldLabel>{{ context.name }}</label>
  <div class="flex items-center gap-2">
    <code class="bg-muted flex-1 rounded px-2 py-1 text-sm break-all">{{ context.token }}</code>
    <button hlmBtn size="icon" variant="ghost" [cdkCopyToClipboard]="context.token" (cdkCopyToClipboardCopied)="copied('Token')" aria-label="Copy Token">
      <ng-icon hlm size="sm" name="lucideCopy" />
    </button>
  </div>
</div>
<div hlmField>
  <label hlmFieldLabel>CLI login</label>
  <div class="flex items-center gap-2">
    <code class="bg-muted flex-1 rounded px-2 py-1 text-sm break-all">{{ context.cliLogin }}</code>
    <button hlmBtn size="icon" variant="ghost" [cdkCopyToClipboard]="context.cliLogin" (cdkCopyToClipboardCopied)="copied('CLI login command')" aria-label="Copy CLI Login">
      <ng-icon hlm size="sm" name="lucideSquareTerminal" />
    </button>
  </div>
</div>
<hlm-dialog-footer>
  <button hlmBtn hlmDialogClose>Done</button>
</hlm-dialog-footer>
```

- [ ] **Step 8: Token list** — `tokens.component.ts`:
- `displayedColumns = ['hint', 'name', 'type', 'cacheTtl', 'updatedAt', 'actions']`; search fields `[token.hint, token.name]`.
- Remove `permissionsToText`, `permissionsToUsage`, `isCliToken`, `PERMISSION_TEXT`/`getTokenUsageInfo` imports; add
  `readonly typeInfo = TOKEN_TYPE_INFO;`.
- `openAddDialog`: after `create` resolves, `if (token.type === TokenType.MANAGEMENT && token.token) this.showSecret(token);`.
- `openEditDialog`: context `{ name, type, cacheTtl }`; `update(spaceId!, element.id, { name: it.name, cacheTtl: it.cacheTtl })`;
  fix the messages to "Token has been updated." / "Token can not be updated.".
- `openRegenerateDialog`: on success, `if (token.type === TokenType.MANAGEMENT && token.token) this.showSecret(token);`.
- Add:

```ts
private showSecret(token: Token): void {
  const spaceId = this.spaceStore.selectedSpaceId();
  this.dialog.open<void, TokenSecretDialogContext>(TokenSecretDialogComponent, {
    context: {
      name: token.name,
      token: token.token!,
      cliLogin: `localess login --origin ${this.document.location.origin} --space ${spaceId} --token ${token.token}`,
    },
    contentClass: DIALOG_WIDTH_SM,
  });
}
```

`tokens.component.html`: the `id` column becomes `hint` (`<code>{{ element.hint }}</code>`); remove the `permissions` and `usage`
columns; add

```html
<ng-container llColumnDef="type">
  <th llHeaderCell *llHeaderCellDef>Type</th>
  <td llCell *llCellDef="let element">
    <span hlmBadge variant="outline" [hlmTooltip]="typeInfo[element.type].description">
      <ng-icon hlm size="sm" [name]="typeInfo[element.type].icon" />
      {{ typeInfo[element.type].label }}
    </span>
  </td>
</ng-container>
```

In `cacheTtl`, show `—` for management tokens. In `actions`, the Copy Token button only `@if (element.token)`; remove the CLI
Login button and its disabled variant. Add `lucideGlobe, lucideEye, lucideKeyRound` to the icons; remove `lucideSquareTerminal`.

- [ ] **Step 9: "Open in API" links** — in each of the three components replace the single `availableToken` field with
`private readonly apiTokens: Partial<Record<TokenType, string>> = {};` and one helper:

```ts
/** The first token of `type` (cached per type), or an error toast naming the type to create. */
private withApiToken(type: TokenType, open: (token: string) => void): void {
  const cached = this.apiTokens[type];
  if (cached) return open(cached);
  this.tokenService.findFirstByType(this.spaceId(), type).pipe(take(1)).subscribe(tokens => {
    const token = tokens[0]?.token;
    if (!token) {
      this.notificationService.error(`Please create a ${TOKEN_TYPE_INFO[type].label} Token in your Space Settings`);
      return;
    }
    this.apiTokens[type] = token;
    open(token);
  });
}
```

Draft links call `this.withApiToken(TokenType.PREVIEW, token => this.openApiV1InNewTab(locale, token, 'draft'))`; published
links use `TokenType.PUBLIC`. (Add `take` to the rxjs imports if missing.)

- [ ] **Step 10: Run the web tests to see them pass**

Run: the Step 3 command. Expected: PASS. Then `pnpm test` (whole web suite). Expected: PASS.

- [ ] **Step 11: Build** — `pnpm build && pnpm lint:fix && pnpm server:build`. Expected: success.

- [ ] **Step 12: Ask whether to commit** ("feat(web): token types with choice cards; management tokens shown once").

---

### Task 6: Remove `TokenPermission`; documentation

**Files:**
- Modify: `packages/shared/src/models/token.model.ts` (delete `TokenPermission`)
- Docs: `docs/auth-tokens.md`, `docs/v1-api.md`, `docs/cdn-caching.md`, `docs/features/spaces/settings.md`,
  `docs/deployment/migrate-from-firebase.md`, `docs/roadmap/firebase-space-import.md`, `docs/roadmap/database-structure.md`,
  `docs/roadmap/api-token-types.md`, `CLAUDE.md`, `apps/server/README.md` (if it mentions `X-API-KEY`/`DEV_TOOLS`)

- [ ] **Step 1: Delete the enum** and find leftovers:

Run: `grep -rn "TokenPermission\|DEV_TOOLS\|X-API-KEY\|x-api-key\|authorizeDevTools\|authorizeApiKey\|findFirstByPermission\|newTokenSecret\|public.controller" apps packages docs CLAUDE.md --include=*.ts --include=*.html --include=*.md | grep -v node_modules | grep -v dist`
Expected: matches only in docs (fixed in Step 2) and in `docs/roadmap/firebase-to-nestjs-postgres.md` history entries (leave history as written).

- [ ] **Step 2: Docs**
- `docs/auth-tokens.md`: rewrite: the three types (table from the spec), format and checksum, hashing of management tokens
  (shown once, `hint`), where each is sent (`?token=` vs `Authorization: Bearer`), the 5-minute CDN cache vs uncached
  management lookups, the auto-generated preview token, and that Firebase tokens are not imported.
- `docs/v1-api.md`: split into "CDN API (`/api/v1`)" and "Management API (`/api/manage/v1`)": route tables from the spec,
  required types instead of permissions, the 401/403 bodies (`requiredTypes`, the management-in-URL hint), `WWW-Authenticate:
  Bearer`, `no-store`, no CORS on `/api/manage/**`; Implementation Files lists `*.cdn.controller.ts`, `*.management.controller.ts`,
  `auth/guards/`, `auth/token-auth.decorators.ts`, `infra/http/v1/v1-error.ts`, `shared/utils/api-token-format.ts`; the token
  permissions reference becomes a token types reference; tests `test/v1-*.test.ts` and `test/manage-api.test.ts`.
- `docs/cdn-caching.md`: one line — `/api/manage/**` is never cached (`Cache-Control: no-store`); CDN rule: cache `/api/v1/*` only.
- `docs/features/spaces/settings.md`: the tokens page (choice cards, type badge, hint, show-once dialog, auto token).
- `docs/deployment/migrate-from-firebase.md`: "Tokens are not imported. Each imported space gets an Auto Generated Preview
  Token; create Public and Management tokens and update your sites and CI." `docs/roadmap/firebase-space-import.md`: remove the
  tokens stage from the stage list.
- `docs/roadmap/database-structure.md`: the `tokens` table bullets (type, token, token_hash, hint, checks).
- `docs/roadmap/api-token-types.md`: status → "implemented".
- `CLAUDE.md`: the V1 API row reads "V1 API — CDN API (`/api/v1`) and Management API (`/api/manage/v1`), token types"; the
  `auth-tokens.md` row reads "API token types and auth".

- [ ] **Step 3: Verify everything**

Run: `pnpm shared:test && pnpm server:test && pnpm test && pnpm build && pnpm lint:fix && pnpm server:build`
Expected: all succeed.

- [ ] **Step 4: Ask whether to commit** ("docs: token types, CDN and Management APIs"). Remind the user: `@localess/cli`
  (separate repository) must switch to `/api/manage/v1/…` with `Authorization: Bearer`.

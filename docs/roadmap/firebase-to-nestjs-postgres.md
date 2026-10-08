# Firebase → NestJS (Fastify) + Postgres (Drizzle) migration

**Status:** In progress — Phases 0–6 done (branch `feat/self-hosted-nestjs-postgres`) · **Recorded:** 2026-10-08
**Scope:** replace every Firebase dependency (Functions, Firestore, Storage, Auth, Hosting, Remote Config,
Analytics, Performance) with one self-hosted Node process.

## Target

```
                 ┌──────────────────── one Node process, one port ─────────────────────┐
browser ───────► │ NestJS + @nestjs/platform-fastify                                    │
                 │  ├─ @fastify/static      dist/localess/browser  (+ SPA fallback)      │
                 │  ├─ /api/v1/**           public CDN + DEV_TOOLS + MANAGE (unchanged)  │
                 │  ├─ /api/auth/**         session login, OAuth (Google / Microsoft)    │
                 │  ├─ /api/app/**          what the Firestore SDK + callables did today │
                 │  ├─ /api/app/events      SSE stream (replaces realtime listeners)    │
                 │  └─ JobWorker            tasks, asset metadata (replaces triggers)    │
                 └───────────┬───────────────────────────────┬──────────────────────────┘
                             │ Drizzle (node-postgres)       │ StorageDriver
                     Postgres (external, or embedded-postgres) local FS (default) | S3 (optional)
```

Boot sequence (`server/src/main.ts`):

1. Load config from env (`DATABASE_URL`, `LOCALESS_DATA_DIR`, `SESSION_SECRET`, `DEEPL_API_KEY`, …).
2. If `DATABASE_URL` is unset (or `LOCALESS_DB=embedded`): start `embedded-postgres` with
   `databaseDir = $LOCALESS_DATA_DIR/pgdata`, `initialise()` only when the dir is empty, `createDatabase`
   if missing, and register a shutdown hook that calls `stop()`.
3. Take `pg_advisory_lock(<const>)`, run Drizzle `migrate(db, { migrationsFolder })`, release the lock.
   The lock makes it safe when several instances boot at once. Migrations are generated at dev time with
   `drizzle-kit generate` and committed (`server/drizzle/*.sql`); no `push` in production.
4. Optional seed: if `users` is empty and `LOCALESS_ADMIN_EMAIL`/`LOCALESS_ADMIN_PASSWORD` are set, create
   the first admin + the "Hello World" space (today's `check --fix` / `admin-user.mjs`). Never an
   unauthenticated HTTP endpoint (see `docs/deployment/check.md` for why the old `setup` callable went).
5. Start `JobWorker`, then `app.listen()`.

Repository layout: new `server/` (Nest app) replaces `functions/`. Pure logic in `functions/src` is moved,
not rewritten: `open-api.service.ts`, `utils/schema.utils.ts`, `utils/translate-batch.ts`,
`utils/image-transform.ts`, `utils/webhook-request.ts` (SSRF guard, HMAC), `utils/user-grant.ts`, all
`models/*.zod.ts`, the locale allow-lists in `config.ts`, and the task zip/unzip code. Their existing
vitest tests move with them. A shared `libs/contracts` (models + zod DTOs) is imported by both Angular
and the server so the 10 duplicated model files collapse into one set.

---

## 1. Database: Firestore → Postgres (Drizzle)

### Principles

- **Keep Firestore document ids as `text` primary keys.** Content/asset/token ids appear in public URLs,
  customer code, SDK caches and API tokens (20-char tokens are the doc id). New rows get the same
  20-char alphanumeric id generator, so ids look identical before and after.
- **JSONB for schemaless parts** (`contents.data`, `schemas.fields`, `translations.locales`,
  `assets.metadata`, `spaces.locales`), real columns for everything that is filtered or sorted.
- **`timestamptz` everywhere**; the API returns ISO strings.
- Every child table carries `space_id … references spaces on delete cascade`: this alone replaces
  `space-ondelete`, `task-ondelete` (logs), `webhook-ondelete` and the `recursiveDelete` calls.

### Tables

| Table | Key columns | Replaces |
|---|---|---|
| `users` | `id`, `email` (unique, citext), `email_verified`, `display_name`, `photo_url`, `role` (`admin`/`custom`/null), `permissions text[]`, `lock`, `disabled`, timestamps | `users/{uid}` **and** Auth custom claims (one source of truth — no more sync trigger) |
| `user_credentials` | `user_id`, `password_hash`, `hash_algo` (`argon2id` / `firebase-scrypt`) | Firebase Auth password store |
| `user_identities` | `user_id`, `provider` (`google`/`microsoft`), `provider_subject`, unique(provider, subject) | Auth `providerData` |
| `sessions` | `id` (hash of cookie), `user_id`, `expires_at`, `last_seen_at`, `user_agent`, `ip` | ID tokens |
| `password_reset_tokens` | `token_hash`, `user_id`, `expires_at`, `used_at` | `sendPasswordResetEmail` |
| `settings` | single row: `ui jsonb`, `updated_at` | `configs/settings` |
| `spaces` | `id`, `name`, `locales jsonb`, `locale_fallback jsonb`, `environments jsonb`, `overview jsonb`, `progress jsonb`, **`content_version bigint`**, **`translation_version bigint`**, timestamps | `spaces/{id}` + the two `cache.json` generations |
| `contents` | `id`, `space_id`, `kind`, `name`, `slug`, `parent_slug`, `full_slug`, `schema`, `data jsonb`, `assets text[]`, `links text[]`, `references text[]`, `published_at`, `updated_by jsonb`, timestamps; unique(space_id, full_slug) | `spaces/{s}/contents` |
| `content_published` | `content_id`, `locale`, `data jsonb`, `published_at`; PK(content_id, locale) | `contents/{id}/{locale}.json` in Storage |
| `assets` | `id`, `space_id`, `kind`, `name`, `parent_path`, `extension`, `type`, `size`, `md5`, `alt`, `source`, `metadata jsonb`, `in_progress`, timestamps | `spaces/{s}/assets` (+ `md5` replaces the GCS `md5Hash` used for ETags) |
| `schemas` | PK(space_id, id), `type`, `display_name`, `description`, `labels text[]`, `preview_field`, `fields jsonb`, `values jsonb`, timestamps | `spaces/{s}/schemas` (id is user-chosen) |
| `translations` | PK(space_id, id), `type`, `locales jsonb`, `labels text[]`, `description`, `updated_by jsonb`, timestamps | `spaces/{s}/translations` |
| `translation_published` | PK(space_id, locale), `data jsonb`, `published_at` | `translations/{locale}.json` in Storage |
| `tasks` | `id`, `space_id`, `kind`, `status`, `message`, `trace`, `path`, `locale`, `type`, `file jsonb`, `upload_key`, `locked_by`, `locked_at`, timestamps | `spaces/{s}/tasks` (also the job queue) |
| `task_logs` | `id bigserial`, `task_id` (cascade), `level`, `message`, `trace`, `created_at` | `tasks/{t}/logs` |
| `tokens` | `id` (20 chars), `space_id`, `name`, `version`, `permissions text[]`, `cache_ttl`, timestamps | `spaces/{s}/tokens` |
| `webhooks` | `id`, `space_id`, `name`, `url`, `enabled`, `events text[]`, `headers jsonb`, `secret`, timestamps | `spaces/{s}/webhooks` |
| `webhook_logs` | `id bigserial`, `webhook_id` (cascade), delivery fields, `created_at` | `webhooks/{w}/logs` |

Indexes, translated from `firestore.indexes.json` plus the query shapes the code uses:

- `contents (space_id, parent_slug, kind desc, name)`, `contents (space_id, kind, name)`,
  `contents (space_id, full_slug text_pattern_ops)` for the prefix range queries (`>= x`, `< x/~`).
- `assets (space_id, parent_path, kind desc, name)`, `assets (space_id, parent_path text_pattern_ops)`.
- `schemas (space_id, type, name)`.
- `webhooks (space_id) where enabled` + GIN on `events` (`events @> array[$1]`).
- `tokens using gin (permissions)` for `findFirstByPermission`.
- Name prefix search (`findAllByName`) → `name ilike $1 || '%'` with a `text_pattern_ops`/trigram index.
  This also fixes today's case-sensitive-only search.

### What disappears because SQL can do it

| Firestore workaround | Postgres |
|---|---|
| `documentId() in` capped at 30 ids, `getAllInChunks` | `where id = any($1)` |
| `count()` aggregation + `bucket.getFiles` size sum in `calculateoverview` | one `select count(*) … group by`, `sum(assets.size)`; can be computed on read, `overview` column optional |
| Non-atomic `setDoc(new) + deleteDoc(old)` (`schema.updateId`, `translation.updateId`, `token.regenerate`) | `update … set id = $new` in a transaction |
| `writeBatch` 500-op limit (`BATCH_MAX`) | one transaction, or `insert … on conflict` |
| `arrayUnion`/`arrayRemove` on `spaces.locales` | `jsonb` update in a transaction |
| Dotted `locales.{locale}` update | `jsonb_set(locales, '{de}', $1)` |
| `deleteField()` | `null` |
| Recursive folder delete via re-triggering | `delete … where parent_slug = $1 or parent_slug like $1 || '/%'` |
| Folder rename cascading through re-triggered `content-onupdate` | one `update … set full_slug = $new || substr(full_slug, …)` in a transaction |

---

## 2. Functions → NestJS modules

Every deployed function, and where it goes. **Trigger-maintained behaviour becomes explicit service
code, called inside the same transaction as the write that used to fire the trigger.**

| Today | Kind | New home |
|---|---|---|
| `publicv1` | Express app | `PublicApiModule` — identical routes under `/api/v1`, Fastify controllers. Express `cors`/`compression`/`json` → `@fastify/cors`, `@fastify/compress`, built-in body parser (5 MB limit). |
| `content-publish` / `content-unpublish` | callable | `POST /api/app/spaces/:s/contents/:id/publish` / `…/unpublish` → upsert/delete `content_published` rows, set `published_at`, bump `content_version`, enqueue webhook. |
| `content-onupdate` (draft JSON + folder slug cascade) | trigger | Drafts: **computed on read** for `?version=draft` (locale extraction from `contents.data`, now a DB read rather than a Storage file). Slug cascade: in `ContentService.update/move`. `content.changed` webhook from the service. |
| `content-ondelete` | trigger | `ContentService.delete`: cascade by `parent_slug`, FK cascade on `content_published`, webhook. |
| `content-onwrite` (`cache.json` generation) | trigger | `spaces.content_version = content_version + 1` — a statement-level Postgres trigger on `contents` (so no write path can forget it), or explicit in the service. |
| `asset-ondelete` | trigger | `AssetService.delete`: cascade folders by `parent_path`, then delete storage objects after commit. |
| `storage-onupload` | Storage trigger | Synchronous step in the upload endpoint (stream to storage, compute md5 + sharp/exiftool metadata, `in_progress = false`), or a `asset_metadata` job when the file is large. |
| `space-ondelete` | trigger | FK `on delete cascade` + `storage.deletePrefix('spaces/{id}/')`. |
| `space-calculateoverview` | callable | `GET /api/app/spaces/:s/overview` computed from SQL. |
| `task-oncreate` | trigger (4 GiB, 540 s) | `JobWorker` (see §5). The zip/unzip/zod code moves unchanged; only the Firestore/Storage calls change. |
| `task-ondelete` | trigger | FK cascade on `task_logs` + delete `tasks/{id}/` storage prefix. |
| `webhook-ondelete` | trigger | FK cascade on `webhook_logs`. |
| `translate` | callable | `POST /api/app/translate`. DeepL key from `DEEPL_API_KEY` env; Google Translate v3 stays optional (needs `GOOGLE_APPLICATION_CREDENTIALS` + `GOOGLE_PROJECT_ID`) — without either, the endpoint returns 501 and the UI hides the action. |
| `translation-publish` | callable | `POST …/translations/publish` → upsert `translation_published` (with fallback fill), update `progress`, bump `translation_version`, webhook. |
| `translation-publishdraft` | callable | **Deleted.** Draft translations are computed on read from `translations`; every translation write bumps `translation_version`. Removes the extra callable the UI fires after every edit. |
| `translation-deleteall` | callable | `DELETE …/translations`. |
| `translation-translatelocale` | callable | `POST …/translations/translate-locale` (single transaction for the writes). |
| `openapi-generate` | callable | `GET …/open-api` (service moved as-is). |
| `unsplash-search` / `unsplash-random` | callable | `GET /api/app/plugins/unsplash/{search,random}`, key from `UNSPLASH_API_KEY`. |
| `user-invite` | callable | `POST /api/app/users` (`canGrant` check unchanged, argon2 hash). |
| `user-sync` | callable | **Deleted.** There is no second user store to sync from. |
| `user-onupdate` (claims sync) / `user-ondelete` | trigger | **Deleted.** Role/permissions live on `users`, read per request, so changes apply immediately (today they wait for an ID-token refresh). |
| `user-beforecreated` / `user-beforesignedin` | Auth blocking | Inline in `AuthService.register/login`. |

Webhooks: keep `triggerWebHooksForEvent`, but call it **after commit** and don't await it on the request
path (today deliveries run inside the callable). A `webhook_deliveries` outbox table with retries is a
natural follow-up but not required for parity.

Cross-cutting replacements: Remote Config server template → env vars; `FIREBASE_CONFIG` → removed;
`isEmulatorEnabled` → `NODE_ENV`/explicit flags (keep the SSRF localhost exception behind
`LOCALESS_WEBHOOK_ALLOW_LOCALHOST`).

### Public API (`/api/v1`) — contract stays byte-compatible

- Same routes, query params, token formats (V1/V2, `?token=`, `X-API-KEY`), status codes and
  `Cache-Control` values (`docs/cdn-caching.md`). Port the existing supertest suites first and run them
  against the new server as the acceptance test.
- `cv` = `spaces.content_version` / `translation_version` instead of GCS generation. Values change once
  at cutover, which just causes one extra redirect per client.
- Published content/translations read from `content_published` / `translation_published`.
  `resolveLink` / `resolveReference` / `resolveAsset` become batched `where id = any($1)` queries.
- Assets: stream from `StorageDriver`; ETag from `assets.md5`. **There is no Firebase CDN any more**, so
  every image transform would hit sharp. Add a rendition cache on disk/S3
  (`spaces/{s}/assets/{id}/renditions/{hash(params)}`) and document putting a CDN/reverse proxy in front
  for production — the existing `Cache-Control` headers already make that work.
- Token cache: keep the 5-minute in-memory cache, and invalidate it on token update via the same
  `NOTIFY` channel as SSE (§4), so multi-instance setups stay correct.

---

## 3. Authentication: Firebase Auth → NestJS auth

**Session cookies, not bearer JWTs.** The SPA is served from the same origin, `<img>` asset URLs and
`EventSource` can't send headers, and a DB session can be revoked immediately (role change, lock,
delete). Concretely:

- `AuthModule` with plain Nest guards (no Passport needed for local login):
  - `POST /api/auth/login` (email + password, argon2id via `@node-rs/argon2`, rate-limited with
    `@fastify/rate-limit`), `POST /api/auth/logout`, `GET /api/auth/me` (user, role, permissions,
    providers), `POST /api/auth/password-reset/{request,confirm}`.
  - Cookie: `@fastify/cookie`, `HttpOnly; Secure; SameSite=Lax`, random 32-byte value, only its hash
    stored in `sessions`. Sliding expiry.
  - CSRF: `SameSite=Lax` + require `X-Requested-With`/custom header on non-GET `/api/app/**` (Angular
    interceptor adds it).
- **Google / Microsoft**: OIDC authorization-code + PKCE via `openid-client`:
  `GET /api/auth/oauth/:provider` → redirect → `/api/auth/oauth/:provider/callback`. `hd` (Google) and
  `tenant` (Microsoft) come from `LOCALESS_AUTH_CUSTOM_DOMAIN`, and the server **verifies** the `hd`/`tid`
  claim (Firebase only passed it as a hint). Redirect flow replaces `signInWithPopup`.
  Linking rule: match on verified email to an existing user; never auto-create unless
  `LOCALESS_AUTH_AUTO_REGISTER=true` (today `beforeUserCreated` creates a profile with no role, which is
  equivalent to "no access").
- **Password reset email**: Firebase sent these for free. Needs SMTP (`nodemailer`, `SMTP_URL`). Without
  SMTP configured, admins get a "copy reset link" action in user management instead.
- **Authorization**: `PermissionsGuard` + `@RequirePermissions(UserPermission.CONTENT_UPDATE)` decorator.
  `admin` passes everything, `custom` needs the permission — the same helpers as
  `functions/src/utils/user-auth-utils.ts`. `firestore.rules` / `storage.rules` are translated rule by
  rule (the inventory is in the appendix); the non-trivial ones become service checks:
  - task create/delete: caller must hold the permission named by `kind`; `ASSET_REGEN_METADATA` admin-only;
  - user update/delete: `canGrant` + "outrank" check (can't edit self, admins, or users with permissions
    you lack);
  - webhook URL validation (https, ≤ 2048 chars, localhost exception) moves into the zod DTO.
- `updatedBy` is set from the session on the server (today the client sends it — trusted input).

---

## 4. Realtime listeners → SSE + refetch

About 40 frontend reads are live Firestore listeners, and the UI relies on them: there are no refetches
after writes, and four flows wait on server-side changes (asset `inProgress`, task status/logs,
`publishedAt`, dashboard overview; webhook logs too).

Proposal — keep the Observable contract of every service so components don't change:

- Server: after commit, `pg_notify('localess', '{"space":"…","entity":"contents","id":"…","op":"update"}')`.
  A single `LISTEN` connection per instance fans out to `GET /api/app/events?space=:s` (Nest `@Sse()`,
  works on the Fastify adapter). `NOTIFY` makes it work across instances with no extra infrastructure.
- Client: a small `LiveQuery` helper —
  `live(key, () => http.get(...))` = fetch once, then refetch (debounced) whenever an SSE event matches
  `key`. `findAll`, `findById`, `countAll`, `findLogs` keep returning long-lived Observables.
- One `EventSource` per selected space, opened by `SpaceStore`, reconnects automatically, cookie-auth.

Polling would also work for the four server-driven flows, but SSE keeps the "lists stay current" UX for
free and is the smaller frontend diff.

---

## 5. Storage + background jobs

**`StorageDriver` interface** (`put(stream)`, `get(range?)`, `stat`, `delete`, `deletePrefix`, `move`)
with two drivers:

- `fs` (default): `$LOCALESS_DATA_DIR/storage/<same key layout as today>`. Zero setup, works with
  embedded Postgres for a single-box install.
- `s3` (optional, `@aws-sdk/client-s3`): S3/MinIO/R2/GCS-interop for multi-instance deployments.

Only binaries stay in storage: `assets/{id}/original`, rendition cache, and `tasks/{id}/original`. The
published/draft JSON and `cache.json` files move into Postgres (§1).

Uploads go through the server (`@fastify/multipart`, streamed, size-limited) instead of the browser
writing to Storage directly. The "create doc with `inProgress`, then upload, then trigger clears it" dance
becomes one request that returns the finished asset. Import uploads (`tasks/tmp/{ts}`) become part of
the `POST …/tasks` multipart request, which removes the `tmpPath` validation entirely.

**Job worker** (replaces `task-oncreate`, using what we already have — Postgres — no Redis):

```sql
update tasks set status = 'IN_PROGRESS', locked_by = $worker, locked_at = now()
where id = (select id from tasks where status = 'INITIATED'
            order by created_at for update skip locked limit 1)
returning *;
```

Woken by `NOTIFY task_created` with a 30 s poll fallback; stale `locked_at` (> 15 min) is re-queued on
boot. Concurrency 1 per instance by default (exports load whole spaces into memory — same envelope as
today's single 4 GiB instance). `pg-boss` is the drop-in alternative if retries/scheduling are wanted
later. Task downloads: `GET /api/app/spaces/:s/tasks/:id/download` (cookie-auth stream) replaces
`getDownloadURL`.

System deps in the image: `ffmpeg` (video thumbnails), `exiftool-vendored` (bundles Perl on Linux),
`sharp` (prebuilt, glibc). Use a Debian-slim base, not Alpine — this also matters for embedded-postgres
binaries (verify musl support before considering Alpine).

---

## 6. Frontend changes

| Area | Change |
|---|---|
| `app.config.ts` | Remove `provideFirebaseApp`, Auth, Firestore, Storage, Functions, Analytics, Performance, Remote Config, `AuthGuardModule`. Add an auth/CSRF interceptor and `provideAppInitializer` that loads `GET /api/config` + `GET /api/auth/me`. |
| Config | `LOCALESS_*` `--define`s, `firebase-config*.json`, `environment.firebase/functions/emulator` → **runtime** `/api/config` (`auth.providers`, `customDomain`, `login.message`, `plugins.unsplash`, `translate.enabled`). One build artefact for every install; `defines.mjs` and the `deploy` Angular configuration go away. |
| 17 services | Same public method signatures, bodies switch to `HttpClient` + `LiveQuery`. Callable wrappers become plain POST/GET. `translation.service` drops every `publishDraft()` call. `create*` return the created entity (callers only read `.id` today). Remove `traceUntilFirst` everywhere. |
| Models | `Timestamp` → `string` (ISO). `*FS`/`FieldValue` create types → DTOs from `libs/contracts`. Fix the ~38 `.toDate()`, `.seconds`, `.toMillis()` template usages (`| date` accepts ISO strings directly; durations via `Date.parse`). `dashboard.component.ts` `Timestamp.now()` → `new Date()`. |
| `UserStore` | `load` = `GET /api/auth/me` (re-fetched on `user` SSE events for the current user). Provider flags from `providers[]`. Role/permissions from the response instead of `getIdTokenResult`. |
| Guards | `@angular/fire/auth-guard` `AuthGuard` + 7 `authGuardPipe`s → one functional `permissionGuard(...perms)` reading `UserStore`. (Also fixes the `tasks` route currently guarded by `TranslationRead`.) |
| Login / reset / me | `signInWithEmailAndPassword` → `POST /api/auth/login`; Google/Microsoft buttons → `location.href = '/api/auth/oauth/google'`; reset → `POST /api/auth/password-reset/request`; `MeService` → `PATCH /api/app/me`, `/me/email`, `/me/password`; `signOut` → `POST /api/auth/logout`. |
| Uploads | `uploadBytes(Resumable)` → `HttpClient` multipart with `reportProgress: true`. |
| Stores | `SpaceStore`: same shape, sources become live queries + owns the space `EventSource`. `AppSettingsStore`: drop Remote Config, `settings` via `GET/PATCH /api/app/settings`. `LocalSettingsStore`: unchanged. |
| Tests | `src/test-setup.ts` global `vi.mock` of `@angular/fire/*` → `provideHttpClientTesting()` + `HttpTestingController` per service spec (update `docs/testing.md`). |
| Dev | `proxy.conf.cjs` `/api` → Nest port. `npm start` = `ng serve` + `nest start --watch` (embedded Postgres auto-starts). Delete `proxy.conf.js` duplicate. |

---

## 7. Hosting, deploy, tooling

- `@fastify/static` on `dist/localess/browser` with `wildcard: false` + `setNotFoundHandler` returning
  `index.html` for non-`/api` GETs. Reproduce `firebase.json` headers in an `onSend` hook (or
  `@fastify/helmet`): CSP-Report-Only (drop the googleapis / cloudfunctions / run.app / analytics origins),
  `X-Frame-Options`, nosniff, Referrer-Policy, Permissions-Policy; `immutable` for hashed
  `*.<hash>.(js|css)`; `no-cache` for `ngsw*` and `index.html`. `/scripts/sync-v1.js` stays public and
  cross-origin-readable.
- **Dockerfile**: multi-stage (build Angular + server) → `node:24-slim` + ffmpeg, `VOLUME /data`
  (`LOCALESS_DATA_DIR`). Works standalone (embedded PG + fs) or with `DATABASE_URL` + S3.
  `docker-compose.yml` example with a real Postgres.
- **Obsolete**: `functions/`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`,
  `storage.rules`, `remoteconfig.template.json`, `cloudbuild.yaml`, `firebase-export/`, and the GCP parts
  of `scripts/localess/` (projects, billing, APIs, labels/markers, regions, bucket CORS, web app, hosting,
  invoker IAM, Artifact Registry, `firebase-*.mjs`).
- **`localess` CLI is re-pointed at the server** (`node server/dist/cli.js` / `npm run localess --`):
  - `db:migrate` (same code as boot), `admin:create --email` (old `check --fix` admin bootstrap),
  - `check` (DB reachable, migrations current, admin exists, storage writable, optional keys present),
  - `import:firebase --project <id>` (§8).

---

## 8. Data migration from an existing Firebase install

One-shot, idempotent `localess import:firebase` using `firebase-admin` (read-only on the source):

1. **Firestore** → walk `configs`, `users`, `spaces` and each subcollection, map documents 1:1 (same
   ids), `Timestamp` → `timestamptz`, `contents.data` JSON string → `jsonb`. `insert … on conflict do
   update` so it can be re-run for a delta before cutover.
2. **Storage** → copy `spaces/*/assets/*/original` into the new driver, computing `md5`. Read each
   published `contents/{id}/{locale}.json` and `translations/{locale}.json` into
   `content_published` / `translation_published` (do **not** re-publish — the published snapshot can
   legitimately differ from the current draft). Skip draft JSON and `cache.json`. Skip old task files.
3. **Auth** → run `firebase auth:export --format=json` (includes `passwordHash`/`salt`), plus the
   project's scrypt parameters (Console → Authentication → Users → ⋮ → *Password hash parameters*).
   Store as `hash_algo = 'firebase-scrypt'`; verify with a Firebase-scrypt implementation on login and
   **re-hash to argon2id on first successful login**. Users keep their passwords. Google/Microsoft
   identities map from `providerUserInfo` (`providerId`, `rawId`). Role/permissions/lock from custom
   claims (fall back to the `users/{uid}` doc).
4. Bump every space's `content_version`/`translation_version` once.

Cutover: freeze edits → final delta import → switch DNS → keep the Firebase project read-only for a
rollback window.

---

## 9. Phasing

Each phase is shippable on a long-lived branch; the frontend switch is atomic per data source, so
phases 3–5 land together.

| # | Phase | Exit criteria |
|---|---|---|
| 0 | ADR, `server/` scaffold: Nest+Fastify, static serving + headers, config, embedded-postgres, Drizzle schema + boot migrator, `libs/contracts` | `npm start` serves the current SPA from Nest on one port with an empty migrated DB |
| 1 | `AuthModule`, users, sessions, permission guard, `admin:create` CLI | Email login + OAuth working; guard unit tests mirror `firestore.rules` cases |
| 2 | Public `/api/v1` on Postgres + StorageDriver + rendition cache | Ported `functions/src/v1` supertest suites green against Nest |
| 3 | `/api/app/**` per domain (spaces, contents, schemas, translations, assets, tokens, webhooks, users, settings) + SSE | Endpoint-level tests per domain |
| 4 | JobWorker: tasks, asset metadata, webhooks after commit | Export → import round-trip test per kind |
| 5 | Frontend swap (services, models, stores, guards, login, config, tests) | `npm test` green, manual smoke of every feature |
| 6 | `import:firebase` + `check` CLI | Import of a real export, public API diff (old vs new) on sample URLs is empty |
| 7 | Delete Firebase code + docs rewrite (`docs/deployment/*`, `testing.md`, `frontend-permissions.md`, `cdn-caching.md`, `publish-flow.md`, `CLAUDE.md`) | No `firebase`/`@angular/fire` in `package.json` files |

## Progress log

- **Phase 0 — done.** `server/` (NestJS 12 + Fastify 5, native ESM because Nest 12 ships ESM-only),
  `@fastify/static` + `SpaFallbackFilter`, env config (`src/config/config.ts`), embedded Postgres 18
  (`src/database/embedded-postgres.ts`), Drizzle schema for all 18 tables + `drizzle/0000_init.sql`,
  advisory-locked migrate-on-boot, `/api/health`. Tests: `npm run server:test` (vitest + SWC; one
  embedded cluster per run, one database per test file). Deferred: `libs/contracts` moves in with the
  first domain module that needs shared DTOs (Phase 3). `contents.full_slug` is indexed but not unique,
  so imported Firestore data with duplicate slugs can't block the migration.

- **Phase 1 — done.** Session auth (`src/auth/`): argon2id passwords, hashed session tokens, CSRF
  header rule, login rate limit, global `AuthGuard` + `@Public`/`@Require*` decorators, permission
  model ported from firestore.rules (`permissions.ts`). Users (`/api/app/users`, invite / access /
  delete with `canGrant` + outrank), own profile (`/api/app/me`), password reset (email via SMTP, or
  admin-created links), Google / Microsoft OIDC (`openid-client`, PKCE + state + nonce),
  `GET /api/config`, first admin via `admin:create` CLI or `LOCALESS_ADMIN_*` on boot. Tests run the
  OAuth flow against a real local OIDC issuer (`oauth2-mock-server`).
  Decisions taken: Microsoft sign-in requires a tenant (`LOCALESS_AUTH_CUSTOM_DOMAIN`); multi-tenant
  would mean linking accounts by emails no tenant admin vouches for. OAuth never creates accounts
  unless `LOCALESS_AUTH_AUTO_REGISTER=true`. Importing Firebase password hashes (`firebase-scrypt`)
  lands with the Firebase import (Phase 6).

- **Phase 2 — done.** Public `/api/v1` on Postgres: CDN routes (`cdn.controller.ts`), DEV_TOOLS and
  MANAGE (`dev-tools.controller.ts`, `manage.controller.ts`), token auth with the 5-minute cache,
  `StorageDriver` + filesystem driver, asset delivery with rendition cache, Range and per-request temp
  dirs. Pure modules moved with their tests (image transforms, ETags, OpenAPI generation, schema push
  planning, translation planning, locale extraction). The functions-era v1 route tests were ported as
  acceptance tests against real rows and files (`test/v1-*.test.ts`), plus new coverage for auth
  bodies, translations, locale fallback, drafts, resolve flags, links, CORS and video thumbnails
  (ffmpeg-static in tests). Migration `0001` makes content and asset ids space-scoped (export/import
  repeats ids across spaces) — hand-written, with an upgrade-path test.
  Behaviour changes, all deliberate:
  - `GET /links?parentSlug=blog` no longer includes sibling folders sharing the prefix
    (`blog-archive`); the Firestore range query matched them.
  - Drafts always exist and reflect the current schemas (they were snapshots written on save, absent
    for never-edited documents). Translation and schema pushes bump the space version accordingly.
  - The "Publish first" 404s keyed on a missing `cache.json` can't happen; unpublished content now
    gets the post-redirect 404 instead.
  - A latent vacuous test was fixed: sharp 0.35 replaced `paletteBitDepth` with `isPalette`.
  Not yet: webhooks for translation pushes (Phase 4), the S3 driver (open decision 1).

- **Phase 3 — done** (slices 3a–3e). `/api/app/**` for spaces, locales, settings, schemas, contents,
  translations, assets, tokens, webhooks, tasks (CRUD; processing is phase 4), OpenAPI, machine
  translation (DeepL / Google / stub) and Unsplash. Change events via `pg_notify` inside the write
  transaction → one `LISTEN` → SSE (`/api/app/events`). Webhook dispatch moved here from phase 4
  because publish needs it: SSRF-safe, HMAC-signed, logged, sent after commit. Token edits invalidate
  the public API's token cache on every instance. Asset uploads stream to storage, extract metadata
  in-request, and create the row last.
  Bugs found on the way: uploads over the size limit were stored truncated (multipart ends the stream
  instead of failing — now 413); body-less JSON POSTs were rejected by Fastify (now accepted).
  Behaviour changes: moving asset folders is refused (descendants carry the folder path; the UI only
  ever moved files); deleting the fallback locale is refused; content slugs must be unique per space
  and their parent must be a folder; `updatedBy` comes from the session; translate-locale uses the
  configured provider (was Google only); publishing translations of an empty space is allowed;
  settings are readable by every role (the store loads them for everyone).

- **Phase 4 — done.** Task worker (`src/tasks/`): all nine task kinds, archive layouts and file names
  unchanged (a hand-built Firebase-era archive with string `data` imports in the tests), queue claimed
  with `FOR UPDATE SKIP LOCKED`, stale IN_PROGRESS tasks failed rather than re-run, exports streamed
  into storage, imports read entry by entry from the stored zip with size caps (no extraction to disk,
  so no zip-slip; caps stop zip bombs). Imports are transactional and bump versions / emit events /
  fire webhooks like the triggers did. Round-trip tests export each kind from one space and import it
  into another (the case that needed space-scoped ids).
  Bug caught by the round-trip test: validated imports must write the raw items, not zod's parsed
  output, because the export schemas strip document data fields (the old code did the same).
  Changes: asset export no longer fails when an asset's file is missing (logged and skipped); new
  imported files get md5 and, when the export lacks it, extracted metadata.

- **Phase 5 — done.** The SPA runs on the NestJS server: `@angular/fire` and `firebase` removed.
  `core/api/` holds the runtime config (`GET /api/config` replaces the LOCALESS_* defines and
  `firebase-config*.json`), the SSE change stream, `liveQuery` (services keep returning long-lived
  Observables, refetching on change events), and the interceptor (CSRF header; 401 → signed out).
  All 18 services moved to HttpClient with HttpTestingController specs; models use ISO strings;
  `UserStore` reads `/api/auth/me`; `permissionGuard` replaces `@angular/fire/auth-guard` (and the
  tasks route now requires an import/export permission instead of TRANSLATION_READ); login uses
  OAuth redirects, reset works by email or admin-issued link (`/auth/reset/confirm`), and the profile
  dialogs ask for the current password. Admin → Users lost "Sync" and gained "Copy password reset
  link". Verified in a real browser against the compiled server: sign-in, dashboard, live updates
  across sessions, edit, publish → public API, sign-out.
  Bugs found on the way: a wrong current password answered 401, which signs the user out (now 403);
  the expected 401 of a signed-out visitor's session check raised an error toast (API 401s are now
  left to the auth flow); a FormData implementation dropped the upload filename of Blobs (uploads now
  append a File).

- **Phase 6 — done.** `import:firebase` (re-runnable upsert of Firestore, Storage and Auth through a
  thin `FirebaseSource`; firebase-admin adapter) and a self-hosted `check`. Firebase scrypt verified
  against the reference vector of github.com/firebase/scrypt; imported hashes are self-contained
  (`firebase-scrypt$rounds$memCost$saltSeparator$signerKey$hash`) and re-hashed to argon2id at first
  sign-in. Tested end to end with a Firebase-shaped fixture (Timestamps, string `data`, published
  snapshots, phone-only and clashing users): import → sign in with the Firebase password → public API
  serves the imported content with the original asset ETags → re-run is idempotent. Not testable
  here: the firebase-admin adapter against a real project (no emulator tooling in this environment).

## Open decisions

1. **Storage default** — local FS (proposed) vs. S3-first. FS limits you to one instance unless the
   volume is shared.
2. **Keep Firebase as an optional deploy target?** Proposed: no. Supporting both doubles every data path.
3. **Google Cloud Translation** — keep as an optional provider (needs GCP credentials) or DeepL-only.
4. **Email** — SMTP required for password reset, or admin reset links only.
5. **Multi-instance** — the design supports it (advisory lock, `NOTIFY`, `SKIP LOCKED`, S3), but the
   default target is a single container.

## Appendix: rule → guard mapping

| Resource | Read | Create | Update | Delete |
|---|---|---|---|---|
| spaces | any authenticated `custom`/`admin` | `SPACE_MANAGEMENT` | `SPACE_MANAGEMENT` | `SPACE_MANAGEMENT` |
| translations | `TRANSLATION_READ` | `TRANSLATION_CREATE` | `TRANSLATION_UPDATE` | `TRANSLATION_DELETE` |
| translations publish | — | — | `TRANSLATION_PUBLISH` | — |
| schemas | `SCHEMA_READ` or `CONTENT_READ` | `SCHEMA_CREATE` | `SCHEMA_UPDATE` | `SCHEMA_DELETE` |
| contents | `CONTENT_READ` | `CONTENT_CREATE` | `CONTENT_UPDATE` | `CONTENT_DELETE` |
| contents publish | — | — | `CONTENT_PUBLISH` | — |
| assets (+ files) | `ASSET_READ` or `CONTENT_READ` | `ASSET_CREATE` | `ASSET_UPDATE` | `ASSET_DELETE` |
| tasks (+ logs, files) | any `*_IMPORT`/`*_EXPORT` | permission == `kind` | server only | permission == `kind` |
| tokens, webhooks (+ logs) | `SPACE_MANAGEMENT` | `SPACE_MANAGEMENT` | `SPACE_MANAGEMENT` | `SPACE_MANAGEMENT` |
| users | self, or `USER_MANAGEMENT` | `USER_MANAGEMENT` + `canGrant` | `USER_MANAGEMENT` + outrank | `USER_MANAGEMENT` + outrank |
| settings | `SETTINGS_MANAGEMENT` (read: any authenticated, for UI) | — | `SETTINGS_MANAGEMENT` | — |
| translate / unsplash | `TRANSLATION_UPDATE`+`CONTENT_UPDATE` / `ASSET_CREATE` | | | |
| open-api | `DEV_OPEN_API` | | | |

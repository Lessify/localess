# Localess server

Self-hosted backend replacing Firebase: NestJS 12 on Fastify, Postgres via Drizzle, session auth.
It also serves the Angular build, so the whole app runs on one port. Migration plan and status:
[docs/roadmap/firebase-to-nestjs-postgres.md](../docs/roadmap/firebase-to-nestjs-postgres.md).

## Commands

```bash
npm run build          # tsc → dist/
npm start              # node dist/main.js
npm run dev            # build + start
npm test               # vitest (starts a throwaway embedded Postgres)
npm run db:generate    # drizzle-kit: SQL migration from src/database/schema.ts changes (commit the output)
npm run cli -- db:migrate
LOCALESS_ADMIN_PASSWORD=… npm run cli -- admin:create --email admin@example.com [--name "Admin"]
```

From the repo root: `npm run server:dev`, `npm run server:test`, `npm run server:build`.

On every boot the server applies pending migrations (under a Postgres advisory lock, so several
instances can start at once). Without `DATABASE_URL` it starts an embedded Postgres in
`$LOCALESS_DATA_DIR/pgdata`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Listen address |
| `DATABASE_URL` | – | External Postgres. Unset → embedded Postgres |
| `LOCALESS_DATA_DIR` | `.data` | Embedded Postgres data (and, later, file storage) |
| `LOCALESS_EMBEDDED_PG_PORT` | `5433` | Port of the embedded Postgres (127.0.0.1 only) |
| `LOCALESS_STORAGE_DIR` | `$LOCALESS_DATA_DIR/storage` | Uploaded files and generated image renditions |
| `LOCALESS_FFMPEG_PATH` | `ffmpeg` on PATH | ffmpeg binary for video thumbnails |
| `LOCALESS_UPLOAD_MAX_MB` | `1024` | Largest asset / import upload |
| `DEEPL_API_KEY` | – | Machine translation via DeepL (preferred) |
| `GOOGLE_CLOUD_PROJECT` / `LOCALESS_GOOGLE_TRANSLATE_LOCATION` | – / `global` | Machine translation via Google Cloud Translation (credentials from ADC) |
| `LOCALESS_TRANSLATE_PROVIDER` | – | `stub` echoes inputs (development) |
| `UNSPLASH_API_KEY` | – | Enables the Unsplash asset picker |
| `LOCALESS_WEBHOOK_ALLOW_INTERNAL` | `false` | Let webhooks reach private/loopback addresses (local development only) |
| `LOCALESS_TASK_WORKER` | `true` | Run export/import tasks on this instance |
| `LOCALESS_STATIC_DIR` | `../dist/localess/browser` | Angular build to serve; empty → API only |
| `LOCALESS_LOG_LEVEL` | `log` | `fatal`…`verbose`; `debug` includes the embedded Postgres log |
| `LOCALESS_PUBLIC_URL` | request origin | Public origin for OAuth callbacks and reset links |
| `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` | – | Create the first admin on boot while there are no users |
| `LOCALESS_LOGIN_MESSAGE` | `''` | Message on the login page |
| `LOCALESS_LOGIN_RATE_LIMIT` | `10` | Login / reset attempts per client IP per minute |
| `LOCALESS_AUTH_PROVIDERS` | `''` | `GOOGLE,MICROSOFT` |
| `LOCALESS_AUTH_CUSTOM_DOMAIN` | `''` | Google Workspace domain (`hd`, verified); Microsoft tenant (required for Microsoft) |
| `LOCALESS_AUTH_AUTO_REGISTER` | `false` | Create a role-less account on first OAuth sign-in |
| `LOCALESS_GOOGLE_CLIENT_ID` / `_SECRET` | – | Google OAuth client; redirect URI `<origin>/api/auth/oauth/google/callback` |
| `LOCALESS_MICROSOFT_CLIENT_ID` / `_SECRET` | – | Entra ID app; redirect URI `<origin>/api/auth/oauth/microsoft/callback` |
| `LOCALESS_SMTP_URL` / `LOCALESS_SMTP_FROM` | – | Enables password reset emails; otherwise admins create reset links |

## Authentication

- Session cookie `localess_session` (HttpOnly, SameSite=Lax, Secure on https); only its SHA-256 is
  stored. 30-day sliding expiry. Role and permissions are read from `users` on every request.
- Every non-GET request authenticated by the cookie must send `X-Requested-With` (CSRF).
- Routes need a session unless `@Public()`; access rules use `@RequireAnyRole()`,
  `@RequirePermission(...)` (any of) and `@RequireAllPermissions(...)` from `src/auth/decorators.ts`.
- `src/auth/permissions.ts` holds `canPerform`, `canGrant` and `canManageUser`, ported from
  firestore.rules and functions/src/utils.

| Endpoint | |
|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | Email + password session |
| `POST /api/auth/password-reset/request` · `…/confirm` | Reset by email (link → `/auth/reset/confirm?token=`) |
| `GET /api/auth/oauth/:provider[?returnTo=]` · `…/callback` | Google / Microsoft (code + PKCE); errors → `/auth/login?error=` |
| `GET /api/config` | Runtime settings for the SPA (providers, login message) |
| `GET/PATCH /api/app/me` · `PUT /api/app/me/email` · `PUT /api/app/me/password` | Own profile |
| `GET/POST /api/app/users` · `GET/PATCH/DELETE /api/app/users/:id` · `POST …/:id/password-reset-link` | User management |

## Public API (`/api/v1`)

Same URLs, parameters, token rules, status codes, bodies and `Cache-Control` values as the former
`publicv1` function (see [docs/cdn-caching.md](../docs/cdn-caching.md),
[docs/v1-functions-api.md](../docs/v1-functions-api.md)). Code: `src/public-api/` (controllers) and
`src/public-api/lib/` + `src/domain/` (pure logic moved from `functions/src` with its tests).

- `cv` is the space's `content_version` / `translation_version`, bumped on every change.
- Published documents and translations are read from `content_published` / `translation_published`;
  `?version=draft` is built from the live rows on every request.
- Assets stream from storage with `Range` support; generated renditions are cached under
  `spaces/{s}/assets/{id}/renditions/` and deleted with the asset. There is no CDN in front any more —
  put one (or a caching reverse proxy) in front for production; the headers are CDN-ready.
- CORS reflects any origin on `/api/v1/**` only.

## App API (`/api/app`)

What the SPA used Firestore, Storage and the callables for. Session cookie + `X-Requested-With` on
writes; permissions as in firestore.rules (see `src/app-api/*/*.controller.ts`). Responses keep the
Firestore document shapes plus `id`, with ISO timestamps and absent (not null) optional fields.

| Area | Endpoints |
|---|---|
| Change events | `GET /api/app/events?spaceId=` — SSE, `event: change`, `{ spaceId, entity, id, op }` |
| Spaces | `/api/app/spaces` CRUD, `POST …/:id/overview`, `POST/DELETE …/:id/locales[/:locale]`, `PUT …/:id/locale-fallback` |
| Settings | `GET /api/app/settings`, `PATCH /api/app/settings/ui` |
| Schemas | `/api/app/spaces/:s/schemas` CRUD, `PUT …/:id/id` (rename), `POST …/template` |
| Contents | `/api/app/spaces/:s/contents` list/`count`/get/create, `PATCH …/:id` (rename/move), `PUT …/:id/data`, `POST …/:id/clone`, `POST …/:id/publish`, `POST …/:id/unpublish`, `DELETE` |
| Translations | `/api/app/spaces/:s/translations` CRUD, `PUT …/:id/locales/:locale`, `PUT …/:id/id`, `POST …/publish`, `POST …/translate-locale`, `DELETE` (all) |
| Machine translation | `POST /api/app/translate` (`content` or `items`), `GET /api/app/translate/status` |
| Assets | `/api/app/spaces/:s/assets` list/`count`/get, `POST …/folders`, `POST …/files` (multipart, fields before file), `PATCH …/:id`, `PUT …/:id/parent`, `DELETE` |
| Tokens / webhooks | `/api/app/spaces/:s/tokens` (+ `POST …/:id/regenerate`), `/api/app/spaces/:s/webhooks` (+ `PATCH …/:id/status`, `GET …/:id/logs`) |
| Tasks | `/api/app/spaces/:s/tasks` list/get/`logs`/`download`, `POST` (exports), `POST …/import` (multipart), `DELETE` |
| Misc | `POST /api/app/spaces/:s/open-api`, `GET /api/app/plugins/unsplash/{search,random}` |

Writes are transactional; change events and the space's cache version are part of the same
transaction, and webhooks are sent only after it commits.

## Background tasks

`src/tasks/`: exports and imports (assets, contents, schemas, translations) and asset metadata
regeneration, with the same archive layouts and file names as the Firebase era, so old exports import.
The `tasks` row is the queue: `TaskWorker` claims the oldest INITIATED task with
`FOR UPDATE SKIP LOCKED` (safe with several instances), is woken by `tasks` change events and polls
every 30 s, and runs one task at a time. Exports stream the zip into storage; imports read only the
expected entries from the stored zip, each size-capped, never extracting to disk. A task still
IN_PROGRESS after an hour was interrupted and is marked ERROR (not re-run: imports may be half applied).

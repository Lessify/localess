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

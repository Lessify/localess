# Configuration

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Production](production.md) · [Health Check](check.md)

Localess is configured entirely by environment variables, read when the server (or CLI) starts.
There is no build-time configuration: change a value and restart. Invalid values (a malformed URL,
an unknown log level) stop the server at boot with an error naming the variable. The source of
truth is `server/src/config/config.ts`.

Run [`check`](check.md) after changing configuration to see what is enabled.

---

## Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Listen port |
| `HOST` | `0.0.0.0` | Listen address |
| `LOCALESS_PUBLIC_URL` | the request's origin | Public origin, e.g. `https://cms.example.com`. Used for OAuth callback URLs and password reset links. Set it whenever a proxy sits in front |
| `LOCALESS_STATIC_DIR` | `dist/localess/browser` in the checkout | Angular build to serve. Empty string → serve the API only |
| `LOCALESS_LOG_LEVEL` | `log` | `fatal`, `error`, `warn`, `log`, `debug`, `verbose`. `debug` and up include the embedded Postgres log |

## Database

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | – | External Postgres, e.g. `postgres://user:pass@host:5432/localess`. Unset → embedded Postgres |
| `LOCALESS_DATA_DIR` | `.data` (`/data` in the image) | Root of local state. The embedded cluster lives in `$LOCALESS_DATA_DIR/pgdata` |
| `LOCALESS_EMBEDDED_PG_PORT` | `5433` | Port of the embedded Postgres; it binds to `127.0.0.1` only |

Migrations run on every boot under a Postgres advisory lock, so several instances may start at the
same time. `db:migrate` runs them without starting the server.

## Storage

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_STORAGE_DIR` | `$LOCALESS_DATA_DIR/storage` | Asset originals, generated image renditions, task archives |
| `LOCALESS_UPLOAD_MAX_MB` | `1024` | Largest asset or import upload; larger uploads get `413` |
| `LOCALESS_FFMPEG_PATH` | `ffmpeg` on the `PATH` | ffmpeg binary for video thumbnails |

Only a filesystem storage driver exists today. For more than one instance the directory must be
shared — see [Production → Several instances](production.md#several-instances).

## First administrator

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` | – | Create this admin (and the "Hello World" space) on boot while there are no users. Password ≥ 6 characters. Ignored once any user exists |

`LOCALESS_ADMIN_PASSWORD` is also where `admin:create` reads its password from, if set.

## Sign-in

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_LOGIN_MESSAGE` | `''` | Text shown on the login page |
| `LOCALESS_LOGIN_RATE_LIMIT` | `10` | Login and password-reset attempts per client IP per minute |
| `LOCALESS_AUTH_PROVIDERS` | `''` | OAuth providers to offer, comma-separated: `GOOGLE`, `MICROSOFT` |
| `LOCALESS_AUTH_CUSTOM_DOMAIN` | `''` | Google: Workspace domain (sent as `hd` and **verified** on the returned token). Microsoft: the tenant (domain or tenant id) — **required** for Microsoft |
| `LOCALESS_AUTH_AUTO_REGISTER` | `false` | `true` creates an account (with no role) on the first OAuth sign-in of an unknown email |
| `LOCALESS_GOOGLE_CLIENT_ID` / `LOCALESS_GOOGLE_CLIENT_SECRET` | – | Google OAuth client |
| `LOCALESS_MICROSOFT_CLIENT_ID` / `LOCALESS_MICROSOFT_CLIENT_SECRET` | – | Microsoft Entra ID app registration |

Email + password sign-in is always available. Sessions are an HttpOnly cookie with a 30-day sliding
expiry; role and permission changes apply on the user's next request.

### Google

1. In Google Cloud console → *APIs & Services → Credentials*, create an **OAuth client ID** of type
   *Web application*.
2. Add the authorised redirect URI `<LOCALESS_PUBLIC_URL>/api/auth/oauth/google/callback`.
3. Set `LOCALESS_AUTH_PROVIDERS=GOOGLE`, `LOCALESS_GOOGLE_CLIENT_ID`, `LOCALESS_GOOGLE_CLIENT_SECRET`,
   and optionally `LOCALESS_AUTH_CUSTOM_DOMAIN=example.com` to accept only that Workspace domain.

### Microsoft

1. In Microsoft Entra ID → *App registrations*, register an app (single tenant) with a **Web**
   redirect URI `<LOCALESS_PUBLIC_URL>/api/auth/oauth/microsoft/callback`, and create a client secret.
2. Set `LOCALESS_AUTH_PROVIDERS=MICROSOFT` (or `GOOGLE,MICROSOFT`), `LOCALESS_MICROSOFT_CLIENT_ID`,
   `LOCALESS_MICROSOFT_CLIENT_SECRET`, and `LOCALESS_AUTH_CUSTOM_DOMAIN` to your tenant domain or id.

Multi-tenant Microsoft sign-in is not supported. Note that `LOCALESS_AUTH_CUSTOM_DOMAIN` is shared:
with both providers enabled it is the Google Workspace domain *and* the Microsoft tenant.

### Who may sign in with OAuth

OAuth only signs in **existing** users, matched by verified email: invite them first in
**Admin → Users**. With `LOCALESS_AUTH_AUTO_REGISTER=true`, unknown users get an account with no
role — they can sign in but see nothing until an admin grants access.

A provider listed in `LOCALESS_AUTH_PROVIDERS` but missing its client id/secret (or, for Microsoft,
a tenant) is not offered; the server logs why on boot and `check` reports it.

## Password reset email

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_SMTP_URL` | – | `smtp://user:pass@host:587` or `smtps://user:pass@host:465`. Enables "forgot password" emails |
| `LOCALESS_SMTP_FROM` | `Localess <no-reply@localhost>` | Sender address |

Without SMTP, users cannot reset their own password; an admin uses **Admin → Users → Copy password
reset link** and passes the link on.

## Machine translation

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEEPL_API_KEY` | – | Use DeepL (takes precedence) |
| `GOOGLE_CLOUD_PROJECT` | – | Use Google Cloud Translation in this project. Credentials via Application Default Credentials, e.g. `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key |
| `LOCALESS_GOOGLE_TRANSLATE_LOCATION` | `global` | Cloud Translation location |
| `LOCALESS_TRANSLATE_PROVIDER` | – | `stub` echoes the input back — for development only |

With none set, machine translation is off and the UI hides it.

## Unsplash

| Variable | Default | Purpose |
|----------|---------|---------|
| `UNSPLASH_API_KEY` | – | Enables the Unsplash picker in Assets |

## Background tasks and webhooks

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_TASK_WORKER` | `true` | Run export/import/metadata tasks on this instance. Set `false` on API-only replicas |
| `LOCALESS_WEBHOOK_ALLOW_INTERNAL` | `false` | Let webhooks call loopback/private addresses. Local development only — it disables SSRF protection |

The task queue is the `tasks` table: any instance with the worker on claims the oldest pending task,
one at a time. A task still running after an hour (for example because the process was killed) is
marked as failed, not retried.

## Firebase import only

Read by `import:firebase`, not by the server. See [Migrating from Firebase](migrate-from-firebase.md).

| Variable | Purpose |
|----------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Service-account key for the source Firebase project |
| `FIREBASE_SCRYPT_SIGNER_KEY`, `FIREBASE_SCRYPT_SALT_SEPARATOR`, `FIREBASE_SCRYPT_ROUNDS`, `FIREBASE_SCRYPT_MEM_COST` | The project's password hash parameters, so users keep their passwords |

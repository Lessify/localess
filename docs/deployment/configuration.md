# Configuration

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Production](production.md) · [Health Check](check.md)

Localess is configured entirely by environment variables, read when the server (or CLI) starts.
There is no build-time configuration: change a value and restart. Invalid values (a malformed URL,
an unknown log level) stop the server at boot with an error naming the variable. The source of
truth is `apps/server/src/infra/config/config.ts`.
Every variable is listed with its default and a short description in
[`apps/server/.env.example`](../../apps/server/.env.example), a starting point for `apps/server/.env` or a
Compose environment.

Run [`check`](check.md) after changing configuration to see what is enabled.

---

## Server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Listen port |
| `HOST` | `0.0.0.0` | Listen address |
| `LOCALESS_PUBLIC_URL` | the request's origin | Public origin, e.g. `https://cms.example.com`. Used for OAuth callback URLs and password reset links. Set it whenever a proxy sits in front |
| `LOCALESS_STATIC_DIR` | `apps/web/dist/browser` in the checkout | Angular build to serve. Empty string → serve the API only |
| `LOCALESS_LOG_LEVEL` | `log` | `fatal`, `error`, `warn`, `log`, `debug`, `verbose`. `debug` and up include the embedded Postgres log |

## Instance label

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_INSTANCE_NAME` | – | A label that tells installations apart, e.g. `Production` or `Test`: shown in the sidebar and on the login page. Unset or blank: no label |
| `LOCALESS_INSTANCE_COLOR` | `primary` | The label's color: `primary`, `secondary`, `outline` or `destructive`. Another value stops the server at boot |

It is configuration of the deployment, not data: a test environment filled with a copy of the production database
keeps its own label.

## Database

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | – | External Postgres, e.g. `postgres://user:pass@host:5432/localess`. Unset → embedded Postgres |
| `LOCALESS_DATA_DIR` | `.data` in the repo root (`/data` in the image) | Root of local state. The embedded cluster lives in `$LOCALESS_DATA_DIR/pgdata` |
| `LOCALESS_EMBEDDED_PG_PORT` | `5433` | Port of the embedded Postgres; it binds to `127.0.0.1` only |

Migrations run on every boot under a Postgres advisory lock, so several instances may start at the
same time. `db:migrate` runs them without starting the server.

## Storage

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_STORAGE_DIR` | `$LOCALESS_DATA_DIR/storage` | Asset originals, generated image renditions, task archives |
| `LOCALESS_UPLOAD_MAX_MB` | `1024` | Largest asset or import upload; larger uploads get `413` |
| `LOCALESS_RENDITION_CACHE` | `disk` | `disk` keeps generated image renditions (resized, re-encoded, thumbnails) in storage next to the original, so a repeat is not transformed again; `off` transforms on every request and stores nothing beyond the original. Use `off` behind a CDN or caching proxy, which caches the responses (365 days, versioned URLs) |
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
3. Under *Token configuration* → *Add optional claim* → **ID** token, add `email` and `xms_edov`.
   A user's first Microsoft sign-in links (or, with `LOCALESS_AUTH_AUTO_REGISTER`, creates) an
   account only when the token carries `email` with `xms_edov: true`, meaning the domain owner
   verified the address; otherwise it is refused with `email-not-verified`. Once linked, later
   sign-ins match the Microsoft identity, not the email.

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

## Integrations: environment or Admin → Settings

DeepL, Google Cloud Translation and Unsplash can be connected two ways:

- **In the app:** an admin opens **Admin → Settings → Integrations**, pastes the key and clicks **Test & enable**.
  Nothing to restart. Use this when you don't manage the server's environment.
- **In the environment:** set the variables below. The integration is then **locked**: its card in Admin → Settings
  shows "Server configuration" with the variable's name and can't be changed there. Change the variable and restart.

The environment always wins. When a lock variable is set, all of that integration's values come from the environment,
never mixed with values saved in the app. Removing the variable later (and restarting) hands the integration back to a
key saved in the app, if there is one.

| Integration | Lock variable | Other variables |
|-------------|---------------|-----------------|
| DeepL | `DEEPL_API_KEY` | `LOCALESS_DEEPL_API_URL` (DeepL's API origin, for proxies; picked from the key when unset) |
| Google Cloud Translation | `GOOGLE_CLOUD_PROJECT` | `LOCALESS_GOOGLE_TRANSLATE_LOCATION` (default `global`). Credentials via Application Default Credentials, e.g. `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key. In the app, paste the service-account key file instead |
| Unsplash | `UNSPLASH_API_KEY` | `LOCALESS_UNSPLASH_API_URL` (default `https://api.unsplash.com`) |

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_TRANSLATE_PRIMARY` | – | `deepl` or `google`: the provider tried first when both are connected. Locks the choice in the app. Unset: the admin's choice, else DeepL |
| `LOCALESS_TRANSLATE_PROVIDER` | – | `stub` echoes the input back — for development only |
| `LOCALESS_SECRET_KEY` | – | At least 32 characters. Encrypts the keys saved in the app. Unset: generated once into `$LOCALESS_DATA_DIR/secret.key` |

**Machine translation with two providers:** a language pair the primary supports goes to the primary, any other pair to
the other provider. When the primary fails on its key, its quota or the network, the request is retried on the other.
The Translate buttons only appear for locales a connected provider supports. With no provider, using a Translate action
answers `412 Precondition Failed` and the UI asks the user to have an admin connect one.

### Keys saved in the app

- They are encrypted in the database (AES-256-GCM) with `LOCALESS_SECRET_KEY`, or the generated `secret.key`, and are
  never shown again: the app shows only their last 4 characters. To change one, replace it.
- This protects them in a database dump or backup. It does not protect them from someone who controls the server, who
  can read the secret as they could read a `.env` file.
- **Keep the data directory persistent** (the `/data` volume in Docker) and **back up `secret.key` apart from the
  database**, for example in a password manager. Several instances sharing one database need the same secret: set
  `LOCALESS_SECRET_KEY` on all of them.
- If the secret is lost or changes, only the saved keys are affected: their cards say the key can't be read, and an
  admin enters them again. Everything else keeps working.
- If the data directory isn't writable and `LOCALESS_SECRET_KEY` is unset, the server still starts; integrations from
  the environment work, and saving a key in the app is refused with the reason.

## Background tasks and webhooks

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCALESS_TASK_WORKER` | `true` | Run export/import/metadata tasks on this instance. Set `false` on API-only replicas |
| `LOCALESS_TASK_CONCURRENCY` | `1` | Tasks one instance runs at once (1–16); imports hold their file's entries in memory, raise it only with the RAM. A space never runs two tasks at once |
| `LOCALESS_WEBHOOK_LOG_DAYS` | `30` | Days a webhook delivery log is kept; older ones are deleted every hour |
| `LOCALESS_WEBHOOK_ALLOW_INTERNAL` | `false` | Let webhooks call loopback/private addresses. Local development only — it disables SSRF protection |
| `LOCALESS_TEST_TEMPLATES` | `false` | Offer the test-only space templates (large generated data) — for development and e2e only; `pnpm dev` turns it on (`apps/server/dev.env`) |

The task queue is the `tasks` table: any instance with the worker on claims the oldest pending task,
one at a time. A task still running after an hour (for example because the process was killed) is
marked as failed, not retried.


# Deployment Overview

> Related: [Docker](docker.md) · [Configuration](configuration.md) · [Production](production.md) · [Updates & Backups](updates.md) · [Health Check](check.md) · [Migrating from Firebase](migrate-from-firebase.md)

## What you deploy

Localess is **one Node.js process** (the NestJS server in `apps/server/`). On a single port (`PORT`,
default `3000`) it serves:

| Path | What |
|------|------|
| `/` | The Angular admin UI (the production build in `apps/web/dist/browser`, with SPA fallback) |
| `/api/v1/**` | The public REST API used by your apps and SDKs |
| `/api/auth/**`, `/api/app/**` | Session login and the API the admin UI uses |
| `/api/health` | Liveness probe — `{"status":"ok"}` when the database answers |

The process also runs the background task worker (exports, imports, asset metadata regeneration).

It needs two kinds of state:

| State | Where |
|-------|-------|
| **Postgres** | `DATABASE_URL`, or — when unset — an embedded Postgres cluster the server starts itself in `$LOCALESS_DATA_DIR/pgdata` |
| **Files** (asset originals, image renditions, task archives) | The filesystem, in `$LOCALESS_DATA_DIR/storage` (override with `LOCALESS_STORAGE_DIR`) |

Database migrations run automatically on every boot. There is no separate provisioning step, no
cloud account, and no build-time configuration: everything is read from environment variables at
start-up (see [Configuration](configuration.md)), so one build serves every install.

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| Docker (with Compose) | For the Docker paths — the image contains everything else |
| — or Node.js 24 + pnpm | For a bare-Node install (`engines.node: 24`; install pnpm with `npm install -g pnpm`; Corepack can't launch pnpm 12) |
| `ffmpeg` | Video thumbnails. Without it, video assets upload but get no thumbnail |
| `perl` | Used by ExifTool for asset metadata extraction on Linux |
| Postgres | Optional. Any reachable Postgres via `DATABASE_URL`; otherwise the embedded one is used (the Compose file ships Postgres 18) |
| Persistent disk | For `$LOCALESS_DATA_DIR` (files, and the embedded database if used) |

---

## Three ways to run it

| Way | Database | Good for |
|-----|----------|----------|
| [Docker Compose](docker.md#docker-compose) | Separate `postgres` container | The recommended production setup |
| [Single container](docker.md#single-container) | Embedded Postgres in the `/data` volume | Small installs, trials, one-box setups |
| [Bare Node](#bare-node) | Embedded, or any Postgres via `DATABASE_URL` | Hosts without Docker, local development |

Whichever you pick, put a TLS-terminating reverse proxy in front of it for anything public, and
ideally a CDN in front of `/api/v1` — see [Production](production.md).

### Bare Node

From a checkout:

```bash
pnpm install --frozen-lockfile                                             # every workspace, one lockfile
pnpm version:generate                                                      # writes apps/web/src/assets/version.json (build version info)
pnpm build:prod                                                            # Angular → apps/web/dist/browser
pnpm server:build                                                          # server → apps/server/dist

export LOCALESS_DATA_DIR=/var/lib/localess                                 # files (+ embedded Postgres when DATABASE_URL is unset)
export DATABASE_URL=postgres://user:pass@db:5432/localess                  # optional
export LOCALESS_PUBLIC_URL=https://cms.example.com
export LOCALESS_ADMIN_EMAIL=admin@example.com LOCALESS_ADMIN_PASSWORD='…'  # first boot only
node apps/server/dist/main.js
```

The server finds the Angular build relative to its own location; set `LOCALESS_STATIC_DIR` if you
put it elsewhere. `LOCALESS_DATA_DIR` defaults to `.data` relative to the working directory, so set
it explicitly to an absolute path (the CLI runs from `apps/server/` and must find the same directory). Run the process under a supervisor (systemd or similar) that restarts it and sends
`SIGTERM` to stop it — the server shuts the embedded Postgres down cleanly on exit.

---

## The first administrator

There is no sign-up page and no setup wizard. Create the first admin one of two ways:

- **On first boot:** set `LOCALESS_ADMIN_EMAIL` and `LOCALESS_ADMIN_PASSWORD` (at least 6
  characters). While the database has no users, the server creates that admin and a "Hello World"
  space. Once any user exists the variables are ignored, so you can remove them after the first start.
- **With the CLI:** `pnpm localess admin:create --email <email> [--name <name>]`. The
  password comes from `LOCALESS_ADMIN_PASSWORD` or an interactive prompt — never a flag. See
  [The CLI](#the-cli).

Everyone else is invited from **Admin → Users**.

---

## The CLI

One command-line tool ships with the server:

```bash
pnpm localess <command>              # from a checkout (runs apps/server/dist/cli.js)
docker compose exec localess node server/dist/cli.js <command>   # in Docker
```

| Command | Does |
|---------|------|
| `db:migrate` | Apply pending migrations and exit (the server also does this on boot) |
| `check` | Report what the install has and lacks — see [Health Check](check.md) |
| `admin:create --email <e> [--name <n>]` | Create an administrator and the "Hello World" space |
| `import:firebase --project <id> [--bucket <b>] [--no-files]` | Copy a Firebase-era install in — see [Migrating from Firebase](migrate-from-firebase.md) |

Shortcuts: `pnpm localess:check` and `pnpm localess:import --project <id>`.

The CLI reads the same environment variables as the server, so run it with the same
`DATABASE_URL` / `LOCALESS_DATA_DIR`. With the **embedded** database, see
[Running the CLI against an embedded database](docker.md#running-the-cli-against-an-embedded-database).

---

## Local development

```bash
pnpm dev   # API on :3000 (embedded Postgres in apps/server/.data) + Angular dev server on :4200, proxying /api to :3000
```

The server restarts on every change (compiled with SWC); type errors are printed by a `tsc` watcher next to it.
Environment variables can go in `apps/server/.env` (gitignored, loaded by `pnpm dev` only). Set
`LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` for the first run to get an admin account. `LOCALESS_TRANSLATE_PROVIDER=stub` gives a fake machine translator and
`LOCALESS_WEBHOOK_ALLOW_INTERNAL=true` lets webhooks hit `localhost`.

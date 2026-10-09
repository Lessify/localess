# Checking an Installation

> Related: [Deployment Overview](overview.md) · [Configuration](configuration.md) · [Docker](docker.md)

## Running it

```bash
npm run localess -- check                                  # from a checkout
docker compose exec localess node apps/server/dist/cli.js check # Docker Compose
```

For a single container with the embedded database, see
[Running the CLI against an embedded database](docker.md#running-the-cli-against-an-embedded-database).

`check` reads the same environment variables as the server, connects to the database and reports
what the install has and lacks. It changes nothing except one thing: like every CLI command, it
**applies pending migrations** when it connects (the same advisory-locked step the server runs on
boot).

Exit code is **0** when nothing failed and **1** when any line is a failure (or when the database
cannot be reached at all — then the command prints the connection error instead of a report).
Warnings do not affect the exit code, so `check` works as a deploy gate.

## Reading the output

One line per check, marked `✓` (ok), `!` (warning — optional feature off or degraded) or `✗`
(failure — the install is not usable):

```
✓ database: reachable, migrations applied
✓ admin user: 1 admin(s)
✓ storage: writable (/data/storage)
✓ ffmpeg: available (video thumbnails)
✓ oauth sign-in: email + password only
! password reset email: no SMTP — admins create reset links in Admin → Users
! machine translation: not configured (DEEPL_API_KEY or GOOGLE_CLOUD_PROJECT)
! unsplash: not configured (UNSPLASH_API_KEY)
```

| Check | Can be | Meaning / fix |
|-------|--------|---------------|
| `database` | ✓ | Connected and migrated. Says *embedded Postgres in …/pgdata* when `DATABASE_URL` is unset |
| `admin user` | ✓ / ✗ | ✗ means nobody can administer the install: run `admin:create --email <email>` |
| `storage` | ✓ / ✗ | Writes and deletes a probe file in the storage directory. ✗: the directory is missing, read-only, or owned by another user (the image runs as `node`) |
| `ffmpeg` | ✓ / ! | ! : video thumbnails will fail. Install ffmpeg or set `LOCALESS_FFMPEG_PATH` |
| `oauth sign-in` | ✓ / ! | Lists enabled providers. ! names each provider listed in `LOCALESS_AUTH_PROVIDERS` that is missing its client id/secret or (Microsoft) a tenant |
| `password reset email` | ✓ / ! | ! : no `LOCALESS_SMTP_URL`; admins hand out reset links instead |
| `machine translation` | ✓ / ! | Shows the provider (`deepl`, `google`, `stub`); ! when none is configured |
| `unsplash` | ✓ / ! | ! : no `UNSPLASH_API_KEY`; the Unsplash picker is hidden |
| `public url` | ! | Only shown when `LOCALESS_PUBLIC_URL` is unset. Set it behind a reverse proxy so OAuth callbacks and reset links use the public origin |

Warnings are fine for features you do not use. See [Configuration](configuration.md) for every
variable.

## `check` vs `/api/health`

`GET /api/health` is the cheap liveness probe for load balancers and orchestrators: it only proves
the process is up and the database answers. `check` is the operator's report on configuration, run
by hand or after a deploy.

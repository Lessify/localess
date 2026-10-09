# Running with Docker

> Related: [Deployment Overview](overview.md) · [Configuration](configuration.md) · [Production](production.md) · [Health Check](check.md)

## The image

The root `Dockerfile` is a multi-stage build: it builds the Angular app and the server, then copies
both into a `node:24-slim` runtime with `ffmpeg` (video thumbnails) and `perl` (ExifTool metadata).

| Property | Value |
|----------|-------|
| User | `node` (not root) |
| Port | `3000` (`EXPOSE 3000`) |
| Data | `VOLUME /data`, `LOCALESS_DATA_DIR=/data` — files in `/data/storage`, embedded Postgres in `/data/pgdata` |
| Command | `node apps/server/dist/main.js` |
| Health check | Built in: `GET /api/health` every 30 s (60 s start period) |

Build it from the repository root:

```bash
docker build -t localess .
```

---

## Docker Compose

The recommended setup: Localess plus a dedicated Postgres container. The root `docker-compose.yml`
defines two services:

| Service | Image | State | Notes |
|---------|-------|-------|-------|
| `localess` | built from `.` | volume `localess-data` → `/data` (files) | Port `3000:3000`; `DATABASE_URL=postgres://localess:localess@postgres:5432/localess` |
| `postgres` | `postgres:18` | its own volume | The database |

`localess` waits for Postgres to report healthy, and both restart `unless-stopped`. The Postgres port
is not published; only the Compose network reaches it.

Before the first start, edit the `localess` environment in `docker-compose.yml`:

- `LOCALESS_PUBLIC_URL` — the public origin users reach (the file ships `http://localhost:3000`;
  behind a proxy, e.g. `https://cms.example.com`).
- `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` — the first administrator (the file ships
  `admin@example.com` / `change-me-now`), created on first boot while there are no users. Change
  them before the first start, and remove them afterwards.
- Optionally change the Postgres password — in both `DATABASE_URL` and the `postgres` service's
  `POSTGRES_PASSWORD`, before the first start (Postgres only applies it when initialising its volume).
- Uncomment or add whatever else you need from [Configuration](configuration.md) — DeepL, Unsplash,
  SMTP, OAuth.

Then:

```bash
docker compose up -d --build
docker compose logs -f localess              # migrations, first-admin creation, "listening"
docker compose exec localess node apps/server/dist/cli.js check
```

Open `http://localhost:3000` (or your `LOCALESS_PUBLIC_URL`) and sign in.

Secrets do not have to live in the Compose file: Compose reads an `.env` file next to
`docker-compose.yml` for `${VAR}` substitution, or you can add an `env_file:` entry to the
`localess` service.

---

## Single container

For a small install, run the image alone. With no `DATABASE_URL` the server starts an **embedded
Postgres** inside the `/data` volume, so one volume holds the whole install:

```bash
docker run -d --name localess \
  -p 3000:3000 \
  -v localess-data:/data \
  -e LOCALESS_PUBLIC_URL=https://cms.example.com \
  -e LOCALESS_ADMIN_EMAIL=admin@example.com \
  -e LOCALESS_ADMIN_PASSWORD='change-me' \
  localess
```

The embedded cluster listens on `127.0.0.1` inside the container only (port
`LOCALESS_EMBEDDED_PG_PORT`, default `5433`) and is stopped cleanly when the container receives
`SIGTERM` (`docker stop`). It is a real Postgres 18 cluster — back it up like one (see
[Updates & Backups](updates.md#backups)).

You can move from the embedded database to an external one later: `pg_dump` the embedded cluster
(see [Backups](updates.md#backups)), restore into the new server, and start with `DATABASE_URL` set.

### Running the CLI against an embedded database

The CLI connects to the database itself, so run it next to the server:

```bash
docker exec localess node apps/server/dist/cli.js check
```

With the embedded database, the CLI finds the cluster the running server already started in
`/data/pgdata` and attaches to it (leaving it running when it exits); with the server stopped, it
starts the cluster itself. The image has no `pg_dump`; to dump the embedded database see
[Backups](updates.md#backups).

---

## Health checks

`GET /api/health` returns `200 {"status":"ok"}` when the database answers, and is public. The image's
`HEALTHCHECK` already uses it (`docker ps` shows `healthy`); use it for orchestrator and
load-balancer probes too. For a full report of what is
configured, use the [`check` command](check.md).

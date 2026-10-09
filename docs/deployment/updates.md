# Updates, Backups and Rollback

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Production](production.md) · [Health Check](check.md)

## Upgrading

An upgrade is: new code, restart. Pending database migrations apply automatically on boot.

**Docker Compose**

```bash
git pull
docker compose up -d --build
docker compose logs -f localess
docker compose exec localess node server/dist/cli.js check
```

**Single container** — rebuild (or pull) the image, then replace the container on the same volume:

```bash
git pull && docker build -t localess .
docker stop localess && docker rm localess
docker run -d --name localess -p 3000:3000 -v localess-data:/data … localess
```

**Bare Node**

```bash
git pull
pnpm install --frozen-lockfile
pnpm version:generate && pnpm build:prod && pnpm server:build
# restart the process (systemctl restart localess, …)
```

**Take a backup before every upgrade** (below). Migrations are forward-only: there is no
"migrate down", so the backup is your way back.

### How migrations behave

- They run before the server starts listening, inside a Postgres advisory lock. With several
  instances, the first one migrates and the rest wait, then find nothing to do.
- If a migration fails, the server exits and does not serve requests. Fix the cause (see the log),
  or roll back.
- `db:migrate` runs them on demand without starting the server — useful as a separate deploy step.

---

## Backups

All state lives in two places. Back up both, at the same time, so the files match the rows that
reference them.

| What | Where | How |
|------|-------|-----|
| Database | External Postgres, or the embedded cluster in `$LOCALESS_DATA_DIR/pgdata` | `pg_dump` (or your provider's snapshots / point-in-time recovery) |
| Files | `$LOCALESS_DATA_DIR/storage` (`/data/storage` in Docker) | Any file-level copy: `rsync`, `tar`, volume snapshots |

**Docker Compose:**

```bash
docker compose exec -T postgres pg_dump -U localess -Fc localess > localess-$(date +%F).dump
docker compose exec -T localess tar czf - -C /data storage > storage-$(date +%F).tgz
```

**Single container with the embedded database:** the image has no `pg_dump`, and the embedded
cluster only listens on `127.0.0.1` inside the container. Either borrow `pg_dump` from a Postgres
image that joins the container's network namespace while it runs:

```bash
docker run --rm --network container:localess postgres:18 \
  pg_dump -Fc postgres://localess:localess@127.0.0.1:5433/localess > localess-$(date +%F).dump
```

…and copy the files with `docker exec localess tar czf - -C /data storage > storage-$(date +%F).tgz`. Or stop the container and copy the whole `/data`
volume, which then contains both the database and the files:

```bash
docker stop localess
docker run --rm -v localess-data:/data -v "$PWD":/backup busybox \
  tar czf /backup/localess-data-$(date +%F).tgz -C /data .
docker start localess
```

Never copy `pgdata` while the server is running — a file copy of a live Postgres cluster is not a
consistent backup.

Generated image renditions (`spaces/*/assets/*/renditions/`) are a cache and are rebuilt on demand;
excluding them makes backups smaller. Task archives under `tasks/` are temporary export/import files.

### Restoring

1. Stop Localess.
2. Restore the database (`pg_restore --clean --if-exists -d <db> localess.dump`, or put the
   `pgdata` copy back) and the storage directory from the **same** backup.
3. Start the image version that the backup was taken with, or a newer one (a newer one migrates
   forward on boot).

---

## Rollback

Because migrations only go forward, a newer schema may not work with older code. To roll back an
upgrade:

1. Stop Localess.
2. Restore the database backup taken before the upgrade (files too, if anything was uploaded since).
3. Start the previous image / checkout.

If the upgrade contained no migrations (nothing new in `apps/server/drizzle/`), starting the previous
version is enough.

Changes made between the upgrade and the rollback are lost with the restore — keep the window short,
or export the affected spaces first (Tasks → Export) and re-import after.

# Running in Production

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Configuration](configuration.md) · [Updates & Backups](updates.md) · [CDN Caching](../cdn-caching.md)

The server is ready to sit behind ordinary web infrastructure. What a public install should add:

## TLS and a reverse proxy

The server speaks plain HTTP. Put a TLS-terminating reverse proxy (nginx, Caddy, Traefik, a cloud
load balancer) in front and:

- Set `LOCALESS_PUBLIC_URL` to the public `https://` origin. OAuth redirect URIs and password reset
  links are built from it.
- Forward `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host`. The server trusts these
  headers (`trustProxy` is on), so session cookies get the `Secure` flag and the login rate limit
  sees real client IPs. Because the headers are trusted, do **not** expose the server port directly
  to the internet — only the proxy should reach it.
- Do not buffer `/api/app/events`: it is a Server-Sent Events stream that keeps the admin UI live.
  (nginx: `proxy_buffering off;` and a long `proxy_read_timeout` for that location.)
- Allow request bodies up to `LOCALESS_UPLOAD_MAX_MB` (default 1024 MB) on the upload routes, or
  lower that variable to match your proxy.

## A CDN in front of `/api/v1`

The Firebase-era install got Google's CDN for free; a self-hosted one has none. Every request to
the public API, including image transformations, reaches the server unless something caches it.

The API already sends CDN-ready `Cache-Control` headers and uses versioned (`cv`) URLs, so any CDN or
caching proxy (Cloudflare, Fastly, CloudFront, nginx `proxy_cache`, Varnish) can cache `/api/v1/**`
by full URL including the query string. Do **not** cache `/api/auth/**` or `/api/app/**` — they are
per-user. How the headers and redirects work: [CDN Caching](../cdn-caching.md).

Generated image renditions are also cached on disk next to the original, so a cache miss for a
known transformation is cheap.

## Backups

Two things hold all state: **Postgres** and the **storage directory** (`/data/storage` in Docker).
Back up both, together. See [Updates & Backups](updates.md#backups).

## Several instances

One instance is the default and is enough for most installs. The design allows more:

- **Database:** all instances must share one Postgres (`DATABASE_URL`) — never the embedded one.
  Migrations are advisory-locked, change events and token-cache invalidation travel through Postgres
  `LISTEN`/`NOTIFY`, and tasks are claimed with `FOR UPDATE SKIP LOCKED`, so no extra
  infrastructure (Redis, a queue) is needed.
- **Storage:** only the filesystem driver exists today, so every instance must mount the same
  storage directory (NFS or another shared filesystem). An S3-compatible driver is an open decision,
  not available yet.
- **Tasks:** set `LOCALESS_TASK_WORKER=false` on replicas that should only serve requests. Keep at
  least one instance with the worker on. Exports load a whole space into memory, so give worker
  instances the memory headroom.
- **Sessions** are stored in Postgres, so no sticky sessions are needed — except that each SSE
  connection naturally stays on the instance that opened it.

## Email and sign-in

Configure SMTP (`LOCALESS_SMTP_URL`) if users should reset their own passwords, and remove
`LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD` after the first boot. See
[Configuration](configuration.md#sign-in).

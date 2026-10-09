# Localess — one container: the NestJS server serving the Angular app and the API on port 3000.
# Without DATABASE_URL it starts an embedded Postgres inside the /data volume; with it, it uses that
# database (see docker-compose.yml). Uploaded files live in /data/storage either way.

# --- Build: Angular app + server -------------------------------------------------------------------
FROM node:24-slim AS build
# pnpm comes from Corepack, pinned by `packageManager` in package.json.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Dependencies first, from the lockfile alone, so this layer survives source changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
# Builds the app and the server, then `pnpm deploy` writes a self-contained copy of the server to
# /deploy/server: its build, migrations, @localess/shared and production dependencies only.
RUN pnpm install --offline --frozen-lockfile \
  && pnpm version:generate && pnpm build:prod && pnpm server:build \
  && pnpm --filter @localess/server deploy --prod /deploy/server

# --- Runtime ---------------------------------------------------------------------------------------
FROM node:24-slim
# ffmpeg: video thumbnails. perl: exiftool (asset metadata). Debian, not Alpine: sharp, exiftool and
# the embedded Postgres binaries are built against glibc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg perl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /deploy/server server
# The server looks for the Angular build at ../web/dist/browser relative to itself.
COPY --from=build /app/apps/web/dist/browser web/dist/browser

# Postgres refuses to run as root, so the whole server runs as the image's `node` user.
RUN mkdir -p /data && chown node:node /data
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    LOCALESS_DATA_DIR=/data
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "server/dist/main.js"]

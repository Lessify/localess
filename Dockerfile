# Localess — one container: the NestJS server serving the Angular app and the API on port 3000.
# Without DATABASE_URL it starts an embedded Postgres inside the /data volume; with it, it uses that
# database (see docker-compose.yml). Uploaded files live in /data/storage either way.

# --- Build: Angular app + server -------------------------------------------------------------------
FROM node:24-slim AS build
WORKDIR /app

# Every workspace manifest has to be present for `npm ci` to accept the lockfile.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/ui/package.json packages/ui/
COPY packages/visual-editor-sync/package.json packages/visual-editor-sync/
RUN npm ci

COPY . .
RUN npm run version:generate && npm run build:prod && npm run server:build

# --- Runtime ---------------------------------------------------------------------------------------
FROM node:24-slim
# ffmpeg: video thumbnails. perl: exiftool (asset metadata). Debian, not Alpine: sharp, exiftool and
# the embedded Postgres binaries are built against glibc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg perl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/ui/package.json packages/ui/
COPY packages/visual-editor-sync/package.json packages/visual-editor-sync/
# Production dependencies of the server workspace only (hoisted into /app/node_modules).
RUN npm ci --omit=dev --workspace @localess/server && npm cache clean --force

COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/server/drizzle apps/server/drizzle
COPY --from=build /app/apps/web/dist/browser apps/web/dist/browser

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

CMD ["node", "apps/server/dist/main.js"]

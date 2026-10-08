# Localess — one container: the NestJS server serving the Angular app and the API on port 3000.
# Without DATABASE_URL it starts an embedded Postgres inside the /data volume; with it, it uses that
# database (see docker-compose.yml). Uploaded files live in /data/storage either way.

# --- Build: Angular app + server -------------------------------------------------------------------
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci

COPY . .
RUN npm run version:generate && npm run build:prod && npm --prefix server run build

# --- Runtime ---------------------------------------------------------------------------------------
FROM node:24-slim
# ffmpeg: video thumbnails. perl: exiftool (asset metadata). Debian, not Alpine: sharp, exiftool and
# the embedded Postgres binaries are built against glibc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg perl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/drizzle server/drizzle
COPY --from=build /app/dist/localess/browser dist/localess/browser

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

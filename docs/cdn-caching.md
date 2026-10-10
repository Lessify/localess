# CDN & Caching

> Related: [Publish Flow](publish-flow.md) · [Auth Tokens](auth-tokens.md) · [V1 Public API](v1-api.md)

## Overview

The public API (`/api/v1/**`) is served by the NestJS server (each feature's `*.public.controller.ts` under `apps/server/src/modules/`, shared plumbing in `apps/server/src/infra/http/v1/`). All CDN endpoints use a **cache-version redirect pattern** so that browsers and shared caches can keep responses long-term while still supporting instant invalidation after publish.

**There is no CDN in front of Localess by default.** The Firebase era got Firebase Hosting's edge CDN for free; a self-hosted server answers every request itself. For production, put a CDN or a caching reverse proxy (Cloudflare, Fastly, CloudFront, nginx/Varnish `proxy_cache`, …) in front of at least `/api/v1/**`. The responses are already CDN-ready: every cacheable response carries `public, max-age, s-maxage`, URLs are versioned by `cv`, and asset responses carry ETags. The proxy should key on the full URL including the query string, and honour `Vary: Accept-Encoding`. Without one, browsers still cache per client, and image transforms are still cached on disk (see [Rendition cache](#rendition-cache)), but every redirect and JSON response is served by the Node process.

---

## The `cv` (Cache Version) Pattern

Every CDN endpoint follows this flow:

```
Client request (no cv or stale cv)
  → Server reads the space's version counter
  → 302 redirect to same URL + ?cv=<generation>    ← cached 60s by default (per-token override)
  → Client follows redirect
  → Server returns actual JSON                     ← cached 7 days (browser and shared CDN)
```

The `cv` value is a **version counter on the space row** (`spaces` table):
- Content:     `spaces.content_version`
- Translation: `spaces.translation_version`

The counter is bumped inside the same transaction as the write that changes what the API would serve (`bumpVersion()` in `apps/server/src/infra/http/space-access.ts`):

- `content_version` — every content create/update/move/delete/publish/unpublish, every schema write (drafts are rendered through schemas), asset updates and deletes, content/schema/asset imports, and `POST /api/v1/.../schemas` (schema push).
- `translation_version` — every translation write (drafts are built from the live rows), translation publish, translation imports, and `POST /api/v1/.../translations/:locale`.

So content and translation drafts never go stale, and all existing `cv` values become stale at once — the next request from any client triggers a redirect to the new `cv`. See [Publish Flow](publish-flow.md). (The Firebase-era `cv` was the GCS generation number of a `cache.json` marker file; values changed once at migration, which only costs each client one extra redirect.)
---

## Cache-Control TTLs

| Scenario | `max-age` | `s-maxage` | Who respects it |
|----------|-----------|------------|-----------------|
| Redirect (cv missing or stale) | 60s (default) | 60s (default) | CDN edge + browser |
| Content/Translation/Links response | 7 days | 7 days | browser / CDN |
| Asset response (incl. `/original`, `/download`) | 365 days | 365 days | browser / CDN |
| Asset `304 Not Modified` | 365 days | 365 days | browser / CDN |
| Asset canonical-size redirect (`w`/`h` above source) | 365 days | 365 days | browser / CDN |
| 400 — invalid asset transform param | 1 hour | 1 hour | browser / CDN |
| 404 — space not found | 7 days | 7 days | browser / CDN |
| 404 — content not published / not found in the locale or the fallback locale (content routes only) | 10 min | 10 min | browser / CDN |
| 404 — translations never published, slug not found | *(no `Cache-Control` header sent)* | | |
| 404 — asset: no `assets` row (asset genuinely does not exist) | 7 days | 7 days | browser / CDN |
| 404 — asset: row exists but stored file missing | `no-cache` | `no-cache` | browser / CDN |

> Redirect TTL is a flat default (`CACHE_REDIRECT_MAX_AGE_DEFAULT`), not split by published/draft. It can be overridden per-token via the `cacheTtl` field on `TokenV2` — see [Auth Tokens](auth-tokens.md) — where `cacheTtl: 0` disables caching entirely (`Cache-Control: no-cache`).
>
> "404 responses" is not a single behavior — it depends on which lookup fails (see rows above); some 404s carry no `Cache-Control` header at all.

Constants are defined in `apps/server/src/infra/http/v1/cache-control.ts` (`publicCache(seconds)` renders `public, max-age=…, s-maxage=…`):
```typescript
CACHE_MAX_AGE                   = DAY * 7       // 604800s
CACHE_SHARE_MAX_AGE             = DAY * 7       // 604800s
CACHE_ASSET_NOT_FOUND_MAX_AGE   = DAY * 7       // 604800s — 404 for an asset with no row
CACHE_ASSET_MAX_AGE             = DAY * 365     // 31536000s
CACHE_REDIRECT_MAX_AGE_DEFAULT  = MINUTE        // 60s — default redirect TTL, overridable per-token via `cacheTtl`
CACHE_BAD_REQUEST_MAX_AGE       = HOUR          // 3600s — cached 400 for rejected asset params
```

---

### No ETag on JSON responses (by design)

Content, translation and links JSON responses carry no `ETag` and never answer `304`, unlike the Firebase-era Express server, which added a weak ETag to every JSON body. Freshness comes from the `cv` pattern instead: every publish moves the version, a stale `cv` redirects to the new URL, and a versioned URL is immutable for its 7-day TTL, so revalidation would only save re-sending one body after expiry. Don't add one without a client that needs it. Assets do carry ETags (see below).

## Endpoints

| Endpoint | Auth | cv source |
|----------|------|-----------|
| `GET /api/v1/spaces/:spaceId/translations/:locale` | Token (TRANSLATION_PUBLIC or DRAFT) | `translation_version` |
| `GET /api/v1/spaces/:spaceId/links` | Token (CONTENT_PUBLIC, CONTENT_DRAFT or DEV_TOOLS) | `content_version` |
| `GET /api/v1/spaces/:spaceId/contents/slugs/*slug` | Token (CONTENT_PUBLIC or DRAFT) | `content_version` |
| `GET /api/v1/spaces/:spaceId/contents/:contentId` | Token (CONTENT_PUBLIC or DRAFT) | `content_version` |
| `GET /api/v1/spaces/:spaceId/assets/:assetId` | None | N/A (no cv) |
| `GET /api/v1/spaces/:spaceId/assets/:assetId/original` | None | N/A (no cv) |
| `GET /api/v1/spaces/:spaceId/assets/:assetId/download` | None | N/A (no cv) |

### Asset transform bounds

**One URL, one output.** Every transform parameter is either honoured exactly as given or rejected
with `400` — nothing is silently adjusted. That rule exists for the cache, not for tidiness: any
value the server quietly rewrites means two URLs resolving to identical bytes, and a CDN keys on
the URL it was handed, so each alias is a separate edge entry and a separate run of sharp.

Concretely:

- **`?w=`/`?h=` above the source redirect** to the size the source can produce. `?w=5000` on a
  400 px asset returns `302 → ?w=400`. No upscaling, and every oversized spelling collapses onto one
  canonical URL rather than returning identical bytes under many — the same trick `cv` uses. With
  both dimensions the box shrinks proportionally, so `fit` semantics survive. An asset with no
  recorded dimensions is served as requested, since the source size is unknown.
- **`MAX_OUTPUT_DIMENSION` (8192 px) rejects rather than clamps.** `?w=9000` is a `400`, checked
  before the redirect. The ceiling bounds the decoded bitmap sharp must hold — an 8192 px edge is
  ~200 MB of raw pixels — so raising it means revisiting the server's memory
  allowance too.
- **Only a canonical decimal integer is accepted** for `w`/`h`/`q`. `w=400.9`, `w=0400` and `w=4e2`
  are all rejected, because each would render identically to `w=400` under a different cache key.

The stored original stays reachable via the `/original` route. See
[Assets — Parameter Validation](features/spaces/assets.md) for the full matrix.

**No format conversion happens implicitly, but quality is normalised.** A request without `?f=`
keeps the stored format and still re-encodes a still raster at that format's default quality, so a
bare URL is a *rendition* rather than the stored file. Animations, GIF, SVG and video are served as
stored. Passing `?f=webp` or `?f=avif` cuts transfer size further, and is opt-in. See
[Assets — Output Format](features/spaces/assets.md) for the full matrix.

Responses carry an `ETag` derived from the asset's stored `md5` (`assets.md5`, computed at upload or import; imported assets keep the Firebase-era hash, so their ETags are unchanged) plus a suffix describing the
**effective encode** — target format, quality, dimensions and fit. A matching `If-None-Match`
returns `304` **before** any storage read or re-encode. The suffix is built from the resolved encode
rather than the raw query so that two spellings producing identical bytes share an entry, while a
rendition can never collide with the `orig` tag the passthrough routes use.

---

## Rendition cache

Without an edge CDN every transform would run sharp on each request, so the server keeps its own
cache of generated renditions in storage, next to the original:

```
$LOCALESS_STORAGE_DIR/spaces/{spaceId}/assets/{assetId}/original
$LOCALESS_STORAGE_DIR/spaces/{spaceId}/assets/{assetId}/renditions/{etagSuffix|orig}[-thumbnail]
```

The key is the ETag suffix, i.e. the effective encode, so two spellings producing identical bytes
share one file. Renditions are deleted with the asset. Cache writes are best-effort (a failed write
is logged, the response still goes out). `AssetDeliveryService` in
`apps/server/src/modules/assets/asset-delivery.service.ts` owns this.

Passthrough routes (`/original`, `/download`) and untransformed files stream from storage with
`Accept-Ranges: bytes` and honour a single `Range` request (`206`, or `416` when unsatisfiable), which
is what video players and resumed downloads need.

---

## Response Compression

`apps/server/src/app.factory.ts` registers `@fastify/compress` (gzip/deflate) for the whole server, so
every JSON response is compressed when the client sends `Accept-Encoding: gzip`. Measured against the
demo dataset, a translation locale file goes from ~490 KB to ~93 KB and the OpenAPI document from
~40 KB to ~5 KB — around 80% off the wire for the CDN endpoints overall.

The plugin decides from the response `Content-Type` (via `compressible`). That is what keeps the
asset route out of it without naming it: `image/*`, `video/*`, `application/zip` and
`application/pdf` are marked incompressible, so re-encoding an already-compressed JPEG never happens,
and a new asset MIME type cannot accidentally opt in. `image/svg+xml` is the deliberate exception —
it is text, so it does get compressed.

Two consequences worth knowing:

- Compressed responses carry `Vary: Accept-Encoding`, so a CDN keys a separate edge entry per
  encoding. In practice that is two (gzip and identity), since every browser and every mainstream
  HTTP client advertises gzip.
- The 1 KB threshold means small bodies — most notably the error 404s — are sent
  uncompressed, where gzip framing would only add bytes.

---

## Thundering Herd Problem

When content is published all consumers have a stale `cv`. Without a cached redirect, every consumer simultaneously hits the server (and Postgres). The redirect cache (60s default, per-token tunable) limits the stampede to one wave per CDN edge node or caching proxy — which is why a cache in front matters for high-traffic installs.

> See [Publish Flow](publish-flow.md) for when invalidation happens.

---

## Draft vs Published

| | Published | Draft |
|-|-----------|-------|
| `version` query param | absent | `version=draft` |
| Source | `content_published` / `translation_published` rows (snapshot taken on publish) | built on every request from the live `contents` / `translations` rows |
| Redirect TTL | 60s default (overridable via token `cacheTtl`) | 60s default (overridable via token `cacheTtl`) |
| Required permission | `*_PUBLIC` or `*_DRAFT` | `*_DRAFT` or `DEV_TOOLS` |

---

## Implementation Files

- `apps/server/src/modules/{contents,translations,assets}/*.public.controller.ts` — the CDN route handlers
- `apps/server/src/infra/http/v1/v1-request.ts` — `cv` redirects (`needsRedirect`, `redirectToVersion`), `validIdParams`, `isDraft`
- `apps/server/src/infra/http/v1/cache-control.ts` — cache TTL constants
- `apps/server/src/auth/api-tokens/token-auth.service.ts` — token auth per request
- `apps/server/src/modules/assets/asset-delivery.service.ts` — asset streaming, Range, rendition cache
- `apps/server/src/infra/http/space-access.ts` — `bumpVersion()`

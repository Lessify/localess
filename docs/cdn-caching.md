# CDN & Caching

> Related: [Publish Flow](publish-flow.md) · [Billing & Cost](billing.md) · [Auth Tokens](auth-tokens.md)

## Overview

The public API (`/api/v1/**`) is served via Firebase Hosting rewrites to the `publicv1` Cloud Function. All CDN endpoints use a **cache-version redirect pattern** to allow Firebase Hosting's edge CDN to cache responses long-term while still supporting instant invalidation after publish.

---

## The `cv` (Cache Version) Pattern

Every CDN endpoint follows this flow:

```
Client request (no cv or stale cv)
  → Function reads Storage cache.json metadata
  → 302 redirect to same URL + ?cv=<generation>    ← cached 60s by default (per-token override)
  → Client follows redirect
  → Function returns actual JSON                    ← cached 1 day (7 days shared CDN)
```

The `cv` value is the **Firebase Storage generation number** of the cache marker file:
- Content:     `spaces/{spaceId}/contents/cache.json`
- Translation: `spaces/{spaceId}/translations/cache.json`

When content is published, a new `cache.json` is written, incrementing the generation. All existing `cv` values become stale — the next request from any client triggers a redirect to the new `cv`.

---

## Cache-Control TTLs

| Scenario | `max-age` | `s-maxage` | Who respects it |
|----------|-----------|------------|-----------------|
| Redirect (cv missing or stale) | 60s (default) | 60s (default) | CDN edge + browser |
| Content/Translation response | 1 day | 7 days | browser / CDN |
| Asset response | 365 days | 365 days | browser / CDN |
| 404 — space not found | 1 day | 7 days | browser / CDN |
| 404 — cache marker missing / content not found on disk | 10 min | 10 min | browser / CDN |
| 404 — translation cache-miss / slug not found | *(no `Cache-Control` header sent)* | | |
| 404 — asset not found | `no-cache` | `no-cache` | browser / CDN |

> Redirect TTL is a flat default (`CACHE_REDIRECT_MAX_AGE_DEFAULT`), not split by published/draft. It can be overridden per-token via the `cacheTtl` field on `TokenV2` — see [Auth Tokens](auth-tokens.md) — where `cacheTtl: 0` disables caching entirely (`Cache-Control: no-cache`).
>
> "404 responses" is not a single behavior — it depends on which lookup fails (see rows above); some 404s carry no `Cache-Control` header at all.

Constants are defined in `functions/src/config.ts`:
```typescript
CACHE_MAX_AGE                   = DAY           // 86400s
CACHE_SHARE_MAX_AGE             = DAY * 7       // 604800s
CACHE_REDIRECT_MAX_AGE_DEFAULT  = MINUTE        // 60s — default redirect TTL, overridable per-token via `cacheTtl`
CACHE_ASSET_MAX_AGE             = DAY * 365     // 31536000s
```

---

## Endpoints

| Endpoint | Auth | cv source |
|----------|------|-----------|
| `GET /api/v1/spaces/:spaceId/translations/:locale` | Token (TRANSLATION_PUBLIC or DRAFT) | `translations/cache.json` |
| `GET /api/v1/spaces/:spaceId/links` | Token (CONTENT_PUBLIC or DRAFT) | `contents/cache.json` |
| `GET /api/v1/spaces/:spaceId/contents/slugs/*slug` | Token (CONTENT_PUBLIC or DRAFT) | `contents/cache.json` |
| `GET /api/v1/spaces/:spaceId/contents/:contentId` | Token (CONTENT_PUBLIC or DRAFT) | `contents/cache.json` |
| `GET /api/v1/spaces/:spaceId/assets/:assetId` | None | N/A (no cv) |

### Asset transform bounds

**One URL, one output.** Every transform parameter is either honoured exactly as given or rejected
with `400` — nothing is silently adjusted. That rule exists for the cache, not for tidiness: any
value the function quietly rewrites means two URLs resolving to identical bytes, and the CDN keys on
the URL it was handed, so each alias is a separate edge entry and a separate run of sharp.

Concretely:

- **`?w=`/`?h=` above the source redirect** to the size the source can produce. `?w=5000` on a
  400 px asset returns `302 → ?w=400`. No upscaling, and every oversized spelling collapses onto one
  canonical URL rather than returning identical bytes under many — the same trick `cv` uses. With
  both dimensions the box shrinks proportionally, so `fit` semantics survive. An asset with no
  recorded dimensions is served as requested, since the source size is unknown.
- **`MAX_OUTPUT_DIMENSION` (8192 px) rejects rather than clamps.** `?w=9000` is a `400`, checked
  before the redirect. The ceiling bounds the decoded bitmap sharp must hold — an 8192 px edge is
  ~200 MB of raw pixels — so raising it means revisiting `memory`/`concurrency` in
  `functions/src/v1.ts` too.
- **Only a canonical decimal integer is accepted** for `w`/`h`/`q`. `w=400.9`, `w=0400` and `w=4e2`
  are all rejected, because each would render identically to `w=400` under a different cache key.

The untransformed original stays reachable by omitting `w`/`h`. See
[Assets — Parameter Validation](features/spaces/assets.md) for the full matrix.

`image/jpeg` sources are additionally re-encoded to **WebP** by default, which pulls even
no-parameter requests onto the transform path. `?f=original` opts out and returns the stored bytes
byte-for-byte with an `inline` disposition; `?f=jpeg` re-encodes as JPEG at the default quality for
clients that cannot render WebP. See
[Assets — Default Output Format](features/spaces/assets.md) for the full matrix.

Transformed responses carry an `ETag` derived from the object's `md5Hash` plus the transform suffix;
a matching `If-None-Match` returns `304` **before** any download or re-encode.

---

## Response Compression

`functions/src/v1.ts` mounts `compression()` across the whole API, so every JSON response is gzipped
when the client sends `Accept-Encoding: gzip`. Measured against the demo dataset, a translation
locale file goes from ~490 KB to ~93 KB and the OpenAPI document from ~40 KB to ~5 KB — around 80%
off the wire for the CDN endpoints overall.

The filter is the middleware's default, which decides purely from the response `Content-Type` via
`compressible`. That is what keeps the asset route out of it without naming it: `image/*`, `video/*`,
`application/zip` and `application/pdf` are already marked incompressible, so re-encoding an
already-compressed JPEG never happens, and a new asset MIME type cannot accidentally opt in.
`image/svg+xml` is the deliberate exception — it is text, so it does get compressed.

Two consequences worth knowing:

- Compressed responses carry `Vary: Accept-Encoding`, so the CDN keys a separate edge entry per
  encoding. In practice that is two (gzip and identity), since every browser and every mainstream
  HTTP client advertises gzip.
- The 1 KB default threshold means small bodies — most notably the `HttpsError` 404s — are sent
  uncompressed, where gzip framing would only add bytes.

---

## Thundering Herd Problem

When content is published all consumers have a stale `cv`. Without a cached redirect, every consumer simultaneously invokes the Function → Storage → Firestore chain. The redirect cache (60s default, per-token tunable) limits the stampede to one wave per CDN edge node.

> See [Billing & Cost](billing.md) for impact analysis and [Publish Flow](publish-flow.md) for when invalidation happens.

---

## Draft vs Published

| | Published | Draft |
|-|-----------|-------|
| `version` query param | absent | `version=draft` |
| Storage path | `{id}/{locale}.json` | `{id}/draft/{locale}.json` |
| Redirect TTL | 60s default (overridable via token `cacheTtl`) | 60s default (overridable via token `cacheTtl`) |
| Required permission | `*_PUBLIC` or `*_DRAFT` | `*_DRAFT` or `DEV_TOOLS` |

---

## Implementation Files

- `functions/src/v1/cdn.ts` — all CDN route handlers
- `functions/src/config.ts` — cache TTL constants
- `functions/src/v1/middleware/query-auth.middleware.ts` — token auth per request
- `firebase.json` — Hosting rewrite rules

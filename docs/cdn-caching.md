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

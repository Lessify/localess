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
  → 302 redirect to same URL + ?cv=<generation>    ← cached 5 min (1 min for draft)
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
| Redirect (published) | 5 min | 5 min | CDN edge + browser |
| Redirect (draft, `version` present) | 1 min | 1 min | CDN edge + browser |
| Content/Translation response | 1 day | 7 days | browser / CDN |
| Asset response | 365 days | 365 days | browser / CDN |
| 404 responses | 10 min | 10 min | browser / CDN |

Constants are defined in `functions/src/config.ts`:
```typescript
CACHE_MAX_AGE          = DAY           // 86400s
CACHE_SHARE_MAX_AGE    = DAY * 7       // 604800s
CACHE_REDIRECT_MAX_AGE = 5 * MINUTE    // 300s  — published
CACHE_REDIRECT_DRAFT_MAX_AGE = MINUTE  // 60s   — draft
CACHE_ASSET_MAX_AGE    = DAY * 365     // 31536000s
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

When content is published all consumers have a stale `cv`. Without a cached redirect, every consumer simultaneously invokes the Function → Storage → Firestore chain. The 5-minute redirect cache limits the stampede to one wave per CDN edge node.

> See [Billing & Cost](billing.md) for impact analysis and [Publish Flow](publish-flow.md) for when invalidation happens.

---

## Draft vs Published

| | Published | Draft |
|-|-----------|-------|
| `version` query param | absent | `version=draft` or custom version ID |
| Storage path | `{id}/{locale}.json` | `{id}/draft/{locale}.json` |
| Redirect TTL | 5 min | 1 min |
| Required permission | `*_PUBLIC` or `*_DRAFT` | `*_DRAFT` or `DEV_TOOLS` |

---

## Implementation Files

- `functions/src/v1/cdn.ts` — all CDN route handlers
- `functions/src/config.ts` — cache TTL constants
- `functions/src/v1/middleware/query-auth.middleware.ts` — token auth per request
- `firebase.json` — Hosting rewrite rules

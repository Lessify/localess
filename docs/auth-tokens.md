# Auth Tokens

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md)

## Overview

API tokens grant programmatic, scoped access to the public CDN API. On the CDN read endpoints (`CDN`, `DEV_TOOLS` routers) they are passed as a `?token=<tokenId>` query parameter; there is no cookie-based auth. The `MANAGE` router (bulk translation writes) is the one exception — it authenticates via an `X-API-KEY` header instead of the query param (see [V1 Functions API](v1-functions-api.md#middleware) for that flow). This doc covers the query-param auth path used by the CDN/DEV_TOOLS routers.

Tokens are stored in Firestore:
```
spaces/{spaceId}/tokens/{tokenId}
```

---

## Token Versions

### TokenV1 (legacy)
No `version` field. Implicitly grants all read permissions:
- `TRANSLATION_PUBLIC`, `TRANSLATION_DRAFT`, `CONTENT_PUBLIC`, `CONTENT_DRAFT`
- Does **not** grant `DEV_TOOLS`

### TokenV2 (current)
Has `version: 2` and an explicit `permissions: TokenPermission[]` array. Only grants what is listed.

Also supports an optional `cacheTtl?: number` field, which overrides the default CDN redirect cache TTL (`CACHE_REDIRECT_MAX_AGE_DEFAULT`, 60s) for requests made with that token. `cacheTtl: 0` disables redirect caching entirely (`Cache-Control: no-cache`). See [CDN & Caching](cdn-caching.md).

---

## Permissions

| Permission | Grants access to |
|-----------|-----------------|
| `TRANSLATION_PUBLIC` | Published translations |
| `TRANSLATION_DRAFT` | Draft translations (requires `version` param) |
| `CONTENT_PUBLIC` | Published content |
| `CONTENT_DRAFT` | Draft content (requires `version` param) |
| `DEV_TOOLS` | Dev-tools endpoints (all content/translation access) |

---

## Permission Logic per Endpoint

```
Published request (no `version` param):
  → requires CONTENT_PUBLIC | CONTENT_DRAFT | DEV_TOOLS

Draft request (`version` present):
  → requires CONTENT_DRAFT | DEV_TOOLS
```

Same pattern applies to translation endpoints with `TRANSLATION_*` permissions.

---

## Token Cache (in-memory, per Function instance)

To reduce Firestore reads during traffic spikes, tokens are cached in memory inside the Function instance:

```typescript
// functions/src/v1/middleware/query-auth.middleware.ts
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
```

- Cache key: `{spaceId}:{tokenId}`
- On cache miss: Firestore read, result cached for TTL
- On token not found: entry removed from cache
- Revocations take effect within the TTL window (max 5 min)

> Since `maxInstances: 1` in `functions/src/index.ts`, the single instance handles all concurrent requests (`concurrency: 600`), making in-memory caching effective.

---

## Implementation Files

- `functions/src/models/token.model.ts` — Token types and type guards
- `functions/src/v1/middleware/query-auth.middleware.ts` — Auth middleware (token cache lives here)
- `functions/src/utils/api-auth-utils.ts` — `canPerform` / `canPerformAny` helpers
- `functions/src/services/token.service.ts` — Firestore token queries

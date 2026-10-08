# Auth Tokens

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md) · [V1 Public API](v1-api.md)

## Overview

API tokens grant programmatic, scoped access to the public CDN API. On the CDN read endpoints (`CDN`, `DEV_TOOLS` controllers) they are passed as a `?token=<tokenId>` query parameter; there is no cookie-based auth (the app's session cookie is not accepted on `/api/v1`). The `MANAGE` controller (bulk translation writes and schema push) is the one exception — it authenticates via an `X-API-KEY` header instead of the query param (see [V1 Public API](v1-api.md#middleware) for that flow). Both `MANAGE` endpoints — `POST /translations/:locale` and `POST /schemas` (schema push) — require the `DEV_TOOLS` permission, which only a TokenV2 with `DEV_TOOLS` in its `permissions` array can satisfy; a legacy TokenV1 is always rejected with `403`. This doc covers the query-param auth path used by the CDN/DEV_TOOLS controllers.

Tokens are rows of the Postgres `tokens` table (`server/src/database/schema.ts`):
```
tokens (id, space_id, name, version, permissions text[], cache_ttl, created_at, updated_at)
```
The 20-character alphanumeric `id` **is** the secret. Ids imported from Firebase are unchanged, so existing tokens keep working.

Tokens are managed in the app (Space Settings → Tokens) through `/api/app/spaces/:spaceId/tokens` (`server/src/app-api/tokens/tokens.controller.ts`, `SPACE_MANAGEMENT`): list, get, create, update, delete, and `POST …/:id/regenerate`, which atomically replaces the id (a V1 token comes back as V2 with its implicit permissions spelled out). New and updated tokens are always V2.

---

## Token Versions

### TokenV1 (legacy)
`version` is null. Implicitly grants all read permissions:
- `TRANSLATION_PUBLIC`, `TRANSLATION_DRAFT`, `CONTENT_PUBLIC`, `CONTENT_DRAFT`
- Does **not** grant `DEV_TOOLS`

### TokenV2 (current)
Has `version: 2` and an explicit `permissions: TokenPermission[]` array. Only grants what is listed.

Also supports an optional `cacheTtl` (`cache_ttl`, 0–31536000 seconds), which overrides the default CDN redirect cache TTL (`CACHE_REDIRECT_MAX_AGE_DEFAULT`, 60s) for requests made with that token. `cacheTtl: 0` disables redirect caching entirely (`Cache-Control: no-cache`). See [CDN & Caching](cdn-caching.md).

---

## Permissions

| Permission | Grants access to |
|-----------|-----------------|
| `TRANSLATION_PUBLIC` | Published translations |
| `TRANSLATION_DRAFT` | Draft translations (requires `version` param) |
| `CONTENT_PUBLIC` | Published content |
| `CONTENT_DRAFT` | Draft content (requires `version` param) |
| `DEV_TOOLS` | Dev-tools endpoints, `MANAGE` endpoints (translation bulk-write, schema push), and all content/translation access. TokenV2 only |

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

## Token Cache (in-memory, per server instance)

To avoid a database read per request during traffic spikes, query-param tokens are cached in memory inside each server instance (header tokens on `MANAGE` are always read fresh):

```typescript
// server/src/public-api/token-auth.service.ts
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
```

- Cache key: `{spaceId}:{tokenId}`
- On cache miss: `tokens` read, result cached for TTL
- On token not found: entry removed from cache
- **Invalidated through change events:** every token create/update/regenerate/delete emits a `tokens` change event inside its transaction. Events travel over Postgres `LISTEN/NOTIFY`, so every instance receives them and drops the matching cache entry — a revoked or edited token stops working at once, not after the TTL
- The TTL remains as a backstop (e.g. events missed while an instance's listener connection was reconnecting)

> The cache is per instance: with several server instances a token may be read once per instance.

> **Never log a raw query object.** The token arrives as the `?token=` query param, so `JSON.stringify(req.query)` would persist a usable credential into your logs for their full retention period. Use `redactQuery()` (`server/src/public-api/lib/log-redact.ts`) when a V1 code path needs to log a query.

---

## Implementation Files

- `server/src/domain/models/` — `TokenPermission` and token types
- `server/src/public-api/token-auth.service.ts` — `validateToken`, `canPerform` / `canPerformAny`, `authorize()`, the token cache and its invalidation
- `server/src/app-api/tokens/tokens.controller.ts` — token management for the app
- `server/src/events/events.service.ts` — change events (`LISTEN/NOTIFY`)

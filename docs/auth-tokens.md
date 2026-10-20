# Auth Tokens

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md) · [V1 API (CDN and Management)](v1-api.md) · [Design](roadmap/api-token-types.md)

## Overview

API tokens give programs access to one space. There are three types, and the type says where a token is used:

| Type | Prefix | API | Sent as | Can do | Exposure |
|---|---|---|---|---|---|
| `public` | `pub_` | CDN API (`/api/v1`) | `?token=` | Published content, links and translations | Safe in browser code: websites, apps, static builds |
| `preview` | `prv_` | CDN API (`/api/v1`) | `?token=` | Published and drafts (`?version=draft`) | Preview sites, the Visual Editor, staging; not a production site |
| `management` | `mgt_` | Management API (`/api/manage/v1`) | `Authorization: Bearer` | The space, schemas (pull, push, OpenAPI), translation values and push | Secret: servers and CI only |

On the CDN a `preview` token can do everything a `public` one can. The CDN refuses management tokens (before any lookup: a
management value doesn't belong in a URL), and the Management API accepts only management tokens. There is no cookie-based
auth on either API (the app's session cookie is not accepted).

The type never changes after creation (the prefix would lie); to use a token another way, create a new one. Regenerating
keeps the type.

Every space starts with one preview token, **Auto Generated Preview Token** (written with the space by the
`createPreviewToken` data rule, `apps/server/src/shared/data-rules/space-tokens.ts`; the first admin's starter space and the Firebase import do the same). It is
an ordinary token afterwards: it can be renamed, regenerated or deleted. Tokens are **not** imported from Firebase.

---

## Token values

`<prefix>_<32 random base62><6-character checksum>`, 42 characters, pattern `^(pub|prv|mgt)_[A-Za-z0-9]{38}$`
(`apps/server/src/shared/utils/api-token-format.ts`):

- The random part is about 190 bits (`crypto.randomInt` over base62).
- The checksum is `zlib.crc32` of `<prefix>_<random>`, in base62, left-padded to 6 characters. A mistyped or made-up value
  fails the pattern or the checksum and gets the usual 401 without a database query. Secret scanners (gitleaks, GitHub) can
  match `mgt_[A-Za-z0-9]{38}`.
- The prefix only routes those early rejections. What a token may do is always read from its row.

## Storage

```
tokens (id uuid, space_id, type, name, token, token_hash unique, hint, cache_ttl, created_at, updated_at)
```

- `type`: `public`, `preview` or `management` (check `tokens_type_check`).
- `token_hash`: `sha256(value)` (`hashToken()`); every lookup goes through it: `where space_id = $1 and token_hash = $2`.
- `token`: the value for `public` and `preview` tokens, so the app can show and copy it (and build its "open in API" links);
  `null` for `management` tokens (check `tokens_token_check`). A management value is returned once, in the create or
  regenerate response, and never again: a leaked backup or a read-only SQL user can't use it.
- `hint`: the prefix and the last 4 characters, e.g. `mgt_…aB3x`, which the list shows.
- `cache_ttl`: CDN tokens only (check `tokens_cache_ttl_check`); 0–31536000 seconds, overriding the default `cv` redirect
  cache (`CACHE_REDIRECT_MAX_AGE_DEFAULT`, 60s); `0` disables it (`Cache-Control: no-cache`). See [CDN & Caching](cdn-caching.md).
- `id` is a UUIDv7 used only by the App API and change events; it is never accepted as a token.

SHA-256 (not argon2) is enough: the values are random, not chosen by people, so the hash can't be guessed back, and a slow hash
would only slow every request.

Tokens are managed in the app (Space Settings → Tokens) through `/api/app/spaces/:spaceId/tokens`
(`SpaceTokenController` in `apps/server/src/modules/spaces/`, `SPACE_MANAGEMENT`): list (`?type=`, `?limit=`), get, create (`{ name, type, cacheTtl? }`),
update (`{ name, cacheTtl? }`: no type), delete, and `POST …/:id/regenerate` (same row, id, type and name, new value). `:id` is
the UUID; anything else answers 404. Change events (SSE) carry the UUID only.

---

## Checks

Two guards, attached by decorators (`apps/server/src/auth/token-auth.decorators.ts`); the global `AuthGuard` skips routes
that carry them (and their requests need no `X-Requested-With`: they send no cookie).

**`@CdnToken({ published, draft, reason })`** → `CdnTokenGuard` (`auth/guards/cdn-token.guard.ts`):

1. Ids (`spaceId`, `contentId`, `assetId`) → 400.
2. `?token=`: a `mgt_` value → 401 with `details.hint` ("Management tokens go in the Authorization header on /api/manage/v1.");
   bad pattern or checksum → 401.
3. Cached lookup by hash → 401 when unknown or not a CDN type.
4. The type the route needs: `draft` when `version` is present, else `published` → 403 with `details.requiredTypes`.

**`@ManagementToken()`** → `ManagementTokenGuard` (`auth/guards/management-token.guard.ts`):

1. Every response `Cache-Control: no-store`.
2. Ids → 400.
3. `Authorization: Bearer <value>` (scheme in any case, exactly one value), a `mgt_` value, found by hash in this space,
   uncached → otherwise the same 401 with `WWW-Authenticate: Bearer`.
4. Only then: a space whose import from Firebase runs or failed → 503 (`Retry-After: 60`). The status stays hidden from a
   caller without the token.

Guards throw `V1Error`; `V1ExceptionFilter` writes the v1 body `{ details?, message, status }`. The accepted token is on
`request.apiToken` (`@CurrentToken()`).

---

## Token cache (CDN only, in memory, per server instance)

```typescript
// apps/server/src/auth/services/token-auth.service.ts
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
```

- Cache key: `{spaceId}:{sha256(value)}` (the value itself is never kept); each entry remembers the row's UUID.
- On a miss: `tokens` read, cached for the TTL; an unknown token drops the entry.
- **Invalidated through change events:** every token create/update/regenerate/delete emits a `tokens` change event (with the
  UUID) inside its transaction. Events travel over Postgres `LISTEN/NOTIFY`, so every instance drops the entry at once.
- The TTL remains as a backstop (events missed while a listener reconnects).
- The Management API never uses the cache.

> **Never log a raw query object.** CDN tokens arrive as `?token=`; use `redactQuery()` (`apps/server/src/infra/http/v1/log-redact.ts`).

---

## Implementation Files

- `packages/shared/src/models/token.model.ts` — `TokenType` and the `Token` type (shared by server and web)
- `apps/server/src/shared/utils/api-token-format.ts` — `newApiToken`, `parseApiToken`, `tokenHint`, `tokenColumns`
- `apps/server/src/shared/data-rules/space-tokens.ts` — `createPreviewToken` (the auto-generated preview token)
- `apps/server/src/auth/token-auth.decorators.ts`, `auth/guards/` — `@CdnToken`, `@ManagementToken` and their guards
- `apps/server/src/auth/services/token-auth.service.ts` — lookups, the CDN cache and its invalidation; `auth/repositories/api-token.repository.ts`
- `apps/server/src/infra/http/v1/v1-error.ts` — `V1Error`, `V1ExceptionFilter`
- `apps/server/src/modules/spaces/` (`space-token.controller.ts`, `space-token.service.ts`, `space-token.repository.ts`) —
  token management for the app, a sub-entity of the space like its locales and environments
- `apps/web/src/app/features/spaces/settings/tokens/` — the tokens page, the type choice cards, the show-once dialog

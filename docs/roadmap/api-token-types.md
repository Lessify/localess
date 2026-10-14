# API token types, CDN API and Management API

> Status: implemented (plan: `docs/superpowers/plans/2026-10-14-api-token-types.md`). Related: [V1 API](../v1-api.md) · [Auth Tokens](../auth-tokens.md) · [CDN & Caching](../cdn-caching.md)

## Goal

Replace the five token permissions with three token types whose purpose shows in the token itself (Stripe-style prefixes), and
split the public API in two: the **CDN API** (cacheable, `?token=` in the URL) and the **Management API** (live, token in the
`Authorization` header). Token checks move from hand-written calls in every handler to guards, so a route without a check is
closed, not open.

## Decisions

| # | Decision |
|---|----------|
| 1 | Three types: `public`, `preview`, `management` (lower case in the database). On the CDN, `preview` includes `public`. |
| 2 | Prefixes `pub_`, `prv_`, `mgt_`, then 32 random base62 characters and a 6-character CRC32 checksum. |
| 3 | CDN API stays at `/api/v1/spaces/:spaceId/…` with `?token=`. Every dev-tools and management endpoint moves to `/api/manage/v1/spaces/:spaceId/…` and takes only `Authorization: Bearer <token>` (no `?token=`, no `X-API-KEY`). |
| 4 | The CDN refuses management tokens; the Management API accepts only management tokens. |
| 5 | Management tokens are stored hashed and shown once; public and preview tokens stay readable. |
| 6 | No token migration: Firebase import no longer imports tokens, and the old 20-character format is no longer accepted. |
| 7 | `GET …/translations/:locale/values` becomes `GET /api/manage/v1/spaces/:spaceId/translations/:locale`. |
| 8 | Every new space gets a `preview` token named "Auto Generated Preview Token", for all preview use cases. |
| 9 | The create-token dialog picks the type with choice cards (like the space template choice), each with a description of where to use it. |

## Token types

| Type | Prefix | CDN API | Management API | Exposure |
|---|---|---|---|---|
| `public` | `pub_` | Published content, links, translations | No | Safe in browser code |
| `preview` | `prv_` | Published and draft (`?version=draft`) | No | Preview sites and the Visual Editor; not on a production site |
| `management` | `mgt_` | No (rejected before any lookup) | Everything below | Secret: servers and CI only |

A type never changes after creation (the prefix would lie); to change it, create a new token. Regenerating keeps the type.
`cacheTtl` (the `cv` redirect TTL) applies to `public` and `preview` only; the Management API is never cached.

### Token format

`<prefix>_<32 random base62><6-character checksum>`, e.g. `prv_4fGk…Q1x9aB` (42 characters).

- Random part: `crypto.randomInt` over base62, about 190 bits.
- Checksum: `zlib.crc32` (Node 24) of `<prefix>_<random>`, written in base62 and left-padded to 6 characters.
- Pattern: `^(pub|prv|mgt)_[A-Za-z0-9]{38}$`. A value that fails the pattern or the checksum gets the usual 401 without a
  database query, and secret scanners (gitleaks, GitHub) can match `mgt_[A-Za-z0-9]{38}` with few false positives.
- The server reads the type from the database row, never from the prefix; the prefix only routes the early rejections.

## Database

`tokens` (table stays plural):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | unchanged |
| `space_id` | uuid FK | unchanged |
| `type` | text, check `in ('public','preview','management')` | replaces `permissions` |
| `name` | text | unchanged |
| `token` | text, nullable | the full value for `public`/`preview`; `null` for `management` |
| `token_hash` | text, unique, not null | `sha256(token)` hex (`hashToken()`); every lookup goes through it |
| `hint` | text, not null | prefix and last 4 characters, e.g. `mgt_…aB3x`, for the list |
| `cache_ttl` | integer, nullable | unchanged |
| `created_at`, `updated_at` | | unchanged |

Checks: `(type = 'management') = (token is null)`; `type <> 'management' or cache_ttl is null`. Index `tokens_space_idx` stays.
One lookup path for every type: `where token_hash = $1 and space_id = $2`. The migration is regenerated (`db:regenerate`); `.data`
has to be recreated.

`@localess/shared`: `TokenPermission` is removed; `enum TokenType { PUBLIC = 'public', PREVIEW = 'preview', MANAGEMENT = 'management' }`.
`Token` becomes `{ id, type, name, hint, token?, cacheTtl?, createdAt, updatedAt }`: `token` is present for `public`/`preview`
always, and for `management` only in the create and regenerate responses.

## Server

### Guards

The global `AuthGuard` reads an auth-kind marker instead of the URL:

| Marker | Routes | `AuthGuard` does |
|---|---|---|
| none (default) | `/api/app/**`, `/api/auth/me`, … | session + `@Require*` + CSRF header on unsafe methods |
| `@Public()` | health, login, OAuth, config, CDN assets | nothing |
| `@CdnToken(rule)` | CDN controllers | skips; `CdnTokenGuard` runs |
| `@ManagementToken()` | Management controllers (class level) | skips; `ManagementTokenGuard` runs |

`@CdnToken` and `@ManagementToken` are `applyDecorators(SetMetadata(AUTH_KIND, …), UseGuards(…))`. The CSRF exemption becomes
"routes not authenticated by a cookie", not `url.startsWith('/api/v1/')`.

**`CdnTokenGuard`** (in `auth/`):
1. `validIdParams` (400 stays ahead of 401, as today).
2. `?token=`: pattern and checksum; a `mgt_` value gets 401 with the hint "Management tokens go in the Authorization header on /api/manage/v1".
3. Cached lookup by hash (5-minute cache, dropped on `tokens` change events, as today).
4. Rule: `@CdnToken({ published: 'public', draft: 'preview', reason })` picks `draft` when `version` is present; `preview`
   satisfies `public`. 403 body keeps `details.requiredPermissions`-style fields, renamed to `requiredTypes`.
5. Sets `request.apiToken`; handlers read it with `@CurrentToken()` (for `cacheTtl`).

**`ManagementTokenGuard`**:
1. `validIdParams`.
2. `Authorization: Bearer mgt_…`; anything else (missing header, other scheme, other prefix, bad checksum, unknown) gets the
   same 401 with `WWW-Authenticate: Bearer`.
3. Uncached lookup by hash; `type` must be `management`.
4. Sets `request.apiToken`; responses carry `Cache-Control: no-store`.

Guards throw `V1Error(status, code, message, details?, cacheControl?)`; a `V1ExceptionFilter` on both kinds of controller writes
the existing `{ details?, message, status }` body with `sendV1Error()`, so the CDN responses stay byte-compatible.

`TokenAuthService.authorize*` and the handler-level `if (!token) return;` checks are removed.

### Routes

CDN API (`*.cdn.controller.ts`, renamed from `*.public.controller.ts`; URLs and behaviour unchanged):

| Method | Path | Rule |
|---|---|---|
| GET | `/api/v1/spaces/:spaceId/translations/:locale` | published `public`, draft `preview` |
| GET | `/api/v1/spaces/:spaceId/links` | published `public`, draft `preview` |
| GET | `/api/v1/spaces/:spaceId/contents/slugs/*` | published `public`, draft `preview` |
| GET | `/api/v1/spaces/:spaceId/contents/:contentId` | published `public`, draft `preview` |
| GET | `/api/v1/spaces/:spaceId/assets/:assetId` (+ `/original`, `/download`) | `@Public()`, unchanged |

Management API (`*.management.controller.ts`, `/api/manage/v1/spaces/:spaceId`, all `@ManagementToken()`):

| Method | Path | Was |
|---|---|---|
| GET | `` (space) | `GET /api/v1/spaces/:id?token=` |
| GET | `/open-api` | `GET /api/v1/…/open-api?token=` |
| GET | `/schemas` | `GET /api/v1/…/schemas?token=` |
| POST | `/schemas` | `POST /api/v1/…/schemas` + `X-API-KEY` |
| GET | `/translations/:locale` | `GET /api/v1/…/translations/:locale/values?token=` |
| POST | `/translations/:locale` | `POST /api/v1/…/translations/:locale` + `X-API-KEY` |

The old dev-tools URLs are removed (404). CORS stays on `/api/v1/**` only; `/api/manage/**` gets no CORS headers.

### Tokens module (App API)

- `GET /api/app/spaces/:spaceId/tokens?type=&limit=` (replaces `?permission=`).
- `POST` `{ name, type, cacheTtl? }` returns the token with its full value.
- `PUT` `{ name, cacheTtl? }`: the type can't be changed.
- `POST /:id/regenerate` returns the new full value (shown once for `management`).
- Business rules (type immutable, `cacheTtl` only for `public`/`preview`) in `TokensService`; the repository writes
  `token`, `token_hash` and `hint` together.

### Auto-generated preview token

Every space starts with one `preview` token, `name = 'Auto Generated Preview Token'`, default `cacheTtl`, so the Visual Editor,
preview sites and the app's "open in API" links (draft and published) work without setting anything up. It is an ordinary token afterwards:
it can be renamed, regenerated or deleted.

It is written by a data rule, `createPreviewToken(tx, spaceId)` in `apps/server/src/shared/data-rules/space-tokens.ts`, inside
the transaction that inserts the space. Both paths that create a space call it: `SpacesRepository.create` (App API, with or
without a template) and the Firebase import's space stage, so an imported space has one too. The token generator
(`newApiToken(type)`) moves next to it in `shared/` so the tokens module and the rule use the same one.

### Firebase import

The `tokens` stage is removed: `FirebaseImportStageName` in `@localess/shared`, the runner, `token-import.service.ts` and its
tests. The space stage writes the auto-generated preview token with the space, exactly as a newly created space gets it
(same data rule, same transaction). Other tokens are not created; admins add `public` and `management` tokens and update
their sites and CI.

## Web app

- Token dialog: the type is a choice-card radio group, the same markup as the template choice in
  `features/admin/spaces/space-create-dialog` (`hlmFieldSet` > `hlm-radio-group` > `label hlmFieldLabel` > `hlmField
  orientation="horizontal"` with `hlmFieldTitle` + icon, `hlmFieldDescription`, `hlm-radio`). Shown on create; on edit the
  chosen type is shown read-only. Card texts (a `TOKEN_TYPES` list in `shared/models/token.model.ts`):

  | Type | Icon | Description (`hlmFieldDescription`) |
  |---|---|---|
  | Public | `lucideGlobe` | Reads published content and translations. Safe in browser code: websites, mobile apps, static site builds. |
  | Preview | `lucideEye` | Reads drafts and published content. For preview sites, the Visual Editor and staging builds. Don't use it on your production site. |
  | Management | `lucideKeyRound` | The CLI and CI: push and pull schemas and translations, generate the OpenAPI spec. Secret: sent in the Authorization header, shown only once. |

  The Cache TTL field shows for Public and Preview only.
- After creating or regenerating a `management` token: a show-once dialog with the token and the copied CLI login command
  (`localess login --origin … --space … --token …`), and "You won't see this token again".
- List: a Type badge instead of the Permissions count and the Usage column; the Token column shows `hint`; Copy Token only for
  `public`/`preview`; Copy CLI Login is removed from the row (it lives in the show-once dialog).
- Contents, Edit document and Translations "open in API" links use `TokenService.firstValue(spaceId, types)`, asked on every
  click (never cached, so a regenerated token is picked up): published links take a `public` token, or the space's
  `preview` token when it has no public one (a preview token reads published content too, so the links work on a new
  space); draft links take a `preview` token. No token: "Please create a … Token"; a failed lookup: "Tokens could not be
  loaded".
- Removed: `PERMISSION_TEXT`, `getTokenUsageInfo`, `TokenUsageCategory`; replaced by a `TOKEN_TYPE_INFO` map.

## Outside this repository

`@localess/cli` must use `/api/manage/v1/…` with `Authorization: Bearer`. The full list of CLI and SDK changes (with an open decision on `translation pull`): [cli-token-types.md](cli-token-types.md). Older CLI versions stop working against a new
install; this goes in the CLI changelog.

## Docs

- `docs/v1-api.md`: split into CDN API and Management API sections (or a new `docs/management-api.md`).
- `docs/auth-tokens.md`: rewritten for types, prefixes, checksum, hashing.
- `docs/cdn-caching.md`: `/api/manage/**` is never cached.
- `docs/features/spaces/settings.md`: the tokens page.
- `docs/deployment/migrate-from-firebase.md` and `docs/roadmap/firebase-space-import.md`: tokens are not imported.
- `docs/roadmap/database-structure.md`: the `tokens` table.

## Tests (written first)

- Server, token format: generated values match the pattern; checksum rejects a one-character change.
- Server, CDN: `pub_` reads published, gets 403 on `?version=draft`; `prv_` reads both; `mgt_` in `?token=` gets 401 with the
  hint and no database query; existing `v1-cdn` bodies and `Cache-Control` unchanged; a 400 for a bad id comes before the 401.
- Server, Management: Bearer `mgt_` works on all six routes; missing header, `X-API-KEY`, `?token=`, `pub_`/`prv_` tokens all
  get 401 with `WWW-Authenticate: Bearer`; responses are `no-store`; the old dev-tools URLs answer 404.
- Server, closed by default: a handler on a management controller without its own decorator still needs a token.
- Server, schema: `type` check, `token` null exactly for `management`, `cache_ttl` null for `management`, `token_hash` unique.
- Server, tokens module: type immutable on `PUT`; management `token` absent from list and get, present from create and
  regenerate; `?type=` filter.
- Server, Firebase import: no `tokens` stage; an imported space has the auto-generated preview token.
- Server, spaces: a new space has exactly one token, type `preview`, named "Auto Generated Preview Token", that reads drafts on
  the CDN; when the space insert fails, no token is left behind.
- Web: dialog choice cards (three, with the descriptions above) and Cache TTL visibility; show-once dialog; list badges and hint; links pick the right type.

## Out of scope

A last-used time per token, token expiry, and finer-grained scopes.

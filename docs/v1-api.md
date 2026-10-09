# V1 Public API

> Related: [CDN & Caching](cdn-caching.md) · [Auth Tokens](auth-tokens.md) · [Publish Flow](publish-flow.md)

The public REST API is served under `/api/v1/**` by the NestJS server: each feature module owns its public controller (`apps/server/src/modules/<feature>/<feature>.public.controller.ts`), with shared request plumbing in `apps/server/src/infra/http/v1/`, on the same port as the app and the app API. It replaced the `publicv1` Firebase Function with the same URLs, query parameters, token rules, status codes, bodies and `Cache-Control` values; the former Express routers are now three Fastify controllers: `CdnController`, `ManageController` and `DevToolsController`. All routes are `@Public()` (no session) and authenticate with API tokens instead. JSON request bodies are limited to 5 MB (Fastify `bodyLimit` in `apps/server/src/app.factory.ts`), so a whole space's schemas fit in one push. CORS reflects any origin on `/api/v1/**` only; the cookie-authenticated app API gets no CORS headers. Responses are gzip/deflate-compressed above 1 KB (`@fastify/compress`).
---

## Routers

### CDN (`contents`, `translations` and `assets` public controllers)

Content delivery with cache-busting and asset transformation. All content/translation endpoints follow the [`cv` redirect pattern](cdn-caching.md).

| Method | Path                                           | Auth                                              | Query params                                                          |
|--------|------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId/translations/:locale` | `TRANSLATION_PUBLIC` or `TRANSLATION_DRAFT`       | `cv`, `version`, `token`                                              |
| `GET`  | `/api/v1/spaces/:spaceId/links`                | `CONTENT_PUBLIC`, `CONTENT_DRAFT`, or `DEV_TOOLS` | `cv`, `kind`, `parentSlug`, `excludeChildren`, `token`                |
| `GET`  | `/api/v1/spaces/:spaceId/contents/slugs/*slug` | `requireContentPermissions()`                     | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `resolveAsset`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/contents/:contentId`  | `requireContentPermissions()`                     | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `resolveAsset`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId`      | None (public)                                     | `w`, `h`, `q`, `f`, `fit`, `thumbnail`                                |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId/original` | None (public)                                 | *(none — a transform param is rejected with 400)*                     |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId/download` | None (public)                                 | *(none — a transform param is rejected with 400)*                     |

**Notable behaviors:**

- **Published vs draft** — Published documents and translations are read from the `content_published` / `translation_published` tables written on publish. `?version=draft` is built on every request from the live `contents` / `translations` rows (locale extraction against the current schemas), so a draft always exists, even for a document that was never saved after import.
- **Locale fallback** — If the requested locale doesn't exist in the space, falls back to `space.localeFallback`.
- **`resolveLink=true`** — Expands cross-content link IDs to full `ContentLink` objects.
- **`resolveReference=true`** — Inlines referenced content documents at the resolved locale.
- **`resolveAsset=true`** — Expands referenced asset IDs to full asset metadata via `ContentDeliveryService.resolveAssets()` (`apps/server/src/modules/contents/content-delivery.service.ts`).
- **Asset transforms** — Uses Sharp for images (`w`/`h`/`q`/`f`/`fit` params). Supported output formats (`f`): `webp`, `jpeg`, `png`, `avif`. SVG is passed through unsized; animated GIF/WebP are resized with all frames preserved. Video + `w` + `thumbnail` extracts a frame with FFmpeg then resizes with Sharp.
- **No implicit format conversion, but quality is normalised** — `f` is the only thing that changes an image format. A bare request keeps the stored format yet still re-encodes a still raster at that format default quality: a q95 upload measured 587KB and returned 219KB. GIF, SVG, video and animations are served as stored. Passing `f=webp` or `f=avif` is the recommended way to cut transfer size further.
- **JPEG uses the mozjpeg encoder** — trellis quantisation, overshoot deringing and optimised scans, which produce a measurably smaller file at the *same* quality value (~20% on a test source) for roughly 5x the encode time. Worth it here because encoding happens once per URL — the result is kept in the on-disk rendition cache and served under a 365-day TTL, while the saved bytes are paid on every hit.
- **`q` is not defaulted by the endpoint** — it is **rejected** outside `1–100` rather than clamped, and when omitted nothing is passed to the encoder, so each format applies its own calibrated default: JPEG and WebP 80, AVIF 50, PNG lossless. A quality number is not portable between codecs, which is why one flat value is not imposed on all of them. An explicit `q` always wins.
- **`fit` param** — `cover` (default) · `contain` · `inside` · `outside` · `fill`. **Ignored unless both `w` and `h` are present**, since Sharp preserves aspect ratio with a single dimension. `contain` pads: transparent for `png`/`webp`/`avif`, opaque white otherwise (a transparent pad would flatten to black on a JPEG).
- **Invalid `f` or `fit`** — returns `400 invalid-argument` naming the accepted values. An empty value (`?f=`) counts as absent, not invalid. The `400` is sent with `Cache-Control: public, max-age=3600` so a bad URL can be served from a CDN or caching proxy instead of reaching the server again; the TTL is deliberately short because the accepted value set can grow with an upgrade.
- **`thumbnail` param** — Collapses an animated WebP/GIF to its first frame, and extracts a video frame via FFmpeg (requires `w`). Has no effect on other image types. Since animations now resize with every frame intact, `thumbnail` is how you ask for a *still* rather than how you make resizing work.
- **EXIF orientation is applied** — Sharp strips the orientation tag on re-encode, so a rotated source is baked into the pixels. Without it a portrait phone photo returned landscape with its aspect ratio transposed.
- **Embedded colour profiles are carried through** — via `keepIccProfile()`. Sources without one gain nothing; tagging every response as sRGB would add ~506 bytes each.
- **`/original` and `/download`** — serve the stored bytes exactly as uploaded, inline and as an `attachment` respectively. Since a bare transform request re-encodes, these are the only way to retrieve the original file. Neither enters Sharp, and both reject `w`/`h`/`q`/`f`/`fit`/`thumbnail`/`download` with `400` rather than ignoring them.
- **Removed in v4** — the `?download` flag and `f=original`. Both return `400` with a message naming the replacement route. Responses already cached under the old spellings keep serving for the remainder of their 365-day TTL.

#### Asset resize combinations (`w` / `h`)

Sharp is called as `resize(width ?? null, height ?? null, { fit })`, defaulting to `cover` when `fit` is not given.

| `w` | `h` | Behavior                                                                                                                   |
|-----|-----|----------------------------------------------------------------------------------------------------------------------------|
| ✓   | —   | Scale to width, height auto — aspect ratio preserved, no crop                                                              |
| —   | ✓   | Scale to height, width auto — aspect ratio preserved, no crop                                                              |
| ✓   | ✓   | Controlled by `fit`, default **`cover` crop** — fills the exact box, excess edges cropped. See the `fit` table below |
| —   | —   | No resize — only format/quality re-encoding if `f`/`q` provided                                                            |

#### Asset `fit` modes

Only applied when **both** `w` and `h` are present. Examples are a 200×100 source into a 50×50 box.

| `fit` | Behavior | 200×100 → 50×50 |
|---|---|---|
| `cover` *(default)* | Fill the box, crop the overflow | 50×50, sides cropped |
| `contain` | Fit inside the box, pad to the exact box | 50×50, padded |
| `inside` | Shrink to fit inside the box, no pad, no crop | 50×25 |
| `outside` | Cover the box without cropping; may exceed it | 100×50 |
| `fill` | Stretch to the exact box, aspect ratio not preserved | 50×50, distorted |

`cover` remains the default deliberately: changing it would reshape every existing `?w=&h=` URL and
invalidate every cached URL and rendition. **`inside` is usually what a CMS thumbnail wants** — opt into it explicitly.

**Breaking change — invalid `f` now returns 400.** Previously an unrecognised `f` was silently
ignored and the untransformed image was returned; it now returns `400 invalid-argument`, matching
`fit`. A typo in a format no longer fails quietly.

**Special cases:**
- `image/svg+xml` — always passed through; `w`/`h`/`f` are ignored
- Animated WebP or GIF on a **bare** request — served as stored; re-encoding every frame is the most expensive thing the endpoint could do, and the pixel cap would turn a plain `<img src>` into a `400`
- Animated WebP or GIF **with** a transform — resized with all frames preserved; `f=webp` converts GIF to animated WebP. Rejected with `400` above `MAX_ANIMATED_PIXELS` (12 Mpx total)
- Animated WebP or GIF **with** `thumbnail` — first frame extracted, then `w`/`h`/`f` apply normally

---

### MANAGE (`translations` and `schemas` public controllers)

Admin bulk-write endpoints for translations and schemas. Uses `X-API-KEY` header auth (not query param).

| Method | Path                                           | Auth                                     | Body                       |
|--------|------------------------------------------------|------------------------------------------|----------------------------|
| `POST` | `/api/v1/spaces/:spaceId/translations/:locale` | `DEV_TOOLS` (header)                     | `zTranslationManageUpdateSchema` |
| `POST` | `/api/v1/spaces/:spaceId/schemas`              | `DEV_TOOLS` (header)                      | `zSchemaPushSchema`        |

**Request body (`zTranslationManageUpdateSchema`):**

```typescript
{
  type: 'add-missing' | 'update-existing' | 'delete-missing-key' | 'delete-missing-value';
  dryRun?: boolean;
  values: Record<string, string>; // translationId → value
}
```

**Operation types:**

| Type                   | Behavior                                                                                                   |
|------------------------|------------------------------------------------------------------------------------------------------------|
| `add-missing`          | Creates new `translations` rows (type `STRING`) for IDs that don't exist yet                                                |
| `update-existing`      | Updates `locales->{locale}` (`jsonb_set`) for IDs that already exist                                                |
| `delete-missing-key`   | Deletes the whole translation row — **every locale's value** — for each ID **not** in `values`             |
| `delete-missing-value` | Removes only `locales.{locale}` for each ID **not** in `values` that has a value there; other locales keep theirs |

`:locale` scopes everything except `delete-missing-key`, which deletes keys across the space whatever locale is pushed —
run it with a complete file (normally the source locale). The former `delete-missing` was split into these two and is
no longer accepted.

Returns `400 invalid-argument` (`Locale not supported by this space`) when `:locale` is not one of the space's locales.

**Response:**

```typescript
{
  message: string;  // e.g. "Added 1 translation", "[DryRun] Would delete 3 translation keys", "Removed 2 locale values", "No translations to update"
  ids: string[];    // only the IDs `type` wrote (or, on a dry run, would write)
  dryRun?: true;
}
```

`update-existing` only lists (and writes) IDs whose value for `:locale` actually differs; identical values are skipped.

#### Schema push (`POST /api/v1/spaces/:spaceId/schemas`)

Synchronous schema write used by `@localess/cli`'s `schema push`. Requires `DEV_TOOLS`, same as translation updates.

**Request body (`zSchemaPushSchema`):**

```typescript
{
  type: 'upsert' | 'sync'; // sync = upsert + delete schemas absent from the payload
  dryRun?: boolean;
  schemas: SchemaExport[]; // same shape as the schema export/import zip format
}
```

Unlike the import Task, push rejects (400 `invalid-argument`) a `SCHEMA`/`SCHEMAS` field whose `schemas` list is missing or empty — the editor could add no block to it. Imports still accept such fields, since existing spaces and their exports may hold them. Returns `404 not-found` when the space does not exist. Upserts reuse the import Task's change detection (`isSchemaChanged`, key-order-insensitive), preserve `createdAt`, and clear absent optionals. `sync` mode refuses (400 `failed-precondition`, listing offenders) to delete a schema still referenced by a surviving schema's `SCHEMA`/`SCHEMAS` refs or `OPTION`/`OPTIONS` source.

**Response:**

```typescript
{
  message: string;
  counts: { created: number; updated: number; deleted: number; unchanged: number };
  ids: { created: string[]; updated: string[]; deleted: string[] };
  dryRun?: true;
}
```

Each push is one Postgres transaction (Firestore used to commit in 500-write batches). Translation operations bump the space's `translation_version`; schema push writes through `applySchemaPushPlan()` (`apps/server/src/modules/schemas/schema-push.ts`) and bumps `content_version`, because schemas shape the draft output. Drafts are built from the rows on read, so the new version is all it takes to move clients past cached copies. With `dryRun: true` on either endpoint the write is skipped and only the affected IDs are returned. Both endpoints answer `200` (not Nest's POST default of `201`), as the Express app did.

---

### DEV_TOOLS (`spaces`, `schemas` and `translations` public controllers)

Space introspection and OpenAPI generation. Uses `token` query param auth.

| Method | Path                               | Auth        | Response                                                      |
|--------|------------------------------------|-------------|---------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId`          | `DEV_TOOLS` | `{ id, name, locales, localeFallback, createdAt, updatedAt }` |
| `GET`  | `/api/v1/spaces/:spaceId/open-api` | `DEV_TOOLS` | OpenAPI 3.0 JSON spec generated from schemas                  |
| `GET`  | `/api/v1/spaces/:spaceId/schemas`  | `DEV_TOOLS` | `SchemaExport[]` (id + type-specific fields, no timestamps)   |
| `GET`  | `/api/v1/spaces/:spaceId/translations/:locale/values` | `DEV_TOOLS` | `Record<string, string>` — the values stored for `locale`, **without** fallback filling (keys with no or an empty value are absent); `400` for a locale not in the space. Used by `localess translation pull --raw` |

> **Breaking change (v3.3):** `GET /schemas` previously returned `Record<schemaId, Schema>` with raw Firestore timestamps. It now returns a `SchemaExport[]` array — the same shape the push endpoint accepts and the export zip contains. Upgrade `@localess/cli` before upgrading Localess; the current CLI accepts both shapes.

---

## Middleware

### `validIdParams()` — ID validation (all controllers)

`validIdParams()` (exported from `cdn.controller.ts`, used by all three controllers before anything else runs) checks `spaceId`, `contentId` and `assetId`. A value that doesn't match `^[A-Za-z0-9_-]{1,128}$` (`apps/server/src/infra/http/v1/id-param.ts`) gets `400 invalid-argument`, with `Cache-Control: public, max-age=3600` (`CACHE_BAD_REQUEST_MAX_AGE`), so a bad ID never reaches the permission checks, a query or a storage key.

The check dates from the Firebase era, when IDs were spliced into Firestore and Storage paths and `GET /contents/X%2Fdraft?cv=…` could serve the **unpublished draft** file under a `CONTENT_PUBLIC` token. IDs are now bound SQL parameters, but asset IDs still form storage keys (`spaces/{spaceId}/assets/{assetId}/original`), so the guard stays.

Two more guards back it up:

- `assertPathSegment()` (same file) lets path builders refuse IDs that reach them from stored data.
- Reference resolution skips a stored reference ID that isn't well-formed instead of failing the response.

Tokens are checked too: `validateToken()` accepts only 20 alphanumerics, and anything else gets the usual `401`.

### `TokenAuthService` — Query Param Auth (CDN + DEV_TOOLS)

Token passed as `?token=<tokenId>`. Lookups go to the `tokens` table and are cached in memory per server instance with a 5-minute TTL (key: `${spaceId}:${tokenId}`). Token edits emit `tokens` change events, which every instance receives (Postgres `NOTIFY`) and use to drop the entry, so a revoked token stops working at once. See [Auth Tokens](auth-tokens.md).

**Conditional permission helpers:**

- `requireContentPermissions()` — requires `CONTENT_DRAFT` or `DEV_TOOLS` when `version` query param is present; otherwise accepts `CONTENT_PUBLIC`, `CONTENT_DRAFT`, or `DEV_TOOLS`.
- `requireTranslationPermissions()` — same logic with `TRANSLATION_DRAFT` / `TRANSLATION_PUBLIC` (plus `DEV_TOOLS`).

### `TokenAuthService` — Header Auth (MANAGE)

Token passed as `X-API-KEY` header. No caching — a direct `tokens` lookup on every request (`authorize(..., { cached: false })`).

---

## Error Responses

Errors keep the body the Firebase-era `HttpsError.toJSON()` produced, `{ details?, message, status }`, now written by `sendV1Error()` (`apps/server/src/infra/http/v1/v1-response.ts`).

**401 Unauthenticated** — same generic body for a missing/malformed token and for a well-formed token that doesn't exist in the space, so the response never reveals which case occurred:

```json
{ "message": "Missing or invalid API token", "status": "UNAUTHENTICATED" }
```

**403 Permission Denied** — `details` names the permission(s) that would have satisfied the check and, where relevant, why:

```json
{
  "message": "Token is missing a required permission",
  "status": "PERMISSION_DENIED",
  "details": {
    "requiredPermissions": ["CONTENT_DRAFT", "DEV_TOOLS"],
    "reason": "This request includes a `version` query parameter, which requires access to draft content.",
    "hint": "Add one of the required permissions to this token, or use a token that already has it."
  }
}
```

`details.reason` is omitted for fixed-permission checks (e.g. `DEV_TOOLS`-only endpoints, `/links`) — only `requireContentPermissions()`/`requireTranslationPermissions()` populate it, for both draft (`version` present) and published requests, explaining which permissions that kind of request needs.

---

## Token Permissions Reference

| Permission           | Grants access to                                                     |
|----------------------|----------------------------------------------------------------------|
| `CONTENT_PUBLIC`     | Published content (no `version` param)                               |
| `CONTENT_DRAFT`      | Draft content (`version` param required)                             |
| `TRANSLATION_PUBLIC` | Published translations                                               |
| `TRANSLATION_DRAFT`  | Draft translations (`version` param required)                        |
| `DEV_TOOLS`          | MANAGE + DEV_TOOLS endpoints; also satisfies all PUBLIC/DRAFT checks |

**TokenV1** (legacy, no `version` field) implicitly grants `TRANSLATION_PUBLIC`, `TRANSLATION_DRAFT`, `CONTENT_PUBLIC`, `CONTENT_DRAFT` — but not `DEV_TOOLS`.  
**TokenV2** (current, `version: 2`) has an explicit `permissions: TokenPermission[]` array.

---

## Implementation Files

| File                                                     | Purpose                                                                                   |
|----------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `apps/server/src/modules/contents/contents.public.controller.ts`         | CDN — links, documents by slug and id, `resolve*` options                                  |
| `apps/server/src/modules/translations/translations.public.controller.ts` | CDN translations, DEV_TOOLS stored values, MANAGE translation push                        |
| `apps/server/src/modules/assets/assets.public.controller.ts`             | CDN — asset delivery (transformed, original, download)                                    |
| `apps/server/src/modules/schemas/schemas.public.controller.ts`           | DEV_TOOLS OpenAPI and schema export, MANAGE schema push                                   |
| `apps/server/src/modules/spaces/spaces.public.controller.ts`             | DEV_TOOLS space metadata                                                                  |
| `apps/server/src/infra/http/v1/`                                         | Shared plumbing: `v1-request.ts` (`validIdParams`, `cv` redirects, `isDraft`), responses, Cache-Control, ID checks |
| `apps/server/src/modules/contents/content-delivery.service.ts`           | Published and draft documents, `resolveLinks`/`resolveReferences`/`resolveAssets`, links   |
| `apps/server/src/modules/translations/translation-delivery.service.ts`   | Published and draft translation maps                                                      |
| `apps/server/src/modules/assets/`                                        | `image-transform.ts` (`applySharpTransforms`, `ImageFormat`), ETags, asset query parsing   |
| `apps/server/src/auth/api-tokens/token-auth.service.ts`            | Query-param and header token auth, 5-min token cache invalidated by change events         |
| `apps/server/src/modules/assets/asset-delivery.service.ts`        | Asset streaming (Range), transforms, rendition cache                                      |
| `apps/server/src/infra/http/v1/cache-control.ts`                 | Cache TTL constants                                                                       |
| `apps/server/src/infra/http/v1/v1-response.ts`                   | `sendV1Error()` error bodies                                                              |
| `packages/shared/src/` (`@localess/shared`, `@localess/shared/zod`) | `TokenPermission` enum, token types and zod request models                                |

Acceptance tests (ported from the functions-era route tests): `apps/server/test/v1-*.test.ts`.

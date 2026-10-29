# V1 API: CDN API and Management API

> Related: [CDN & Caching](cdn-caching.md) · [Auth Tokens](auth-tokens.md) · [Publish Flow](publish-flow.md)

Two token-authenticated APIs are served by the NestJS server, on the same port as the app and the app API, with shared request plumbing in `apps/server/src/infra/http/v1/`:

- **CDN API** — `/api/v1/spaces/:spaceId/…`, read only, cacheable (`cv` redirects), `?token=` with a `public` or `preview` token (`*.cdn.controller.ts`, `@CdnToken`). It replaced the `publicv1` Firebase Function's delivery routes with the same URLs, query parameters, status codes, bodies and `Cache-Control` values. CORS reflects any origin on `/api/v1/**`.
- **Management API** — `/api/manage/v1/spaces/:spaceId/…`, live (`Cache-Control: no-store`, no token cache), `Authorization: Bearer` with a `management` token only (`*.management.controller.ts`, `@ManagementToken`). Used by `@localess/cli` and CI. No CORS headers.

Token types, values and checks: [Auth Tokens](auth-tokens.md). Neither API accepts the app's session cookie, and neither needs `X-Requested-With`. JSON request bodies are limited to 5 MB (Fastify `bodyLimit` in `apps/server/src/app.factory.ts`), so a whole space's schemas fit in one push. Responses are gzip/deflate-compressed above 1 KB (`@fastify/compress`).
---

## CDN API

### Routes (`contents`, `translations` and `assets` CDN controllers)

Content delivery with cache-busting and asset transformation. All content/translation endpoints follow the [`cv` redirect pattern](cdn-caching.md).

| Method | Path                                           | Auth                                              | Query params                                                          |
|--------|------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId/translations/:locale` | `public`; with `version`: `preview`               | `cv`, `version`, `token`                                              |
| `GET`  | `/api/v1/spaces/:spaceId/links`                | `public`; with `version`: `preview`               | `cv`, `version`, `kind`, `parentSlug`, `excludeChildren`, `token`     |
| `GET`  | `/api/v1/spaces/:spaceId/contents/slugs/*slug` | `public`; with `version`: `preview`               | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `resolveAsset`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/contents/:contentId`  | `public`; with `version`: `preview`               | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `resolveAsset`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId`      | None (public)                                     | `w`, `h`, `q`, `f`, `fit`, `thumbnail`                                |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId/original` | None (public)                                 | *(none — a transform param is rejected with 400)*                     |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId/download` | None (public)                                 | *(none — a transform param is rejected with 400)*                     |

**Notable behaviors:**

- **Published vs draft** — Published documents and translations are read from the `content_snapshots` / `translation_snapshots` rows written on publish. A draft (`?version=draft`) is a snapshot too, built from the live rows on the first draft request after a change, so a draft exists for every document, even one never saved after import. Each answers to its own `cv`, its build time, separate per document, locale and stage ([CDN & Caching](cdn-caching.md#content-cv-the-snapshots-built_at)).
- **`/links`** — Lists every folder and the **published** documents; with `version` (which needs a preview token, like a document draft) every folder and document. Each list answers to its own `cv`.
- **Locale fallback** — If the requested locale doesn't exist in the space, falls back to the space's `defaultLocale`.
- **`resolveLink=true`** — Expands cross-content link IDs to full `ContentLink` objects.
- **`resolveReference=true`** — Inlines referenced content documents at the resolved locale.
- What a document points to (the ids `resolveLink`, `resolveReference` and `resolveAsset` look up) is stored with it and
  worked out by the server from the data on every save (`shared/data-rules/content-refs.ts`); a field left empty
  points to nothing.
- **`resolveAsset=true`** — Expands referenced asset IDs to full asset metadata via `ContentDeliveryService.resolveAssets()` (`apps/server/src/modules/contents/services/content-delivery.service.ts`). References are asset UUIDs (an import from Firebase rewrites them).

Space, document and asset ids are UUIDv7s; `GET /links` is keyed by UUID.

Old asset URLs of a space imported from Firebase keep working: on the three asset routes only, the space may be given by its Firestore id (its import run's `firebase_imports.source_space_id`) and the asset by its Firestore id (`assets.legacy_id`); the route answers `301` (cached a year) to the same URL with the asset's UUID, query kept, so links in customer sites, CDNs and emails keep working once the old host points at this install. Every other route takes UUIDs only.
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

## Management API

`Authorization: Bearer mgt_…` on every route (`spaces`, `schemas` and `translations` management controllers). Every response, errors included, is `Cache-Control: no-store` (set by the guard, and by an `onSend` hook in `apps/server/src/app.factory.ts` for errors answered before it: invalid JSON, an unsupported content type, an oversized body, an unknown route); the token is read from the database on every request.

| Method | Path                                                  | Body / Response |
|--------|-------------------------------------------------------|-----------------|
| `GET`  | `/api/manage/v1/spaces/:spaceId`                      | `{ id, name, locales, defaultLocale, createdAt, updatedAt }` — `locales` in the space's order; `defaultLocale` was `localeFallback` before the self-hosted version |
| `GET`  | `/api/manage/v1/spaces/:spaceId/open-api`             | OpenAPI 3.0 JSON spec generated from schemas |
| `GET`  | `/api/manage/v1/spaces/:spaceId/schemas`              | `SchemaExport[]` (id + type-specific fields, no timestamps) |
| `POST` | `/api/manage/v1/spaces/:spaceId/schemas`              | `zSchemaPushSchema` (schema push, below) |
| `GET`  | `/api/manage/v1/spaces/:spaceId/translations/:locale` | `Record<string, string>` — the values stored for `locale`, **without** fallback filling (keys with no or an empty value are absent); `400` for a locale not in the space. Used by `localess translation pull --raw` |
| `POST` | `/api/manage/v1/spaces/:spaceId/translations/:locale` | `zTranslationPush` (translation push, below) |

These were the dev-tools (`?token=` with `DEV_TOOLS`) and manage (`X-API-KEY`) routes under `/api/v1`; the old URLs now answer 404. `GET …/translations/:locale/values` lost its `/values` suffix. A space that is being imported (or whose import failed) answers `503` here too, but only after the token is checked: a caller without the space's management token gets the usual 401 and learns nothing about the import. (On the CDN API the 503 comes first, from the `space-id.ts` hook.)

> **Breaking change (v3.3):** `GET /schemas` previously returned `Record<schemaId, Schema>` with raw Firestore timestamps. It now returns a `SchemaExport[]` array — the same shape the push endpoint accepts and the export zip contains.

### Translation push (`POST …/translations/:locale`)

**Request body (`zTranslationPush`):**

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
| `add-missing`          | Creates new `translations` rows for IDs that don't exist yet                                                |
| `update-existing`      | Updates `locales->{locale}` (`jsonb_set`) for IDs that already exist                                                |
| `delete-missing-key`   | Deletes the whole translation row — **every locale's value** — for each ID **not** in `values`             |
| `delete-missing-value` | Removes only `locales.{locale}` for each ID **not** in `values` that has a value there; other locales keep theirs |

`:locale` scopes everything except `delete-missing-key`, which deletes keys across the space whatever locale is pushed —
run it with a complete file (normally the source locale). The former `delete-missing` was split into these two and is
no longer accepted.

Returns `400 invalid-argument` (`Locale not supported by this space`) when `:locale` is not one of the space's locales,
and `400 invalid-argument` (`Invalid translation keys`, `details: { keys }`) when `add-missing` would create keys outside
the key rule (see [translations.md](features/spaces/translations.md#keys-and-values)); nothing is written, dry run or not.
Each value is at most 10,000 characters.

**Response:**

```typescript
{
  message: string;  // e.g. "Added 1 translation", "[DryRun] Would delete 3 translation keys", "Removed 2 locale values", "No translations to update"
  ids: string[];    // only the IDs `type` wrote (or, on a dry run, would write)
  dryRun?: true;
}
```

`update-existing` only lists (and writes) IDs whose value for `:locale` actually differs; identical values are skipped.

### Schema push (`POST …/schemas`)

Synchronous schema write used by `@localess/cli`'s `schema push`.

**Request body (`zSchemaPushSchema`):**

```typescript
{
  type: 'upsert' | 'sync'; // sync = upsert + delete schemas absent from the payload
  dryRun?: boolean;
  schemas: SchemaExport[]; // same shape as the schema export/import zip format
}
```

Unlike the import Task, push rejects (400 `invalid-argument`) a `SCHEMA`/`SCHEMAS` field whose `schemas` list is missing or empty — the editor could add no block to it. Imports still accept such fields, since existing spaces and their exports may hold them. Returns `404 not-found` when the space does not exist. Upserts reuse the import Task's change detection (`isSchemaChanged`, key-order-insensitive), preserve `createdAt`, and clear absent optionals. `sync` mode refuses (400 `failed-precondition`, listing offenders) to delete a schema still referenced by a surviving schema's `SCHEMA`/`SCHEMAS` refs or `OPTION`/`OPTIONS` source, or one that contents use as their document schema (`Cannot delete schema 'page': used by 4 contents`; checked again under lock when applied). Pushed fields must keep the rules across fields, checked against the schemas as the push leaves them (`Schema 'page': field 'hero' allows 'gone', which does not exist`): unique field names, a previewable `previewField` among them, `schemas` naming NODE schemas, `source` an ENUM.

**Response:**

```typescript
{
  message: string;
  counts: { created: number; updated: number; deleted: number; unchanged: number };
  ids: { created: string[]; updated: string[]; deleted: string[] };
  dryRun?: true;
}
```

Each push is one Postgres transaction (Firestore used to commit in 500-write batches). Translation operations drop the space's draft translation snapshots, so the next draft request builds them under a new `cv`; schema push writes through `applySchemaPushPlan()` (`apps/server/src/shared/queries/schema.query.ts`, shared with the schema import task) in `SchemaRepository.applyPushPlan`; it moves no content `cv` (a content draft keeps the schemas it was built with until its document changes). With `dryRun: true` on either endpoint the write is skipped and only the affected IDs are returned. Both endpoints answer `200` (not Nest's POST default of `201`), as the Express app did.

---

## Request checks

### Ids (both APIs)

The token guards check `spaceId`, `contentId` and `assetId` first (`assertValidIdParams()` in `apps/server/src/infra/http/v1/v1-request.ts`; asset routes call `validIdParams()`). A value that doesn't match `^[A-Za-z0-9_-]{1,128}$` (`apps/server/src/infra/http/v1/id-param.ts`) gets `400 invalid-argument` — on the CDN with `Cache-Control: public, max-age=3600` (`CACHE_BAD_REQUEST_MAX_AGE`), on the Management API `no-store` — so a bad ID never reaches the token check, a query or a storage key.

The check dates from the Firebase era, when IDs were spliced into Firestore and Storage paths and `GET /contents/X%2Fdraft?cv=…` could serve the **unpublished draft** file under a public token. IDs are now bound SQL parameters, but asset IDs still form storage keys (`spaces/{spaceId}/assets/{assetId}/original`), so the check stays.

Two more guards back it up:

- `assertPathSegment()` (same file) lets path builders refuse IDs that reach them from stored data.
- Reference resolution skips a stored reference ID that isn't well-formed instead of failing the response.

### Tokens

- **CDN:** `@CdnToken({ published, draft, reason })` → `CdnTokenGuard`: `?token=`, pattern and checksum, a cached lookup by hash (5 minutes, dropped by `tokens` change events), then the type the request needs (`draft` when `version` is present). A `mgt_` value is refused before any lookup.
- **Management:** `@ManagementToken()` → `ManagementTokenGuard`: `Authorization: Bearer` (scheme in any case, one value), a management token found by hash in this space, uncached.

See [Auth Tokens](auth-tokens.md#checks).

---

## Error Responses

Errors keep the body the Firebase-era `HttpsError.toJSON()` produced, `{ details?, message, status }`, now written by `sendV1Error()` (`apps/server/src/infra/http/v1/v1-response.ts`).

Guards throw `V1Error` and `V1ExceptionFilter` writes the same body (`apps/server/src/infra/http/v1/v1-error.ts`).

**401 Unauthenticated** — same generic body for a missing, malformed or checksum-broken token and for a well-formed token that doesn't exist in the space, so the response never reveals which case occurred:

```json
{ "message": "Missing or invalid API token", "status": "UNAUTHENTICATED" }
```

On the CDN, a management token in `?token=` gets `details: { "hint": "Management tokens go in the Authorization header on /api/manage/v1." }`. On the Management API every 401 carries `WWW-Authenticate: Bearer`.

**403 Permission Denied** (CDN only) — `details` names the token types that would have satisfied the check and why:

```json
{
  "message": "Token type not allowed for this request",
  "status": "PERMISSION_DENIED",
  "details": {
    "requiredTypes": ["preview"],
    "reason": "This request includes a `version` query parameter, which requires a preview token.",
    "hint": "Use a token of one of the required types."
  }
}
```

---

## Token Types Reference

| Type         | CDN API (`?token=`)                | Management API (`Authorization: Bearer`) |
|--------------|------------------------------------|------------------------------------------|
| `public`     | Published content and translations | No                                       |
| `preview`    | Published and drafts               | No                                       |
| `management` | No                                 | Every route                              |

Tokens are not imported from Firebase; every space starts with an Auto Generated Preview Token. See [Auth Tokens](auth-tokens.md).

---

## Implementation Files

| File                                                     | Purpose                                                                                   |
|----------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `apps/server/src/modules/contents/controllers/content.cdn.controller.ts` | CDN — links, documents by slug and id, `resolve*` options                                  |
| `apps/server/src/modules/translations/controllers/translation.cdn.controller.ts` | CDN translations                                                                 |
| `apps/server/src/modules/translations/controllers/translation.management.controller.ts` | Management — stored values, translation push                              |
| `apps/server/src/modules/assets/controllers/asset.cdn.controller.ts` | CDN — asset delivery (transformed, original, download): ETag/304, Range, headers          |
| `apps/server/src/modules/schemas/controllers/schema.management.controller.ts` | Management — OpenAPI, schema export, schema push                                 |
| `apps/server/src/modules/spaces/controllers/space.management.controller.ts` | Management — space metadata                                                        |
| `apps/server/src/auth/token-auth.decorators.ts`, `apps/server/src/auth/guards/` | `@CdnToken`, `@ManagementToken` and their guards                                 |
| `apps/server/src/infra/http/v1/`                                         | Shared plumbing: `v1-request.ts` (`assertValidIdParams`, `validIdParams`, `cv` redirects, `isDraft`), `v1-error.ts`, responses, Cache-Control, ID checks |
| `apps/server/src/modules/contents/services/content-delivery.service.ts`           | Published and draft documents, `resolveLinks`/`resolveReferences`/`resolveAssets`, links   |
| `apps/server/src/modules/translations/services/translation-delivery.service.ts` | Published and draft translation maps                                                      |
| `apps/server/src/modules/assets/utils/`                                  | `image-transform.ts` (`applySharpTransforms`, `ImageFormat`), ETags, asset query parsing, Range |
| `apps/server/src/auth/services/token-auth.service.ts`              | Token lookups by hash, the CDN's 5-min token cache invalidated by change events           |
| `apps/server/src/modules/assets/services/asset-delivery.service.ts` | Transform decisions, transforms, rendition cache                                       |
| `apps/server/src/infra/http/v1/cache-control.ts`                 | Cache TTL constants                                                                       |
| `apps/server/src/infra/http/v1/v1-response.ts`                   | `sendV1Error()` error bodies                                                              |
| `packages/shared/src/` (`@localess/shared`, `@localess/shared/zod`) | `TokenType` enum, the `Token` model and zod request models                               |

Acceptance tests: `apps/server/test/v1-*.test.ts` (CDN, ported from the functions-era route tests) and `apps/server/test/manage-api.test.ts` (Management API).

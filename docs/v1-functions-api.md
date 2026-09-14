# V1 Functions API

> Related: [CDN & Caching](cdn-caching.md) · [Auth Tokens](auth-tokens.md) · [Publish Flow](publish-flow.md)

The public REST API is served by the `publicv1` Firebase Function (Express app, `europe-west6`, `maxInstances: 10`, `concurrency: 600`) via the Hosting rewrite `/api/v1/**`. `maxInstances` is set on the function itself in `functions/src/v1.ts`, overriding the codebase-wide `setGlobalOptions({ maxInstances: 1 })` — this is the only function serving public consumer traffic, so it must scale past a single instance. Three Express routers handle all routes: `CDN`, `MANAGE`, and `DEV_TOOLS`.

---

## Routers

### CDN (`functions/src/v1/cdn.ts`)

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

- **Locale fallback** — If the requested locale doesn't exist in the space, falls back to `space.localeFallback`.
- **`resolveLink=true`** — Expands cross-content link IDs to full `ContentLink` objects.
- **`resolveReference=true`** — Inlines referenced content documents at the resolved locale.
- **`resolveAsset=true`** — Expands referenced asset IDs to full asset metadata via `resolveAssets()` (`functions/src/services/content.service.ts:305`).
- **Asset transforms** — Uses Sharp for images (`w`/`h`/`q`/`f`/`fit` params). Supported output formats (`f`): `webp`, `jpeg`, `png`, `avif`. SVG is passed through unsized; animated GIF/WebP are resized with all frames preserved. Video + `w` + `thumbnail` extracts a frame with FFmpeg then resizes with Sharp.
- **No implicit format conversion, but quality is normalised** — `f` is the only thing that changes an image format. A bare request keeps the stored format yet still re-encodes a still raster at that format default quality: a q95 upload measured 587KB and returned 219KB. GIF, SVG, video and animations are served as stored. Passing `f=webp` or `f=avif` is the recommended way to cut transfer size further.
- **`q` is not defaulted by the endpoint** — it is **rejected** outside `1–100` rather than clamped, and when omitted nothing is passed to the encoder, so each format applies its own calibrated default: JPEG and WebP 80, AVIF 50, PNG lossless. A quality number is not portable between codecs, which is why one flat value is not imposed on all of them. An explicit `q` always wins.
- **`fit` param** — `cover` (default) · `contain` · `inside` · `outside` · `fill`. **Ignored unless both `w` and `h` are present**, since Sharp preserves aspect ratio with a single dimension. `contain` pads: transparent for `png`/`webp`/`avif`, opaque white otherwise (a transparent pad would flatten to black on a JPEG).
- **Invalid `f` or `fit`** — returns `400 invalid-argument` naming the accepted values. An empty value (`?f=`) counts as absent, not invalid. The `400` is sent with `Cache-Control: public, max-age=3600` so a bad URL is served from the CDN instead of re-entering the function; the TTL is deliberately short because the accepted value set can grow with a deploy.
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
invalidate the CDN. **`inside` is usually what a CMS thumbnail wants** — opt into it explicitly.

**Breaking change — invalid `f` now returns 400.** Previously an unrecognised `f` was silently
ignored and the untransformed image was returned; it now returns `400 invalid-argument`, matching
`fit`. A typo in a format no longer fails quietly.

**Special cases:**
- `image/svg+xml` — always passed through; `w`/`h`/`f` are ignored
- Animated WebP or GIF on a **bare** request — served as stored; re-encoding every frame on each cache miss is the most expensive thing the endpoint could do, and the pixel cap would turn a plain `<img src>` into a `400`
- Animated WebP or GIF **with** a transform — resized with all frames preserved; `f=webp` converts GIF to animated WebP. Rejected with `400` above `MAX_ANIMATED_PIXELS` (12 Mpx total)
- Animated WebP or GIF **with** `thumbnail` — first frame extracted, then `w`/`h`/`f` apply normally

---

### MANAGE (`functions/src/v1/manage.ts`)

Admin bulk-write endpoints for translations and schemas. Uses `X-API-KEY` header auth (not query param).

| Method | Path                                           | Auth                                     | Body                       |
|--------|------------------------------------------------|------------------------------------------|----------------------------|
| `POST` | `/api/v1/spaces/:spaceId/translations/:locale` | `DEV_TOOLS` (header)                     | `zTranslationUpdateSchema` |
| `POST` | `/api/v1/spaces/:spaceId/schemas`              | `DEV_TOOLS` (header)                      | `zSchemaPushSchema`        |

**Request body (`zTranslationUpdateSchema`):**

```typescript
{
  type: 'add-missing' | 'update-existing' | 'delete-missing';
  dryRun?: boolean;
  values: Record<string, string>; // translationId → value
}
```

**Operation types:**

| Type              | Behavior                                                     |
|-------------------|--------------------------------------------------------------|
| `add-missing`     | Creates new `Translation` docs for IDs that don't exist yet  |
| `update-existing` | Updates `locales.{locale}` field for IDs that already exist  |
| `delete-missing`  | Deletes all translation docs whose ID is **not** in `values` |

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

Upserts reuse the import Task's change detection (`isSchemaChanged`, key-order-insensitive), preserve `createdAt`, and clear absent optionals. `sync` mode refuses (400 `failed-precondition`, listing offenders) to delete a schema still referenced by a surviving schema's `SCHEMA`/`SCHEMAS` refs or `OPTION`/`OPTIONS` source.

**Response:**

```typescript
{
  message: string;
  counts: { created: number; updated: number; deleted: number; unchanged: number };
  ids: { created: string[]; updated: string[]; deleted: string[] };
  dryRun?: true;
}
```

All three operations write via Firestore `WriteBatch` in chunks of `BATCH_MAX` (500), committed sequentially by the `commitInBatches()` helper (`functions/src/v1/manage.ts:18-36`), then call `generateTranslationsDraft()` to update Storage cache. With `dryRun: true` the operation is skipped and only the affected IDs are returned.

---

### DEV_TOOLS (`functions/src/v1/dev-tools.ts`)

Space introspection and OpenAPI generation. Uses `token` query param auth.

| Method | Path                               | Auth        | Response                                                      |
|--------|------------------------------------|-------------|---------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId`          | `DEV_TOOLS` | `{ id, name, locales, localeFallback, createdAt, updatedAt }` |
| `GET`  | `/api/v1/spaces/:spaceId/open-api` | `DEV_TOOLS` | OpenAPI 3.0 JSON spec generated from schemas                  |
| `GET`  | `/api/v1/spaces/:spaceId/schemas`  | `DEV_TOOLS` | `SchemaExport[]` (id + type-specific fields, no timestamps)   |

> **Breaking change (v3.3):** `GET /schemas` previously returned `Record<schemaId, Schema>` with raw Firestore timestamps. It now returns a `SchemaExport[]` array — the same shape the push endpoint accepts and the export zip contains. Upgrade `@localess/cli` before upgrading Localess; the current CLI accepts both shapes.

---

## Middleware

### `query-auth.middleware.ts` — Query Param Auth (CDN + DEV_TOOLS)

Token passed as `?token=<tokenId>`. Results are cached in-memory per Function instance with a 5-minute TTL (key: `${spaceId}:${tokenId}`) to reduce Firestore reads.

**Conditional permission helpers:**

- `requireContentPermissions()` — requires `CONTENT_DRAFT` when `version` query param is present; otherwise accepts `CONTENT_PUBLIC`, `CONTENT_DRAFT`, or `DEV_TOOLS`.
- `requireTranslationPermissions()` — same logic with `TRANSLATION_DRAFT` / `TRANSLATION_PUBLIC`.

### `api-key-auth.middleware.ts` — Header Auth (MANAGE)

Token passed as `X-API-KEY` header. No caching — direct Firestore lookup on every request.

---

## Error Responses

401 and 403 responses serialize via `HttpsError`'s `toJSON()` as `{ message, status, details? }`.

**401 Unauthenticated** — same generic body for a missing/malformed token and for a well-formed token that doesn't exist in Firestore, so the response never reveals which case occurred:

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

`details.reason` is omitted for fixed-permission checks (e.g. `DEV_TOOLS`-only endpoints, `/links`) — only `requireContentPermissions()`/`requireTranslationPermissions()` populate it, explaining the draft-vs-published distinction.

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
| `functions/src/v1/cdn.ts`                                | CDN router — all 5 delivery endpoints                                                     |
| `functions/src/v1/manage.ts`                             | MANAGE router — translation bulk-write                                                    |
| `functions/src/v1/dev-tools.ts`                          | DEV_TOOLS router — space metadata, OpenAPI, schemas                                       |
| `functions/src/v1/middleware/query-auth.middleware.ts`   | Query-param auth with 5-min token cache                                                   |
| `functions/src/v1/middleware/api-key-auth.middleware.ts` | Header-based auth (no cache)                                                              |
| `functions/src/config.ts`                                | Cache TTL constants, `bucket`, `firestoreService`                                         |
| `functions/src/models/token.model.ts`                    | `TokenPermission` enum, `TokenV1`/`TokenV2` types                                         |
| `functions/src/utils/image-transform.ts`                 | `applySharpTransforms`, `ImageFormat`, `isImageFormat`                                    |
| `functions/src/services/`                                | `generateTranslationsDraft`, `generateOpenApi`, `resolveLinks`, `resolveReferences`, etc. |

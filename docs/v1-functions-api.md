# V1 Functions API

> Related: [CDN & Caching](cdn-caching.md) · [Auth Tokens](auth-tokens.md) · [Publish Flow](publish-flow.md)

The public REST API is served by the `publicv1` Firebase Function (Express app, `europe-west6`, `maxInstances: 1`, `concurrency: 600`) via the Hosting rewrite `/api/v1/**`. Three Express routers handle all routes: `CDN`, `MANAGE`, and `DEV_TOOLS`.

---

## Routers

### CDN (`functions/src/v1/cdn.ts`)

Content delivery with cache-busting and asset transformation. All content/translation endpoints follow the [`cv` redirect pattern](cdn-caching.md).

| Method | Path                                           | Auth                                              | Query params                                                          |
|--------|------------------------------------------------|---------------------------------------------------|-----------------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId/translations/:locale` | `TRANSLATION_PUBLIC` or `TRANSLATION_DRAFT`       | `cv`, `version`, `token`                                              |
| `GET`  | `/api/v1/spaces/:spaceId/links`                | `CONTENT_PUBLIC`, `CONTENT_DRAFT`, or `DEV_TOOLS` | `cv`, `kind`, `parentSlug`, `excludeChildren`, `token`                |
| `GET`  | `/api/v1/spaces/:spaceId/contents/slugs/*slug` | `requireContentPermissions()`                     | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/contents/:contentId`  | `requireContentPermissions()`                     | `cv`, `locale`, `version`, `resolveReference`, `resolveLink`, `token` |
| `GET`  | `/api/v1/spaces/:spaceId/assets/:assetId`      | None (public)                                     | `w`, `h`, `q`, `f`, `download`, `thumbnail`                           |

**Notable behaviors:**

- **Locale fallback** — If the requested locale doesn't exist in the space, falls back to `space.localeFallback`.
- **`resolveLink=true`** — Expands cross-content link IDs to full `ContentLink` objects.
- **`resolveReference=true`** — Inlines referenced content documents at the resolved locale.
- **Asset transforms** — Uses Sharp for images (`w`/`h`/`q`/`f` params). Supported output formats (`f`): `webp`, `jpeg`, `png`, `avif`. SVG and animated GIF/WebP are passed through unsized. Video + `w` + `thumbnail` extracts a frame with FFmpeg then resizes with Sharp.
- **`download` param** — Switches `Content-Disposition` from `inline` to `form-data` (forces browser download).

#### Asset resize combinations (`w` / `h`)

Sharp is called as `resize(width ?? null, height ?? null)` with its default fit mode (`cover`).

| `w` | `h` | Behavior                                                                                                                   |
|-----|-----|----------------------------------------------------------------------------------------------------------------------------|
| ✓   | —   | Scale to width, height auto — aspect ratio preserved, no crop                                                              |
| —   | ✓   | Scale to height, width auto — aspect ratio preserved, no crop                                                              |
| ✓   | ✓   | **`cover` crop** — resizes to fill the exact box, excess edges are cropped. Image is not distorted but content may be lost |
| —   | —   | No resize — only format/quality re-encoding if `f`/`q` provided                                                            |

**Known limitation:** `w` + `h` together use Sharp's default `cover` fit, which crops. For a CMS use-case `inside` (shrink to fit, no crop) is usually more appropriate.

**Special cases that bypass resize entirely:**
- `image/svg+xml` — always passed through; `w`/`h`/`f` are ignored
- Animated WebP or GIF **without** `thumbnail` — passed through (Sharp cannot resize animated files)
- Animated WebP or GIF **with** `thumbnail` — first frame extracted, then `w`/`h`/`f` apply normally

---

### MANAGE (`functions/src/v1/manage.ts`)

Admin bulk-write endpoint for translations. Uses `X-API-KEY` header auth (not query param).

| Method | Path                                           | Auth                 | Body                       |
|--------|------------------------------------------------|----------------------|----------------------------|
| `POST` | `/api/v1/spaces/:spaceId/translations/:locale` | `DEV_TOOLS` (header) | `zTranslationUpdateSchema` |

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

All three operations use Firestore `bulkWriter()` for atomic batch execution, then call `generateTranslationsDraft()` to update Storage cache. With `dryRun: true` the operation is skipped and only the affected IDs are returned.

---

### DEV_TOOLS (`functions/src/v1/dev-tools.ts`)

Space introspection and OpenAPI generation. Uses `token` query param auth.

| Method | Path                               | Auth        | Response                                                      |
|--------|------------------------------------|-------------|---------------------------------------------------------------|
| `GET`  | `/api/v1/spaces/:spaceId`          | `DEV_TOOLS` | `{ id, name, locales, localeFallback, createdAt, updatedAt }` |
| `GET`  | `/api/v1/spaces/:spaceId/open-api` | `DEV_TOOLS` | OpenAPI 3.0 JSON spec generated from schemas                  |
| `GET`  | `/api/v1/spaces/:spaceId/schemas`  | `DEV_TOOLS` | `Record<schemaId, Schema>`                                    |

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

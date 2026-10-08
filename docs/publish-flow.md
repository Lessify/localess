# Publish Flow & Cache Invalidation

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md) · [Webhooks](webhooks.md)

## Overview

Publishing takes a snapshot of content/translations into the `content_published` / `translation_published` Postgres tables. The public API serves published requests from those rows; drafts (`?version=draft`) are built from the live rows on every request. Publishing is the only way to make content visible to `*_PUBLIC` tokens.

Every write follows the same shape on the server: one transaction that changes the rows, bumps the space's version counter (`content_version` / `translation_version`, the [`cv`](cdn-caching.md)) and queues change events (`pg_notify`, delivered to the UI over SSE). Webhooks are dispatched only **after** the transaction commits, so a receiver that fetches the API sees the new state.

---

## Content Publish Flow

```
1. User clicks "Publish" in the UI
2. Angular ContentService → POST /api/app/spaces/:spaceId/contents/:id/publish   (CONTENT_PUBLISH)
3. ContentsService.publish(), in one transaction:
   a. reads the document (or, for a FOLDER, every DOCUMENT under it that changed since it was
      last published) and the space's schemas
   b. extracts locale-specific data for each space locale (buildDocumentStorage) and upserts one
      content_published row per (content, locale)
   c. deletes content_published rows for locales no longer in the space
   d. stamps contents.published_at (updated_at is left alone, so "changed since publish" works)
   e. bumps spaces.content_version (new cv) and emits `contents` change events
4. After commit: CONTENT_PUBLISHED webhook
5. All subsequent API requests get a new cv → cached responses bypassed
```

> **Note:** publish is not special for the `cv`. Every content write — create, edit, move, clone, delete, publish, unpublish — runs in `ContentsService.write()`, which bumps `content_version`. Schema writes and asset updates/deletes bump it too, because drafts are rendered through schemas and resolved assets appear in responses.

### Content Drafts

There are no draft files any more. `GET /api/v1/.../contents/...?version=draft` reads the `contents` row and runs the same locale extraction against the current schemas on every request (`PublicContentService` → `buildDocumentStorage()`). Consequences:

- A draft always exists and reflects the current schemas (Firebase-era draft files were snapshots written on save, and absent for never-edited documents).
- Saving a document needs no separate draft step; the `content_version` bump moves draft consumers past cached copies.

### Content Unpublish Flow

```
1. Angular → POST /api/app/spaces/:spaceId/contents/:id/unpublish   (CONTENT_PUBLISH)
2. ContentsService.unpublish(), in one transaction:
   - for a DOCUMENT: clears published_at and deletes its content_published rows
   - for a FOLDER: does the same for every published document under the folder
   - bumps content_version, emits change events
3. After commit: CONTENT_UNPUBLISHED webhook
```

---

## Translation Publish Flow

```
1. User clicks "Publish Translations" in the UI
2. Angular TranslationService → POST /api/app/spaces/:spaceId/translations/publish   (TRANSLATION_PUBLISH)
3. TranslationsService.publish(), in one transaction:
   a. reads every translation row of the space
   b. per space locale, builds the flat key/value map, filled from the fallback locale
      (buildTranslationMap), and upserts a translation_published row
   c. writes per-locale translated counts to spaces.progress.translations
   d. bumps spaces.translation_version (new cv), emits a `spaces` change event
4. After commit: TRANSLATION_PUBLISHED webhook
```

Publishing a space with no translations is allowed and serves `{}`.

---

## Translation Drafts

Draft translations are built on read from the `translations` rows (`buildTranslationMap()` in `server/src/public-api/public-content.service.ts`), so there is nothing to keep in sync. The Firebase-era `translation-publishdraft` callable that the UI fired after every edit is gone.

### Frontend saves (add / edit / rename / delete)

```
1. User saves a translation key in the UI
2. Angular TranslationService → /api/app/spaces/:spaceId/translations[...]   (POST / PATCH / PUT / DELETE)
3. TranslationsService.write(), in one transaction: row change + translation_version bump + change events
4. After commit: TRANSLATION_CHANGED webhook
```

### Import Task (TRANSLATION_IMPORT)

A flat JSON import is the same `TRANSLATION_IMPORT` task kind with `task.locale` set; without `task.locale` it is a full import. Both run in the task worker (`server/src/tasks/task-runner.service.ts`), write all rows in one transaction and bump `translation_version`.

### CLI Manage API (POST /api/v1/spaces/:spaceId/translations/:locale)

```
1. Manage endpoint writes all rows in one transaction
2. The same transaction bumps translation_version
```

---

## Cache Invalidation

The `cv` is the space's version counter — `spaces.content_version` for content/links, `spaces.translation_version` for translations. A redirect to the current `cv` is what invalidates caches in front of the API:

```
Old cv = 41  →  request redirects to ?cv=41  →  CDN/proxy has it cached ✓
Publish happens   →  content_version = 42
New request       →  no cv / stale cv      →  redirects to ?cv=42  →  cache miss, fetches fresh
```

After the first cache miss for the new cv, a CDN or caching proxy keeps the response for up to 7 days (`s-maxage`). See [CDN & Caching](cdn-caching.md).

---

## Where Published Data Lives

```
content_published      PK (space_id, content_id, locale)  data jsonb, published_at
translation_published  PK (space_id, locale)              data jsonb, published_at
spaces                 content_version, translation_version (the cv), progress
```

Only binary files are in storage (`$LOCALESS_STORAGE_DIR/spaces/{spaceId}/assets/...` and task files). The Firebase-era `contents/{id}/{locale}.json`, `draft/` and `cache.json` files are gone; `import:firebase` copies the published snapshots into the two tables as served, without re-publishing.

---

## Link & Reference Resolution

Content documents can include `links`, `references`, and `assets` arrays (IDs of other content/assets). The CDN API resolves these on request when the consumer passes:
- `?resolveLink=true` — resolves links to `ContentMetadata` objects
- `?resolveReference=true` — resolves references to content documents, with their own id arrays stripped
- `?resolveAsset=true` — resolves asset IDs to full asset metadata via `resolveAssets()`

Resolution is done at request time with batched `where id = any(...)` queries: links from `contents`, assets from `assets`, and references from `content_published` (or, for a draft request, the live `contents` rows), in the same locale with no fallback. This adds latency but avoids denormalization.

### The id arrays are storage-only

`links`/`references`/`assets` exist on the **stored** document but are never returned to a consumer:

- **Top level** — the CDN handlers destructure them out and replace them with resolved maps, or omit the keys entirely when the corresponding `resolve*` flag is absent.
- **Inside a `references` map** — `stripStorageIds()` (`server/src/public-api/lib/strip-storage-ids.ts`) removes them, so a resolved reference carries only its metadata, `locale` and `data`.

They are redundant on the wire: each one is a denormalized index of edges that already exist in `data`, since a `REFERENCE` field value is `{ kind: 'REFERENCE', uri }`. A consumer follows a further reference by reading that `uri` and looking it up in the same map — which is also why reference resolution can stay one level deep without losing information.

Do not reintroduce them into a response. `stripStorageIds` uses a rest-destructure so a field added to `ContentDocumentStorage` later is carried through rather than silently dropped, and its tests pin both behaviours.

---

## Implementation Files

- `server/src/app-api/contents/contents.service.ts` — content `publish`/`unpublish`, `write()` (version bump, change events, webhooks after commit)
- `server/src/app-api/translations/translations.service.ts` — translation `publish`, `write()`
- `server/src/app-api/common/space-access.ts` — `bumpVersion()`
- `server/src/domain/lib/content-extract.ts` — locale extraction (`buildDocumentStorage`)
- `server/src/public-api/public-content.service.ts` — published/draft reads, `buildTranslationMap`, link/reference/asset resolution
- `server/src/tasks/task-runner.service.ts` — imports (bump versions at the end of their transaction)
- `server/src/public-api/manage.controller.ts` — CLI push endpoint

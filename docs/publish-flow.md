# Publish Flow & Cache Invalidation

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md) · [Webhooks](webhooks.md)

## Overview

Publishing takes a snapshot of content into `content_published`, and of translations into `translation_snapshots` (`version = 'published'`). The public API serves published requests from those rows. Content drafts (`?version=draft`) are built from the live rows on every request; translation drafts are snapshots too (`version = 'draft'`), built on the first draft request after a change. Publishing is the only way to make content visible to `*_PUBLIC` tokens.

Every write follows the same shape on the server: one transaction that changes the rows, moves what the [`cv`](cdn-caching.md) names (content: bumps `spaces.content_version`; translations: drops the draft snapshots, under the space's translations lock) and queues change events (`pg_notify`, delivered to the UI over SSE). Webhooks are dispatched only **after** the transaction commits, so a receiver that fetches the API sees the new state.

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
3. TranslationsService.publish() → TranslationSnapshotsRepository.publish(), in one transaction:
   a. takes the space's translations lock
   b. reads every translation row of the space
   c. per space locale, builds the flat key/value map, filled from the default locale
      (buildTranslationMap), and replaces the space's published snapshots with them, all with one
      built_at: the new published cv. Draft snapshots and their cv are untouched.
4. After commit: TRANSLATION_PUBLISHED webhook
```

Publishing a space with no translations is allowed and serves `{}`.

---

## Translation Drafts

Draft translations are snapshots built from the `translations` rows (`apps/server/src/modules/translations/repositories/translation-snapshots.repository.ts`). A write that changes what a draft would hold drops the space's draft snapshots in its own transaction; the first draft request after it builds every locale at once (one `built_at`, the new draft `cv`). The published `cv` doesn't move. Writes, publishes and draft builds of one space take the same lock (`pg_advisory_xact_lock` named for the space's translations; `lockTranslations` / `dropTranslationDrafts` in `apps/server/src/shared/data-rules/translation-drafts.ts`, which every module that writes translations or a space's locales calls), so a build never stores a map read before an edit that has since committed. The Firebase-era `translation-publishdraft` callable that the UI fired after every edit is gone.

Writes that drop the drafts: every translation save, delete all, machine translation, the import task, the CLI push, and adding or removing a space locale or changing the default locale (a removed locale also loses its published snapshot).

### Frontend saves (add / edit / rename / delete)

```
1. User saves a translation key in the UI
2. Angular TranslationService → /api/app/spaces/:spaceId/translations[...]   (POST / PATCH / PUT / DELETE)
3. TranslationsService.write(), in one transaction: row change + draft snapshots dropped + change events
4. After commit: TRANSLATION_CHANGED webhook
```

### Import Task (TRANSLATION_IMPORT)

A flat JSON import is the same `TRANSLATION_IMPORT` task kind with `task.locale` set; without `task.locale` it is a full import. Both run in the task worker (`apps/server/src/modules/tasks/task-runner.service.ts`), write all rows in one transaction and drop the draft snapshots.

### CLI Manage API (POST /api/v1/spaces/:spaceId/translations/:locale)

```
1. Manage endpoint writes all rows in one transaction
2. The same transaction drops the draft snapshots
```

---

## Cache Invalidation

The `cv` is `spaces.content_version` for content/links, and the snapshot's `built_at` (epoch milliseconds) for translations, separately for draft and published. A redirect to the current `cv` is what invalidates caches in front of the API:

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
translation_snapshots  PK (space_id, version, locale)     data json, built_at (the translation cv)
spaces                 content_version (the content cv)
```

Only binary files are in storage (`$LOCALESS_STORAGE_DIR/spaces/{spaceId}/assets/...` and task files). The Firebase-era `contents/{id}/{locale}.json`, `draft/` and `cache.json` files are gone; an import from Firebase brings drafts only; the space is published again after the import.

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
- **Inside a `references` map** — `stripStorageIds()` (`apps/server/src/modules/contents/utils/strip-storage-ids.ts`) removes them, so a resolved reference carries only its metadata, `locale` and `data`.

They are redundant on the wire: each one is a denormalized index of edges that already exist in `data`, since a `REFERENCE` field value is `{ kind: 'REFERENCE', uri }`. A consumer follows a further reference by reading that `uri` and looking it up in the same map — which is also why reference resolution can stay one level deep without losing information.

Do not reintroduce them into a response. `stripStorageIds` uses a rest-destructure so a field added to `ContentDocumentStorage` later is carried through rather than silently dropped, and its tests pin both behaviours.

---

## Implementation Files

- `apps/server/src/modules/contents/services/contents.service.ts` — content `publish`/`unpublish`, webhooks after commit
- `apps/server/src/modules/contents/repositories/contents.repository.ts` — the writes and their transaction: `write()` (version bump, change events), the publish snapshots
- `apps/server/src/modules/translations/services/translations.service.ts` — translation `publish` and the app's writes; `repositories/translations.repository.ts` — the write transaction (row change, draft snapshots dropped, change events)
- `apps/server/src/shared/data-rules/content-version.ts` — `bumpContentVersion()`
- `apps/server/src/modules/contents/utils/content-extract.ts` — locale extraction (`buildDocumentStorage`)
- `apps/server/src/modules/contents/services/content-delivery.service.ts` — published/draft document reads, link/reference/asset resolution (queries in `repositories/content-delivery.repository.ts`)
- `apps/server/src/modules/translations/services/translation-delivery.service.ts` — published/draft translation reads and the CLI push; `buildTranslationMap` in `utils/translation.utils.ts`
- `apps/server/src/modules/tasks/task-runner.service.ts` — imports (bump versions at the end of their transaction)
- `apps/server/src/modules/translations/translations.public.controller.ts` — CLI translation push endpoint

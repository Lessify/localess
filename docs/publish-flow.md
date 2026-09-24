# Publish Flow & Cache Invalidation

> Related: [CDN & Caching](cdn-caching.md) · [Concepts](concepts.md) · [Billing & Cost](billing.md)

## Overview

Publishing is the process of converting Firestore content/translations into static JSON files in Firebase Storage. The CDN then serves these files directly. Publishing is the only way to make content visible on the public API.

---

## Content Publish Flow

```
1. User clicks "Publish" in the UI
2. Angular calls Firebase Function (content endpoint)
3. Function reads ContentDocument + its Schema from Firestore
4. Function extracts locale-specific data for each Space locale
5. Function writes JSON to Storage:
     spaces/{spaceId}/contents/{contentId}/{locale}.json   (one per locale)
6. Function stamps publishedAt on the Firestore document
7. That Firestore write fires the content.onwrite trigger, which rewrites the cache marker:
     spaces/{spaceId}/contents/cache.json                  (new generation = new cv)
8. All subsequent API requests get a new cv → CDN cache invalidated
```

> **Note:** The publish function itself does not write `cache.json`. The `content.onwrite` trigger (`functions/src/contents.ts`) rewrites it on **every** content write — create, edit, delete, publish, unpublish — so any content edit bumps the content `cv`, not only a publish.

### Content Drafts

Content draft files are written by the `content.onupdate` Firestore trigger on every save of a document (skipped when the update only changes `publishedAt`, i.e. a publish):
```
Storage: spaces/{spaceId}/contents/{contentId}/draft/{locale}.json
```
Draft files are separate from published files. Consumers must pass `?version=draft` to access them.

### Content Unpublish Flow

```
1. Angular calls the content unpublish onCall
2. For a DOCUMENT: deletes spaces/{spaceId}/contents/{contentId}/{locale}.json for every Space locale
   and clears publishedAt on the Firestore document
3. For a FOLDER: does the same for every published document under the folder (batched, BATCH_MAX = 500)
4. The publishedAt write fires content.onwrite → cache.json rewritten → new cv
5. CONTENT_UNPUBLISHED webhook fires
```
Draft files are left in place.

---

## Translation Publish Flow

```
1. User clicks "Publish Translations" in the UI
2. Angular calls Firebase Function (translation-publish onCall)
3. Function reads all Translation documents from Firestore for the Space
4. Function groups by locale, writes flat key/value JSON to Storage:
     spaces/{spaceId}/translations/{locale}.json   (one per locale)
5. Function updates the cache marker:
     spaces/{spaceId}/translations/cache.json      (new generation = new cv)
6. Function writes per-locale translated counts to progress.translations on the Space document
```

---

## Translation Draft Flow

Draft JSON files are kept in sync so consumers can preview unpublished changes via `?version=draft`.

### Frontend saves (add / edit / rename / delete)

```
1. User saves a translation key in the UI
2. Angular TranslationService writes to Firestore
3. On success, TranslationService calls translation-publishdraft onCall
4. Function reads all translations and writes draft JSON to Storage:
     spaces/{spaceId}/translations/draft/{locale}.json
5. Function rewrites spaces/{spaceId}/translations/cache.json (new cv)
```

> Draft generation (`generateTranslationsDraft()` → `saveTranslationFiles()`) always rewrites the translation `cache.json`, so a draft save also bumps the `cv` for published translation requests.

### Import Task (TRANSLATION_IMPORT)

A flat JSON import is the same `TRANSLATION_IMPORT` task kind with `task.locale` set (handled by `translationsImportJsonFlat()`); without `task.locale` it is a full import (`translationsImport()`).

```
1. Task Function writes all rows via a Firestore WriteBatch (chunked in batches of BATCH_MAX = 500)
2. After the batches commit, if totalChanges > 0, Function calls generateTranslationsDraft() once
3. Draft files written for all locales in a single pass (skipped entirely when nothing changed)
```

### CLI Manage API (POST /api/v1/spaces/:spaceId/translations/:locale)

```
1. Manage endpoint writes all rows via a Firestore WriteBatch, committed in chunks of BATCH_MAX = 500 (commitInBatches())
2. After the batches commit, endpoint calls generateTranslationsDraft() once
3. Draft files written for all locales in a single pass
```

> **Note:** There is no Firestore trigger watching translation writes (unlike content, whose drafts are written by `content.onupdate`). Draft generation is always triggered explicitly — either by the frontend calling `translation-publishdraft` or by the import/manage flow calling `generateTranslationsDraft()` directly at the end.

---

## Cache Invalidation

The `cache.json` file is a **cache pointer** — its content is mostly irrelevant, but its Firebase Storage **generation number** is used as the `cv` (cache version).

Every time `cache.json` is overwritten, its generation increments. This is what invalidates the CDN:

```
Old cv = 1234567  →  request redirects to ?cv=1234567  →  CDN has it cached ✓
Publish happens   →  cache.json rewritten  →  generation = 1234999
New request       →  no cv / stale cv      →  redirects to ?cv=1234999  →  CDN miss, fetches fresh
```

After the first cache miss for the new cv, CDN caches the response for up to 7 days (`s-maxage`).

---

## Storage File Structure

```
spaces/{spaceId}/
  contents/
    cache.json                         ← cv pointer for all content
    {contentId}/
      en.json                          ← published English
      de.json                          ← published German
      draft/
        en.json                        ← draft English
        de.json                        ← draft German
  translations/
    cache.json                         ← cv pointer for translations
    en.json                            ← published English translations
    de.json                            ← published German translations
    draft/
      en.json                          ← draft English translations
```

---

## Link & Reference Resolution

Content documents can include `links`, `references`, and `assets` arrays (IDs of other content/assets). The CDN API resolves these on request when the consumer passes:
- `?resolveLink=true` — resolves links to `ContentMetadata` objects
- `?resolveReference=true` — resolves references to content documents, with their own id arrays stripped
- `?resolveAsset=true` — resolves asset IDs to full asset metadata via `resolveAssets()`

Resolution is done at request time. Links and assets are read from Firestore (`spaces/{spaceId}/contents/{id}`, `spaces/{spaceId}/assets/{id}`); only references read additional Storage files (the referenced document's locale JSON). This adds latency but avoids denormalization in Storage.

### The id arrays are storage-only

`links`/`references`/`assets` exist on the **stored** document but are never returned to a consumer:

- **Top level** — the CDN handlers destructure them out and replace them with resolved maps, or omit the keys entirely when the corresponding `resolve*` flag is absent.
- **Inside a `references` map** — `stripStorageIds()` (`functions/src/utils/strip-storage-ids.ts`) removes them, so a resolved reference carries only its metadata, `locale` and `data`.

They are redundant on the wire: each one is a denormalized index of edges that already exist in `data`, since a `REFERENCE` field value is `{ kind: 'REFERENCE', uri }`. A consumer follows a further reference by reading that `uri` and looking it up in the same map — which is also why reference resolution can stay one level deep without losing information.

Do not reintroduce them into a response. `stripStorageIds` uses a rest-destructure so a field added to `ContentDocumentStorage` later is carried through rather than silently dropped, and its tests pin both behaviours.

---

## Implementation Files

- `functions/src/contents.ts` — content `publish`/`unpublish` onCalls, `onupdate` (drafts) and `onwrite` (`cache.json`) triggers
- `functions/src/translations.ts` — `publish` onCall, `publishDraft` onCall
- `functions/src/services/content.service.ts` — `contentLocaleCachePath`, `spaceContentCachePath`
- `functions/src/services/translation.service.ts` — `saveTranslationFiles`, `generateTranslationsDraft`, `translationLocaleCachePath`, `spaceTranslationCachePath`
- `functions/src/tasks.ts` — `translationsImport`, `translationsImportJsonFlat` (call `generateTranslationsDraft` at end)
- `functions/src/v1/manage.ts` — CLI push endpoint (calls `generateTranslationsDraft` at end)

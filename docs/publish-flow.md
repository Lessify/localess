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
6. Function updates the cache marker:
     spaces/{spaceId}/contents/cache.json                  (new generation = new cv)
7. All subsequent API requests get a new cv → CDN cache invalidated
```

### Draft Publish

When publishing a draft (with a `version` parameter):
```
Storage: spaces/{spaceId}/contents/{contentId}/draft/{locale}.json
```
Draft files are separate from published files. Consumers must pass `?version=draft` to access them.

---

## Translation Publish Flow

```
1. User clicks "Publish Translations" in the UI
2. Function reads all Translation documents from Firestore for the Space
3. Function groups by locale, writes flat key/value JSON to Storage:
     spaces/{spaceId}/translations/{locale}.json   (one per locale)
4. Function updates the cache marker:
     spaces/{spaceId}/translations/cache.json      (new generation = new cv)
```

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

Content documents can include `links` and `references` arrays (IDs of other content). The CDN API resolves these on request when the consumer passes:
- `?resolveLink=true` — resolves links to `ContentLink` objects
- `?resolveReference=true` — resolves references to full `ContentDocumentApi` objects

Resolution is done at request time by reading additional Storage files. This adds latency but avoids denormalization in Storage.

---

## Implementation Files

- `functions/src/contents.ts` — publish content Firebase Function
- `functions/src/translations.ts` — publish translations Firebase Function
- `functions/src/services/content.service.ts` — `contentLocaleCachePath`, `spaceContentCachePath`
- `functions/src/services/translation.service.ts` — `translationLocaleCachePath`, `spaceTranslationCachePath`

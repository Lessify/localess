# Localess — Domain Concepts

> Related: [CDN & Caching](cdn-caching.md) · [Publish Flow](publish-flow.md) · [Auth Tokens](auth-tokens.md)

## Space

A **Space** is the top-level workspace and the root of all data in Localess. Every resource (content, translation, schema, asset, task, token) belongs to exactly one Space.

```
Firestore: spaces/{spaceId}
```

Key properties:
- `locales` — list of supported locales (e.g. `[{ id: 'en' }, { id: 'de' }]`)
- `localeFallback` — the default locale used when a requested locale has no data
- `overview` — aggregated counts and sizes (denormalized for dashboard display)

---

## Schema

A **Schema** defines the structure of a Content document — it is the content type definition.

```
Firestore: spaces/{spaceId}/schemas/{schemaId}
```

Three schema types:
| Type | Purpose |
|------|---------|
| `ROOT` | Top-level page schema (used as the root of a Content document) |
| `NODE` | Reusable nested component (embedded inside ROOT or other NODEs) |
| `ENUM` | A fixed set of named values (used in option/select fields) |

Field kinds: `TEXT`, `TEXTAREA`, `RICH_TEXT`, `MARKDOWN`, `NUMBER`, `COLOR`, `DATE`, `DATETIME`, `BOOLEAN`, `OPTION`, `OPTIONS`, `SCHEMA` (single node), `SCHEMAS` (array of nodes), `LINK`, `REFERENCE`, `REFERENCES`, `ASSET`, `ASSETS`.

New spaces can be created from a template that seeds a ready-made set of schemas — see [Admin → Spaces](features/admin/admin-spaces.md#space-templates).

---

## Content

A **Content** is either a `FOLDER` (organisational) or a `DOCUMENT` (actual page/entry).

```
Firestore: spaces/{spaceId}/contents/{contentId}
Storage:   spaces/{spaceId}/contents/{contentId}/{locale}.json        ← published
           spaces/{spaceId}/contents/{contentId}/draft/{locale}.json  ← draft
           spaces/{spaceId}/contents/cache.json                        ← cv pointer
```

Key properties on a `ContentDocument`:
- `schema` — references a Schema by ID
- `slug` — URL-safe segment for this node
- `fullSlug` — full path from root (e.g. `blog/2024/my-post`)
- `parentSlug` — parent's fullSlug (used for tree queries)
- `data` — the content payload (typed by the Schema)
- `assets`, `links`, `references` — IDs of related resources for resolution

### How localised values are stored

One `data` payload holds every locale. Which key a value lives under depends on the locale:

| locale | key | example |
|---|---|---|
| **default** | the **bare field name** | `title` |
| any other | `{fieldName}_i18n_{localeId}` | `title_i18n_de` |

```jsonc
{
  "_id": "…", "schema": "page",
  "title": "Hello",             // default locale
  "title_i18n_de": "Hallo",     // German
  "title_i18n_fr": "Bonjour"    // French
}
```

Three consequences follow, and all of them are load-bearing:

**The default locale is the fallback value.** It sits in the bare key precisely so a reader can ask
for `_i18n_<locale>` and fall back to it when the translation is missing. `extractContent()` — the
publish/serve path, in both `ContentHelperService` and `functions/src/services/content.service.ts` —
does exactly that, which is why an untranslated field still serves content rather than a blank.

**The editor deliberately does *not* fall back.** `extractSchemaContent()` returns the locale's own
value, empty if absent, so an author can see what is still untranslated. The default value is shown
as the input's *placeholder* instead — visible, but not mistaken for a real translation.

**`default` is a storage sentinel, not a language.** `CONTENT_DEFAULT_LOCALE.id` is the literal
string `default`, and `availableLocales` rewrites the space's `localeFallback` to it (labelled
"English (Default)"). So the id that identifies the bare key is never a language code. Anything
talking to a translation provider must resolve it first — see `toProviderLocale()` in
`locale.model.ts` and [Contents → AI translation](features/spaces/contents.md#ai-translation).

**`_i18n_` is reserved.** Schema field names are rejected if they contain it, on both sides:
`CommonValidator.SCHEMA_FIELD_NAME_TRANSLATION` in the UI and a `refine` in
`functions/src/models/schema.zod.ts`. A field called `title_i18n_de` would be indistinguishable
from a German translation of `title`.

> Any code that reads or writes a localised value applies the table above — writing the default to
> `title_i18n_default` produces a key nothing reads, and reading the default from that key finds
> nothing.

The rule is enforced by tests at every site that applies it, so a regression fails the build rather
than reaching the API:

| site | guarded by |
|---|---|
| serve/publish (functions) | `services/content.service.test.ts` |
| serve/publish (frontend) | `content-helper.service.spec.ts` → `extractContent` |
| editor form ← data | `content-helper.service.spec.ts` → `extractSchemaContent` |
| editor form → data | `edit-document-schema.component.spec.ts` → `writing form values back to data` |
| whole-document translation | `content-helper.service.spec.ts` → `collectTranslatableFields` |
| per-field translation | `markdown-editor` / `rich-text-editor` specs |
| `previewField` | `edit-document-schema.component.spec.ts` → `previewText` |
| reserved `_i18n_` in field names | `schema.validator.spec.ts` (UI), `schema.zod.test.ts` (functions) |

> See [Publish Flow](publish-flow.md) for how drafts become published JSON files.

---

## Translation

A **Translation** is a key/value localisation entry. It is **not** tied to a Schema — it is a flat key store for UI strings.

```
Firestore: spaces/{spaceId}/translations/{translationId}
Storage:   spaces/{spaceId}/translations/{locale}.json        ← published
           spaces/{spaceId}/translations/draft/{locale}.json  ← draft
           spaces/{spaceId}/translations/cache.json            ← cv pointer
```

Three translation types:
| Type | Structure |
|------|-----------|
| `STRING` | Single string per locale |
| `PLURAL` | Locale-keyed plural forms |
| `ARRAY` | Array of strings per locale |

---

## Asset

An **Asset** is either a `FOLDER` or a `FILE` stored in Firebase Storage.

```
Firestore: spaces/{spaceId}/assets/{assetId}
Storage:   spaces/{spaceId}/assets/{assetId}/original   ← raw file
```

The CDN endpoint (`/api/v1/spaces/:spaceId/assets/:assetId`) supports:
- `?w=<px>` — resize images on-the-fly via Sharp
- `?thumbnail=true` — extract first frame of animated GIF/WebP or video thumbnail
- `?download` — force `Content-Disposition: attachment`

> Assets are referenced from Content documents via `ASSET` / `ASSETS` schema fields.

---

## Task

A **Task** is a background job (e.g. bulk publish, import, export). Tasks are queued in Firestore and executed by Firebase Functions.

```
Firestore: spaces/{spaceId}/tasks/{taskId}
```

---

## Token

An API token grants programmatic access to the public CDN API. See [Auth Tokens](auth-tokens.md) for the full permission model.

---

## Firestore Collection Map

```
spaces/
  {spaceId}/
    contents/
      {contentId}
        history/
          {historyId}
    translations/
      {translationId}
    schemas/
      {schemaId}
    assets/
      {assetId}
    tasks/
      {taskId}
    tokens/
      {tokenId}
    translations-history/
      {historyId}
```

> When a Space is deleted, `firestoreService.recursiveDelete()` removes the space document and all nested subcollections in one call.
> When a Content document is deleted, `firestoreService.recursiveDelete()` removes the content document and its `history` subcollection. Child folder contents (sibling documents referencing the folder via `parentSlug`) are cascade-deleted via the `onContentDelete` trigger.

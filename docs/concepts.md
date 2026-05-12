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
```

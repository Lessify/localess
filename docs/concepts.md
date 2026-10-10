# Localess — Domain Concepts

> Related: [CDN & Caching](cdn-caching.md) · [Publish Flow](publish-flow.md) · [Auth Tokens](auth-tokens.md)

## Space

A **Space** is the top-level workspace and the root of all data in Localess. Every resource (content, translation, schema, asset, task, token) belongs to exactly one Space.

```
Postgres: spaces (id)
```

Key properties:
- `locales` — the space's locales in their order (`space_locales`: `position`, `created_at`), picked from the `locales` table,
  which migrations seed and change (the API only reads it, `GET /api/app/locales`)
- `defaultLocale` — `default_locale_id`: new translations are created in it, content stores its values in the bare field,
  and a locale with no value falls back to it (one of the space's locales, checked by the API)
- `content_version` / `translation_version` — counters bumped on every change; the public API's [`cv`](cdn-caching.md)

---

## Schema

A **Schema** defines the structure of a Content document — it is the content type definition.

```
Postgres: schemas (id uuid, space_id, name)   ← name: user-chosen, unique per space
```

`id` is a UUIDv7 the App API uses to address the row. Everything else refers to a schema by its **name**:
`contents.schema`, `_schema` in content data, `schemas`/`source` of fields, exports, the SDK and Code as Source
(where the name is carried as `id`). Renaming changes only `name`; references to the old name are not rewritten.

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
Postgres: contents (space_id, id)                       ← draft source; drafts are built on read
          content_published (space_id, content_id, locale) ← published snapshot, one per locale
          spaces.content_version                           ← cv
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
  "_id": "…", "_schema": "page",
  "title": "Hello",             // default locale
  "title_i18n_de": "Hallo",     // German
  "title_i18n_fr": "Bonjour"    // French
}
```

Three consequences follow, and all of them are load-bearing:

**The default locale is the fallback value.** It sits in the bare key precisely so a reader can ask
for `_i18n_<locale>` and fall back to it when the translation is missing. `extractContent()` — the
publish/serve path, in both `features/spaces/contents/shared/content.utils.ts` and `apps/server/src/modules/contents/content-extract.ts` —
does exactly that, which is why an untranslated field still serves content rather than a blank.

**The editor deliberately does *not* fall back.** `extractSchemaContent()` returns the locale's own
value, empty if absent, so an author can see what is still untranslated. The default value is shown
as the input's *placeholder* instead — visible, but not mistaken for a real translation.

**`default` is a storage sentinel, not a language.** `CONTENT_DEFAULT_LOCALE.id` is the literal
string `default`, and `availableLocales` rewrites the space's `defaultLocale` to it (labelled
"English (Default)"). So the id that identifies the bare key is never a language code. Anything
talking to a translation provider must resolve it first — see `toProviderLocale()` in
`locale.model.ts` and [Contents → AI translation](features/spaces/contents.md#ai-translation).

**`_i18n_` is reserved.** Schema field names are rejected if they contain it, on both sides:
`CommonValidator.SCHEMA_FIELD_NAME_TRANSLATION` in the UI and a `refine` in
`packages/shared/src/models/schema.zod.ts`. A field called `title_i18n_de` would be indistinguishable
from a German translation of `title`.

**Not every field kind can be translatable.** `translatable` lives on `SchemaFieldTranslatable`,
mixed into every kind except `REFERENCE`, `REFERENCES`, `SCHEMA` and `SCHEMAS` — their value is
shared by every locale, and nested blocks translate their own fields. Read it through
`isFieldTranslatable()` (in both `schema.model.ts` files), never `field.translatable`: it also
ignores a leftover flag that schemas pushed through the API before the push started stripping it
can still carry. A non-translatable field is read-only outside the default locale; reference and
asset pickers keep their controls enabled to show the shared value but take `[locked]`, and
`EditDocumentSchemaComponent` never writes a non-translatable field back from another locale.

**Only `_`-prefixed keys are internal.** A block's identity lives in `_id` and `_schema`, and those
two are the only reserved field names, so `schema` is an ordinary field name. Blocks stored before
`_schema` existed carry the schema id under a legacy `schema` key instead. It is never served:
`extractContent()` on the server reads it only as a fallback (`contentSchemaId()`), and the
editor's `normalizeContent()` moves it to `_schema` on load, so the next save migrates the block.

> Any code that reads or writes a localised value applies the table above — writing the default to
> `title_i18n_default` produces a key nothing reads, and reading the default from that key finds
> nothing.

The rule is enforced by tests at every site that applies it, so a regression fails the build rather
than reaching the API:

| site | guarded by |
|---|---|
| serve/publish (server) | `apps/server/src/modules/contents/content-extract.test.ts` |
| serve/publish (frontend) | `features/spaces/contents/shared/content.utils.spec.ts` → `extractContent` |
| editor form ← data | `features/spaces/contents/shared/content.utils.spec.ts` → `extractSchemaContent` |
| editor form → data | `edit-document-schema.component.spec.ts` → `writing form values back to data` |
| whole-document translation | `features/spaces/contents/shared/content.utils.spec.ts` → `collectTranslatableFields` |
| per-field translation | `markdown-editor` / `rich-text-editor` specs |
| `previewField` | `edit-document-schema.component.spec.ts` → `previewText` |
| reserved `_i18n_` in field names | `schema.validator.spec.ts` (UI), `schema.zod.test.ts` (server) |

> See [Publish Flow](publish-flow.md) for how drafts become published snapshots.

---

## Translation

A **Translation** is a key/value localisation entry. It is **not** tied to a Schema — it is a flat key store for UI strings.

```
Postgres: translations (id uuid, space_id, key)   ← key: the translation key, unique per space; locales jsonb; drafts built on read
          translation_published (space_id, locale) ← published flat key/value map
          spaces.translation_version             ← cv
```

`id` is a UUIDv7 the App API uses to address the row; the public API, the SDK, the CLI and export files use the
**key** (export files carry it as `id`). Renaming changes only `key`.

Three translation types:
| Type | Structure |
|------|-----------|
| `STRING` | Single string per locale |
| `PLURAL` | Locale-keyed plural forms |
| `ARRAY` | Array of strings per locale |

---

## Asset

An **Asset** is either a `FOLDER` or a `FILE`. Metadata is a Postgres row; the file lives in the server's storage directory (`LOCALESS_STORAGE_DIR`, default `$LOCALESS_DATA_DIR/storage`).

```
Postgres: assets (space_id, id uuid, legacy_id)                   ← parent_path = slash-joined ancestor folder ids
Storage:  spaces/{spaceId}/assets/{assetId}/original               ← raw file
          spaces/{spaceId}/assets/{assetId}/renditions/…           ← cached image transforms
```

The CDN endpoint (`/api/v1/spaces/:spaceId/assets/:assetId`) supports:
- `?w=<px>` — resize images on-the-fly via Sharp
- `?thumbnail=true` — extract first frame of animated GIF/WebP or video thumbnail
- `/api/v1/spaces/:spaceId/assets/:assetId/download` — the stored bytes as `Content-Disposition: attachment` (the old `?download` flag was removed and now returns `400`); `/original` serves them inline when the type is safe to render; HTML, XML and unknown types are always served as attachments (see [assets.md](features/spaces/assets.md))

> Assets are referenced from Content documents via `ASSET` / `ASSETS` schema fields.

---

## Task

A **Task** is a background job (import, export, asset metadata regeneration). The `tasks` table is the queue: the server's `TaskWorker` claims the oldest `INITIATED` task and runs it (see [Tasks](features/spaces/tasks.md)).

```
Postgres: tasks (id), task_logs (task_id)
Storage:  spaces/{spaceId}/tasks/{taskId}/original   ← import upload / export archive
```

---

## Token

An API token (`tokens` table; the `token` column is the secret, `id` a UUIDv7) grants programmatic access to the public CDN API. See [Auth Tokens](auth-tokens.md) for the full permission model.

---

## Data Model Map

All tables are defined in `apps/server/src/infra/database/schema.ts` (Drizzle; migrations in `apps/server/drizzle/`). Spaces, users, tokens, webhooks, webhook logs, schemas, translations, assets and contents have UUIDv7 ids (`uuid` columns, `newUuid()`). What everything else refers to stays human readable where it already was: a schema's `name`, a translation's `key`, a token's secret `token`. A space imported from Firebase (Admin → Spaces → Import from Firebase, [design](roadmap/firebase-space-import.md)) keeps its Firestore id in `spaces.legacy_id` (unique: one import per Firebase space), and its assets keep theirs in `assets.legacy_id`, so the space's old asset URLs redirect to the UUID ones; every other reference is rewritten to the new UUIDs during the import. Content and asset keys are `(space_id, id)`: the export/import tasks reuse ids in another space. JSON-shaped parts (`contents.data`, `schemas.fields`, `translations.locales`, `assets.metadata`) are `jsonb`; timestamps are `timestamptz` and the API returns ISO strings.

```
settings                          single row: global UI settings
users                             role, permissions, lock, disabled
  user_credentials                password hash (argon2id)
  user_identities                 Google / Microsoft sign-in links
  sessions, password_reset_tokens
locales                           every locale a space can use (seeded by migrations, read-only API)
spaces                            default_locale_id, content/translation_version
  space_locales     (space_id, locale_id)   position, created_at
  space_environments (id)                   Visual Editor previews: name, url, position
  contents          (space_id, id)
    content_published (space_id, content_id, locale)
  translations      (space_id, id)
  translation_published (space_id, locale)
  schemas           (space_id, id)
  assets            (space_id, id)
  tasks             (id)
    task_logs
  tokens            (id)
  webhooks          (id)
    webhook_logs
```

Storage (`LOCALESS_STORAGE_DIR`) holds only binaries:

```
spaces/{spaceId}/assets/{assetId}/original
spaces/{spaceId}/assets/{assetId}/renditions/…
spaces/{spaceId}/tasks/{taskId}/original
```

> Every space-owned table references `spaces` with `on delete cascade`, so deleting a Space removes all its rows in one statement; the server then deletes the `spaces/{spaceId}/` storage prefix.
> Deleting a content FOLDER deletes its whole subtree (`parent_slug` equal to or under the folder's `full_slug`) in the same transaction, and `content_published` rows cascade. Renaming or moving a folder rewrites its descendants' slugs in one statement.

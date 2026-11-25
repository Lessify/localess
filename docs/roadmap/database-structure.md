# Database structure review

Reviewing the Postgres schema (`apps/server/src/infra/database/schema.ts`) table by table: why each column exists, what to
keep, what to move. Decisions are listed per table; open items are under [To do](#to-do).

## Users and sign-in

```
users (id PK): email (unique on lower(email)), email_verified, display_name, photo_url, disabled, role,
       lock, created_at, updated_at
user_credentials (user_id PK → users CASCADE): password_hash, hash_algo, updated_at
user_identities (PK provider + provider_subject, user_id → users CASCADE): created_at
sessions (id = sha256 of the cookie, user_id → users CASCADE): expires_at, last_seen_at, user_agent, ip, created_at
password_reset_tokens (token_hash PK, user_id → users CASCADE): expires_at, used_at, created_at
```

| Column / rule | Decision |
|---|---|
| `sessions`, `password_reset_tokens` | **Cleaned up** by `AuthCleanupService` at start and every hour: sessions past `expires_at`, reset tokens used or expired over a day ago (a link that expired recently still answers "expired"). |
| `users.lock` | **Enforced by the server**: a locked user's own profile can be read but not changed (403 on the name/photo, email and password updates); the profile page hides those actions. It does not block sign-in (that is `disabled`). |
| `users.email_verified` | **Kept as information**: the address was confirmed by an identity provider (an OIDC sign-in) or set by the first-admin seed; an email change resets it. There is no verification email, and sign-in does not depend on it (OIDC linking checks the provider's own claim). |
| `user_credentials.hash_algo` | One value (`argon2id`) today; the column leaves room for a future algorithm and rehash on sign-in. |

## `tokens`

```
tokens (id PK, space_id → spaces CASCADE): type (CHECK), name, token, token_hash (unique), hint, cache_ttl,
        created_at, updated_at
```

| Column / rule | Decision |
|---|---|
| `type` | `public`, `preview` or `management` (lower case, `tokens_type_check`); replaces the `permissions` array and the old `version`. Never changes: the value's prefix (`pub_`, `prv_`, `mgt_`) names it. See [Auth Tokens](../auth-tokens.md). |
| `token_hash` | `sha256(value)`, unique; every lookup goes through it. |
| `token` | **Plain text for `public`/`preview`** (the editor reads it for its API links, and these tokens are handed to websites); **`null` for `management`** (`tokens_token_check`), whose value is shown once. |
| `hint` | Prefix and last 4 characters, for the list. |
| `cache_ttl` | CDN tokens only (`tokens_cache_ttl_check`). |
| Auto Generated Preview Token | Every space starts with one, written with the space (`createPreviewToken`, `shared/data-rules/space-tokens.ts`); the Firebase import does the same. Tokens are not imported. |
| `tokens_permissions_idx` (GIN) | **Dropped**: a space has a handful of tokens, filtered through `tokens_space_idx`. |

## Webhooks

```
webhooks (id PK, space_id → spaces CASCADE): name, url, enabled (default false), events (CHECK), headers, secret,
          created_at, updated_at
webhook_logs (id PK, webhook_id → webhooks CASCADE): event (CHECK), url, status, status_code, status_text, error_type,
              error_message, request_size, data, delivery_id, duration, response_body, response_body_truncated, created_at
```

| Column / rule | Decision |
|---|---|
| `webhook_logs` retention | **Deleted after `LOCALESS_WEBHOOK_LOG_DAYS`** (30 by default) by `WebhookLogCleanupService`, at start and every hour. |
| Logs listing | **100 newest by default**, `?limit=` up to 1000. |
| `webhook_logs.event` | **CHECK** of the known events, like `status` and `error_type`. |
| `webhook_logs.data` | Typed `WebHookPayloadData` (only the dispatcher writes it). |
| `webhooks_events_idx` (GIN) | **Dropped**: a space has a handful of webhooks, found through `webhooks_space_idx`. |
| `secret`, `headers` | Plain text: the secret signs every delivery (HMAC), headers are sent as they are. |

## `spaces`

| Column | Decision |
|---|---|
| `id`, `name`, `created_at`, `updated_at` | Keep. |
| `legacy_id`, `import_status` | **Moved** to the space's `firebase_imports` row ([Firebase import](#firebase-import)). |
| `locales` jsonb | **Replaced** by `locales` + `space_locales` (below). |
| `locale_fallback` jsonb | **Replaced** by `default_locale_id` (below). |
| `environments` jsonb | **Replaced** by `space_environments` (below). |
| `overview`, `progress` jsonb | **Dropped**: the dashboard numbers are computed on request ([Overview](#overview)). |
| `content_version` | **Dropped**: content answers to its snapshots' `built_at` ([Content snapshots](#content-snapshots)). |
| `translation_version` | **Dropped**: translations answer to their snapshot's `built_at` ([Translation snapshots](#translation-snapshots)). |
| `spaces_name_idx` | **Dropped**: it serves only the admin list, a handful of rows. |

Spaces are listed by `lower(name), id`: case-insensitive whatever the database collation, stable for equal names.

### Firebase import

```
firebase_imports (…, source_space_id, space_id → spaces CASCADE, UNIQUE (space_id),
                  UNIQUE (source_space_id) WHERE space_id IS NOT NULL)
```

A space imported from Firebase is linked to its one run (one-to-one); the space has no import columns of its own.

- **Import status:** the run's `status`, joined in: the space reads `IMPORTING` while the run is `RUNNING`,
  `FAILED` after a failed run, nothing once it finished. The public API's space lookup joins the run in the same
  query (503 while importing or failed).
- **Legacy id:** the run's `source_space_id` (the Firestore id) resolves the old asset URLs; one local space per
  Firebase space. `assets.legacy_id` stays: it is per asset.
- **Deleting the space deletes its run**, so the Firebase space can be imported again. A run that failed before
  creating its space stays in the history.
- A failed space is not resumed: the UI says to delete it and import again.
- **A failed run's error is kept once**, on its `FAILED` stage in `stages`; the `error` column is **dropped** (it held
  the same stage and message). The App API still sends `error: { stage, message }`, read from that stage.
- `firebase_imports_started_idx` is **dropped**: the run history is a handful of rows per install.
- Runs are kept: an import is rare, and deleting the space deletes its run.

### Locales

```
locales        (id text PK, name text)                       -- every locale a space can use
space_locales  (space_id → spaces CASCADE, locale_id → locales RESTRICT,
                position int, created_at, PK (space_id, locale_id))
```

- `locales` is pure database data: seeded and changed only by migrations (the seed is `drizzle/0001_locales.sql`, applied on a new database's first boot). The App API only reads it
  (`GET /api/app/locales`); nothing creates, edits or deletes a locale through the API. It replaces `AVAILABLE_LOCALES`
  in `@localess/shared` (the Google/DeepL support lists stay there: they describe the providers, not the list).
- A space adds a locale by id; an id not in `locales` is refused. `position` orders a space's locales (users can
  reorder them), `created_at` records when it was added.
- A Firebase space's locales that are not in `locales` are skipped by the import, which reports them: their values
  stay in the data, unread, until locale deletion is designed. (The schema change itself regenerates `0000_init.sql`,
  as every change has before the first release; existing development databases are recreated.)
- The locale flags (`tools/scripts/generate-locale-flags.mjs`) cover every ISO region, independent of the list.

### Default locale

`spaces.default_locale_id` (→ `locales`) replaces `locale_fallback`, renamed **everywhere, the v1 API included**
(`localeFallback` → `defaultLocale`; a breaking change for clients reading `localeFallback`). It is the default in both
features, and the fallback follows from that:

- **Translations:** new keys are created with their value in the default locale (the other locales are
  auto-translated from it); a locale with no value is served the default locale's value.
- **Contents:** the default locale's value is the bare field (`title`), other locales are `title_i18n_<locale>`
  (see [concepts.md](../concepts.md#how-localised-values-are-stored)); a locale with no value falls back to the bare field.

That it is one of the space's locales is enforced by the API, not the database: the service checks it (400), and the
repository checks it again under the space's row lock (`changeSpace`), so a removal and a change of the default at the
same moment can not leave a default outside the space's locales (the one overtaken answers 409). Changing it asks for confirmation
and warns that the content's bare values are then read as the new locale (they are not moved).

Translation values are written only for the space's locales: creating a translation, updating a locale value,
Translate Locale and the import refuse (or skip) any other locale; v1 push already did.

### Environments

```
space_environments (id uuid PK, space_id → spaces CASCADE, name, url, position int, created_at, updated_at)
```

Managed one by one (create, edit, delete, reorder); names may repeat. The editor remembers the selected environment by
its id; the first by `position` is the default.

### Overview

`GET /api/app/spaces/:spaceId/overview` computes the dashboard on every request (any role): counts (locales, translation
keys, asset files, content documents, schemas), storage (the sum of `assets.size`; files without a size counted apart)
and translation progress per locale against the number of keys, on the current values. Tasks and the sizes of the
published JSON are no longer shown. See [dashboard.md](../features/spaces/dashboard.md).

## Translations

```
translations (id PK, space_id → spaces CASCADE, key unique per space): locales, labels, description, created_at, updated_at
```

| Column / rule | Decision |
|---|---|
| `type` | **Dropped**, with `TranslationType`: translations are plain text. `PLURAL` and `ARRAY` (JSON inside the string, no editor, unchecked) had no users. Export files no longer carry `type`; older files with it still import. The Firebase import drops it and keeps the value as stored. |
| `key` | **One rule** (`isTranslationKey`, `@localess/shared`), checked where a key is created or renamed: App API, CLI push `add-missing`, import tasks. Existing keys are updated whatever their form; the Firebase import keeps keys as they are. |
| `locales` values | **At most 10,000 characters** (`TRANSLATION_VALUE_MAX_LENGTH`) on every write path and in the editor. |
| `labels`, `description` | Keep (empty stored as null). |

## Translation snapshots

```
translation_snapshots (space_id → spaces CASCADE, version 'draft' | 'published', locale, data json, built_at)
                      PK (space_id, version, locale)
```

Replaces `translation_published` and `spaces.translation_version`. One table for both stages of the flat `{key: value}`
map the public API serves per locale (gaps filled from the default locale):

- **`cv` = `built_at`** in epoch milliseconds (`timestamp(3)`). No counter: a `built_at` always names the same data, so
  a backup restore never makes a cached `cv` serve other data.
- **Published:** a publish replaces every locale's map, all with one `built_at`.
- **Draft:** built lazily. A translation write, a change of the space's locales or of its default locale drops the
  space's draft maps; the first draft request after it builds every locale at once. An edit therefore never moves the
  published `cv` (published URLs stay cached while a team edits), and a publish never moves the draft one.
- **Lock:** writes, publishes and draft builds of one space take `pg_advisory_xact_lock` named for the space's
  translations (not the `spaces` row: renaming a space or a content write doesn't wait on it). Without it a build could
  read the rows, an edit commit and drop the drafts, and the build then store the map read before the edit.
- **Removed locale:** both of its maps are deleted; requests for it get the default locale's.
- **`data` is `json`, not `jsonb`:** jsonb reorders keys (by length); the map keeps them in byte order. Never queried
  inside.

## `contents`

```
contents PK (space_id, id): parent_id, kind FOLDER|DOCUMENT, name, slug, schema, data, assets[], links[], references[],
         published_at, created_at, updated_at
         FK (space_id, parent_id) → contents (space_id, id) ON DELETE CASCADE
         UNIQUE NULLS NOT DISTINCT (space_id, parent_id, slug)
```

The tree is linked by `parent_id` (null: root); see [Content and asset trees](content-asset-tree.md).

| Column / rule | Decision |
|---|---|
| `parent_id` | **The structure, held by the database.** The foreign key keeps every child with its parent: a create in a folder being deleted fails or is taken by the delete, never left behind; deleting a folder cascades to its subtree (and their snapshots). The parent being a folder is checked by the code (`kind` never changes). |
| `slug` | **Unique among siblings** (`contents_slug_idx`, root being one parent). A clash, even with a write that commits at the same moment, is a 409 "'x' is already used". |
| Paths | **Computed, never stored** (`parent_slug` and `full_slug` are dropped; `shared/queries/content-tree.query.ts`): lists from one map of every folder of the space, a lookup by path segment by segment, a subtree or the ancestors by a recursive query. A rename or move changes one row; it drops the drafts of everything under the item. |
| Folder moves | Under the contents lock, the target must not be the folder or under it (400 "A folder cannot be moved into itself"). |
| Firebase import | Rows go in at the root under a placeholder slug, page by page; after the last page the tree is linked by the Firebase paths. A slug used twice under a parent is suffixed, a missing parent folder leaves the item at the root, each with a warning. |
| Content export / import tasks | Switched off until their redesign ([Import / Export](import-export.md)). |
| `data` | **Typed `ContentData`, checked on every write** (`zContentData` in `@localess/shared/zod`): the root and every block carry `_id` and `_schema`, and each value is one of the shapes the editor stores (string, number, boolean, string[], LINK / REFERENCE / ASSET and their arrays, TipTap JSON, a block, blocks). `PUT …/data` answers 400 naming the path otherwise. The Firebase import brings old data to that shape: a block's legacy `schema` key moves to `_schema`, a root without `_id`/`_schema` gets them, a link without a target gets `_self`, `null`s and empty arrays go, anything else is dropped with a warning. Checking values against the schema's fields is a [To do](#to-do). |

## Content snapshots

```
content_snapshots      (space_id, content_id → contents CASCADE, version 'draft' | 'published', locale, data json, built_at)
                       PK (space_id, content_id, version, locale)
content_link_snapshots (space_id → spaces CASCADE, version 'draft' | 'published', data json, built_at)
                       PK (space_id, version)
```

Replace `content_published` and `spaces.content_version`, following the [translation snapshots](#translation-snapshots):
what the public API serves for content is stored, and each row is its own `cv`.

- **`cv` = `built_at`** in epoch milliseconds (`timestamp(3)`), per document, locale and stage, and per `/links` list.
  Nothing is versioned per space.
- **Published document:** a publish writes every space locale of the document with one `built_at`. Unpublish deletes
  them. A rename or move keeps them (they hold the old path until the next publish; the slug lookup uses the live
  tree).
- **Draft document:** built on the first draft request for its locale after a write of the document (data, rename,
  move; a folder's move for everything under it) dropped its drafts. **A schema write drops nothing**: a draft keeps the
  schemas it was built with until its document changes, as a schema change only shows in the editor's form until then.
  Asset writes move no `cv` either.
- **Space locales:** a removed locale's snapshots go, draft and published; a default locale change drops every draft
  (the bare fields hold the old default's values); an added locale stores nothing (published requests get the default
  locale's snapshot until the next publish).
- **`/links`:** `draft` lists every folder and document, `published` every folder and the published documents (the live
  rows, filtered); `version` needs a draft permission, like a document draft. Any content write (data, publish and
  unpublish included) drops both lists; filters (`parentSlug`, `excludeChildren`, `kind`) are applied to the stored list.
- **Lock:** writes that drop snapshots and the builds of one space take `pg_advisory_xact_lock` named for the space's
  contents, for the same reason as translations.
- **`data` is `json`, not `jsonb`:** keeps the document's field order. Never queried inside.
- **`resolve*`:** resolved per request, cached under the document's `cv` (see the [To do](#to-do)).

## `assets`

```
assets PK (space_id, id): parent_id, kind FOLDER|FILE, name, extension, type, size, md5,
       alt, source, metadata, legacy_id
```

| Column / rule | Decision |
|---|---|
| `in_progress` | **Dropped**: an upload stores the file, then creates the row, and answers the asset DTO; nothing was ever in progress. |
| `legacy_id` | **Kept** on the table: old (Firestore) asset URLs answer 301 to the UUID one, and the asset export/import task carries it. |
| `parent_id` | **The structure, held by the database** ([Content and asset trees](content-asset-tree.md)): a foreign key with cascade (a folder delete takes its subtree, whose files are queued first), so a move is one row; files and folders move, a folder not under itself (400). Names may repeat in a folder. Every asset write takes the space's assets lock first. |
| File vs folder fields | **Enforced by the API**, not a CHECK: a new folder takes `parentId` and `name` only (file fields → 400), a folder takes no alt text, and every uploaded file has a name, a `type` and an `extension` (`''` when the name has none). `size` / `md5` stay nullable: files imported without their bytes have none. |
| Deleting a used asset | **Allowed, with a warning**: `GET …/assets/:id/usage` counts the contents whose draft data references the file (or any file under the folder); the delete dialog shows it. Refusing is a [To do](#to-do). |

## Storage deletions

```
storage_deletions (prefix PK, space_id, asset_id null, not_before, attempts, last_error, created_at)
```

Stored files are never deleted inline: a delete queues their prefixes in its own transaction and the sweeper removes
them, so a crash or a storage failure between the row and the files never leaves files no row points at
(`shared/data-rules/storage-deletions.ts`, `shared/services/storage-sweeper.service.ts`).

- **Queued by:** an asset delete (one entry per deleted file, folders included), a space delete (`spaces/{s}/`, all of
  it).
- **Uploads** store the file before the row: they first queue their own prefix due in an hour (a guard), and the row's
  transaction drops it. A request that dies in between leaves only the guard, which the sweeper clears an hour later.
  The asset import task does the same; the Firebase import does not need it (its space is new, and deleting a failed
  one queues the whole space).
- **The sweeper** runs at start, then every hour (`@nestjs/schedule`), and a delete kicks it right after its commit,
  so files normally go at once. It takes one due entry at a time (`FOR UPDATE SKIP LOCKED`: several instances never
  take the same one), deletes the prefix only when nothing owns it any more (no asset row, or no space row; otherwise
  the entry just goes), and on a storage failure keeps the entry with its error, retried after 1 min, 5 min, 30 min,
  then 6 h.
- **No foreign keys:** the space or asset is already gone when its files are deleted.

## `schemas`

```
schemas PK id: space_id (FK, cascade), name (unique per space), type ROOT|NODE|ENUM, display_name, description,
        labels, preview_field, fields (jsonb SchemaField[]), values (jsonb SchemaEnumValue[]), created_at, updated_at
```

`space_id` is the only foreign key. Everything else refers to a schema by `name`, without a constraint:
`contents.schema` (ROOT), `_schema` in content data (NODE), a field's `schemas` (SCHEMA/SCHEMAS) and `source`
(OPTION/OPTIONS → an ENUM). Every write bumps the space's content `cv`.

| Column / rule | Decision |
|---|---|
| `fields`, `values` | **Validated on every write path** with the shared zod schemas (`schemaFieldSchema`, `schemaEnumValueSchema`): the app's update, templates, the CLI push, the schema import task. Keys a field kind does not have are dropped. The columns are typed `SchemaField[]` / `SchemaEnumValue[]`, and `toSchema` maps them without a cast. |
| Columns of the other type | **Not stored:** ROOT/NODE keep `fields` and `preview_field`, ENUM keeps `values`; what does not belong to the type is cleared on write (the type never changes). |
| Rules across fields | **Checked on every write path** (`checkSchemaFields`, `shared/utils/schema.utils.ts`; 400 saying which): field names unique within a schema (case-sensitive); `preview_field` empty or one of its fields of a previewable kind (`SCHEMA_PREVIEW_FIELD_KINDS` in `@localess/shared`, the editor's list too); `schemas` (SCHEMA/SCHEMAS) only existing NODE schemas, a NODE may allow itself; `source` (OPTION/OPTIONS) an existing ENUM. The app update checks against the space's schemas; templates, the CLI push and the schema import task against the schemas as they will be (a push may create a NODE and a field referring to it at once). The write locks the schemas its fields refer to (`lockSchemaReferences`, `FOR SHARE`) and writes nothing when one went since the check (409), so a referenced schema can not go meanwhile; renaming a NODE that allows itself rewrites its own reference. Rows saved before keep what they have until their next save. |
| Firebase import | An invalid field or enum value is **dropped with a warning**, the rest of the schema is imported. The rules across fields are then kept the same way, with a warning each: a field name defined again drops the later field, a block that is not a NODE leaves `schemas`, an OPTION/OPTIONS field whose `source` is not an ENUM is dropped, a preview that is not a previewable field left is cleared. |
| Schema in use | **No rename, no delete** (409, saying where) while the schema is in use, in either of two ways: **(1)** a field of another schema refers to it, `schemas` (SCHEMA/SCHEMAS: mostly a NODE) or `source` (OPTION/OPTIONS: an ENUM); a schema referring to itself goes with it and does not count; **(2)** contents use it as their document schema, `contents.schema` (a ROOT). `contents.data` is not looked at. `GET …/schemas/:id/usage` answers `{ fields: [{ schema, field }], contents: { count, first } }` (the first five by full slug); the rename and delete dialogs show it. The CLI push (sync) refuses the same deletes. |
| Checks and races | The service decides and words the 409; the repository locks the schema row (`FOR UPDATE`) and reads its usage in the write's transaction, answering it instead of writing. A document is created only for a ROOT schema of the space (400 otherwise), whose row it locks `FOR SHARE`: a rename or delete waits for that insert and then sees the content, or runs first and the insert finds no schema. The push re-checks its deletes under the same lock. |
| Indexes | Only the unique `schemas_name_idx (space_id, name)`: it serves every query (the space's schemas ordered by name, one by name, the ROOT ones with `type` as a filter). `schemas_type_idx (space_id, type, display_name)` is **dropped**: nothing orders by `display_name` in SQL (the web sorts the list itself), and a space has too few schemas for a `type` index to pay off. |
| Known gap | A NODE whose blocks sit in contents but that no field allows any more (removed from a field's `schemas`) counts as unused: deleting or renaming it leaves those blocks unresolved. |

Renaming a used schema everywhere is a [To do](#to-do).

## Who changed a row

**Not recorded, for now.** The `updated_by` columns of `contents` and `translations` are dropped (the translation
detail no longer shows "Updated By"), and `schemas` does not get one. A write path without a user (the CLI push,
the import tasks, the Firebase import) could not have filled it, so it was half-true. `firebase_imports.started_by`
stays: it records who started the import.

## Timestamps

Tables with the standard pair spread `...timestamps` (`created_at`, `updated_at`: `timestamptz not null default now()`);
a table that differs (only `created_at`, or other dates) writes its columns out, so the spread means "standard".

`updated_at` has drizzle's `$onUpdate`: every `.update().set()` that does not name it moves it, so no write can forget
it. A write that is not an edit of the row keeps it with `...keepUpdatedAt(table)`: publishing and unpublishing a
document (its status compares `updated_at` with `published_at`), the `cv` version bumps of a space, reordering
environments, and the Firebase import's reference rewrite (imported dates are kept). `$onUpdate` does not apply to
upserts (`onConflictDoUpdate`) or raw SQL: those name `updatedAt` themselves.

## Columns with a fixed set of values

Every such column is `text('…', { enum: values(LIST) })` over the list in `@localess/shared` (or the server, for
server-only lists), plus a CHECK built from the same list:

- **TypeScript** types the column as the union of its values; writes accept the literal (`'FOLDER'`) or the enum
  member (`AssetKind.FOLDER`). Untrusted strings (request bodies, Firebase documents) must be validated first: the
  controllers use `z.enum(…)`, the Firebase import keeps known values and warns about the rest.
- **The database** refuses anything else (`23514`). A contract test (`schema-enums.test.ts`) checks every CHECK
  against its list, so the two cannot drift.
- **Not a Postgres enum type:** values can't be removed or renamed without recreating the type. Adding a value is a
  generated migration that replaces the CHECK.

| Column | Values |
|---|---|
| `users.role` | `USER_ROLES` (`ADMIN`, `DEVELOPER`, `EDITOR`, `TRANSLATOR`, `VIEWER`) |
| `user_credentials.hash_algo`, `user_identities.provider` | `HASH_ALGORITHMS`, `OAUTH_PROVIDERS` |
| `contents.kind`, `assets.kind`, `schemas.type` | `ContentKind`, `AssetKind`, `SchemaType` |
| `tasks.kind`, `tasks.status`, `tasks.type`, `task_logs.level` | `TaskKind`, `TaskStatus`, `TRANSLATION_IMPORT_FORMATS`, `TaskLogLevel` |
| `webhooks.events` | `WebHookEvent` (every element) |
| `webhook_logs.status`, `webhook_logs.error_type`, `firebase_imports.status` | `WebHookStatus`, `WebHookErrorType`, `FIREBASE_IMPORT_STATUSES` |
| `translation_snapshots.version`, `content_snapshots.version`, `content_link_snapshots.version` | `SNAPSHOT_VERSIONS` (server) |

**Casing:** UPPERCASE, the same value in the database, TypeScript and both APIs, never mapped between layers. The
role (`admin`/`custom` → `ADMIN`/`CUSTOM`) and webhook log values (`success`/`failure`, `timeout`/`network`/`http`)
were lowercase and now follow the rule. Exceptions, because they name external things rather than states of ours:
OAuth providers (`google`, `microsoft`: also in `/api/auth/google`), the password hash algorithm (`argon2id`), import
file formats (`flat-json`), webhook event names (`content.published`: part of the webhook contract), and translation
snapshot versions (`draft`, `published`: as the public API spells them, `?version=draft`).

## To do

- **Removing a locale from a space:** decide what happens to its values in translations and contents (keep as today,
  purge, or archive).
- **The default locale held by the database:** a composite foreign key `spaces(id, default_locale_id)` →
  `space_locales(space_id, locale_id)` would make the rule above the database's. It is circular (a space is inserted
  before its first locale), so `DEFERRABLE INITIALLY DEFERRED`, a migration, and every writer inserting in that order
  (space create, templates, the Firebase import); the row lock covers it until then.
- **Changing the default locale of a space with content:** move the values (bare ↔ `_i18n_<locale>`, published
  snapshots included) instead of only warning.
- **Content data validated against its schema:** a `blockSchema(schema, { schemas, locales, defaultLocale })` in
  `@localess/shared` that builds the zod rules of a block from its schema's fields, as the editor's form does (TEXT
  min/max length, NUMBER min/max, COLOR `#rrggbb`, DATE `YYYY-MM-DD`, DATETIME `YYYY-MM-DDTHH:mm`, OPTION/OPTIONS values
  of the source ENUM with min/max values, LINK/REFERENCE/ASSET shapes, SCHEMA/SCHEMAS blocks of the allowed schemas,
  `{field}_i18n_{locale}` for translatable fields), used by the server on save and publish and by the editor in place of
  `validateContent`. Open: `required` on save or only on publish; RICH_TEXT `minLength`/`maxLength` (measured on the
  TipTap JSON today); DATETIME stays local time without a timezone. The structural `ContentData` type comes first.
- **Content `cv` and `resolve*`:** with a `cv` per document (its snapshot's `built_at`), a response with
  `resolveReference`/`resolveLink`/`resolveAsset` is cached under the main document's `cv` only: a referenced or linked
  document republished (or an asset changed) later stays in that cached response until the main document's `cv` moves
  (up to the 7-day TTL). Decide how the resolved targets take part in the `cv` (e.g. a hash of their versions).
- **Tokens — last used:** a `last_used_at` per token, to find stale ones; written throttled on the v1 hot path (like the
  session's `last_seen_at`).
- **Table names:** singular instead of plural (`space`, `content`, …); `user` is a reserved word in Postgres.
- **Assets — deleting what content uses:** refuse to delete a file (or a folder with such a file) while contents
  reference it, instead of the warning; decide how the published snapshots count.
- **Task files through the storage queue:** task files (`spaces/{s}/tasks/{id}`) are still deleted after the commit;
  move them to `storage_deletions` (owner check against `tasks`) once the application is stable.
- **Scheduler for the other timers:** the task worker's polling and the Firebase import's recovery check still use
  `setInterval`; move them to `@nestjs/schedule` like the storage sweeper.
- **Assets — `assets_kind_idx`:** check whether `(space_id, kind, name)` still serves a query next to the parent
  index (the kind count and filter); drop it if not.
- **Assets — duplicate names in a folder:** allowed today (like a drive); decide whether to keep it.
- **Assets — alt text per locale:** `alt` has one language; decide whether it becomes localised like content fields.
- **Schemas — renaming everywhere:** rename a used schema in one transaction under the content lock: `schemas.name`,
  other schemas' `fields[].schemas[]` and `source`, `contents.schema`, and every `_schema` (and legacy `schema`) in
  `contents.data`, rewritten with a tree walker over the rows the usage query matches, page by page. Rewritten contents
  keep `updated_at` (`keepUpdatedAt`), the content `cv` is bumped and a `contents` event is published per row.
  Published snapshots are not rewritten: they keep the old name, which the customer's frontend (SDK component map,
  Code as Source) still uses until it is deployed with the new one; the next publish switches them. The dialog says so.
  Open: content import tasks of an export made before the rename still carry the old name.
- **Assets — rendition cache size:** with `LOCALESS_RENDITION_CACHE=disk` generated renditions are kept until their
  asset is deleted; add a size limit or age-based eviction.

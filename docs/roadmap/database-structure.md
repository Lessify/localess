# Database structure review

Reviewing the Postgres schema (`apps/server/src/infra/database/schema.ts`) table by table: why each column exists, what to
keep, what to move. Decisions are listed per table; open items are under [To do](#to-do).

## `spaces`

| Column | Decision |
|---|---|
| `id`, `name`, `created_at`, `updated_at` | Keep. |
| `legacy_id`, `import_status` | **Moved** to the space's `firebase_imports` row ([Firebase import](#firebase-import)). |
| `locales` jsonb | **Replaced** by `locales` + `space_locales` (below). |
| `locale_fallback` jsonb | **Replaced** by `default_locale_id` (below). |
| `environments` jsonb | **Replaced** by `space_environments` (below). |
| `overview`, `progress` jsonb | **Dropped**: the dashboard numbers are computed on request ([Overview](#overview)). |
| `content_version`, `translation_version` | Kept for now; to be reviewed ([To do](#to-do)). |
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

### Locales

```
locales        (id text PK, name text)                       -- every locale a space can use
space_locales  (space_id → spaces CASCADE, locale_id → locales RESTRICT,
                position int, created_at, PK (space_id, locale_id))
```

- `locales` is pure database data: seeded and changed only by migrations. The App API only reads it
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

That it is one of the space's locales is enforced by the API, not the database. Changing it asks for confirmation
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
| `users.role`, `users.permissions` | `USER_ROLES` (`ADMIN`, `CUSTOM`), `UserPermission` |
| `user_credentials.hash_algo`, `user_identities.provider` | `HASH_ALGORITHMS`, `OAUTH_PROVIDERS` |
| `contents.kind`, `assets.kind`, `schemas.type`, `translations.type` | `ContentKind`, `AssetKind`, `SchemaType`, `TranslationType` |
| `tasks.kind`, `tasks.status`, `tasks.type`, `task_logs.level` | `TaskKind`, `TaskStatus`, `TRANSLATION_IMPORT_FORMATS`, `TaskLogLevel` |
| `tokens.permissions`, `webhooks.events` | `TokenPermission`, `WebHookEvent` (every element) |
| `webhook_logs.status`, `webhook_logs.error_type`, `firebase_imports.status` | `WebHookStatus`, `WebHookErrorType`, `FIREBASE_IMPORT_STATUSES` |

**Casing:** UPPERCASE, the same value in the database, TypeScript and both APIs, never mapped between layers. The
role (`admin`/`custom` → `ADMIN`/`CUSTOM`) and webhook log values (`success`/`failure`, `timeout`/`network`/`http`)
were lowercase and now follow the rule. Exceptions, because they name external things rather than states of ours:
OAuth providers (`google`, `microsoft`: also in `/api/auth/google`), the password hash algorithm (`argon2id`), import
file formats (`flat-json`), and webhook event names (`content.published`: part of the webhook contract).

## To do

- **Removing a locale from a space:** decide what happens to its values in translations and contents (keep as today,
  purge, or archive).
- **Changing the default locale of a space with content:** move the values (bare ↔ `_i18n_<locale>`, published
  snapshots included) instead of only warning.
- **`content_version` / `translation_version`:** review.
- **Table names:** singular instead of plural (`space`, `content`, …); `user` is a reserved word in Postgres.

# Database structure review

Reviewing the Postgres schema (`apps/server/src/infra/database/schema.ts`) table by table: why each column exists, what to
keep, what to move. Decisions are listed per table; open items are under [To do](#to-do).

## `spaces`

| Column | Decision |
|---|---|
| `id`, `name`, `created_at`, `updated_at` | Keep. |
| `legacy_id`, `import_status` | Keep (Firebase import: old asset URLs, 503 while importing). |
| `locales` jsonb | **Replaced** by `locales` + `space_locales` (below). |
| `locale_fallback` jsonb | **Replaced** by `default_locale_id` (below). |
| `environments` jsonb | **Replaced** by `space_environments` (below). |
| `overview`, `progress` jsonb | **Dropped**: the dashboard numbers are computed on request ([Overview](#overview)). |
| `content_version`, `translation_version` | Kept for now; to be reviewed ([To do](#to-do)). |
| `spaces_name_idx` | **Dropped**: it serves only the admin list, a handful of rows. |

Spaces are listed by `lower(name), id`: case-insensitive whatever the database collation, stable for equal names.

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

## To do

- **Removing a locale from a space:** decide what happens to its values in translations and contents (keep as today,
  purge, or archive).
- **Changing the default locale of a space with content:** move the values (bare ↔ `_i18n_<locale>`, published
  snapshots included) instead of only warning.
- **`content_version` / `translation_version`:** review.
- **Table names:** singular instead of plural (`space`, `content`, …); `user` is a reserved word in Postgres.

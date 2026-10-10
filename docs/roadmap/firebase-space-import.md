# Import a space from a Firebase environment

**Status:** Implemented (2026-10-10) — Firebase side on `feat/firebase-migration-api` (from `develop`), this install
on `refactor/monorepo-structure`. Plan: [firebase-space-import-plan.md](firebase-space-import-plan.md) · **Recorded:** 2026-10-10
**Replaces:** the `import:firebase` CLI (service-account access to Firestore, Storage and Auth) and the parts of
[firebase-migration-uuidv7.md](firebase-migration-uuidv7.md) about legacy ids and the deferred reference migration.

## Goal

An admin moves spaces from a running Firebase-era Localess environment into a self-hosted install from the admin
UI, one space at a time, without a terminal. Each import creates a new space whose rows all have UUIDv7 ids and whose
references are rewritten to them, so the space works as soon as the import finishes. Developers then publish, and
update their SDK configuration (origin and space id; tokens keep their values).

The two environments run in parallel during the move. Backward compatibility is limited to asset URLs: an install
reachable under the old custom domain keeps serving old asset URLs. Everything else is a clean cut.

## Decisions

| # | Decision |
|---|---|
| D1 | Imported from Firebase, per space: space details, locales and fallback locale, environments, tokens, webhooks, schemas, translations, assets (rows and files), contents (stored drafts). |
| D2 | Not imported: users and global settings (admins re-invite users), published content and translation snapshots (users publish after the import), webhook logs, tasks. |
| D3 | One space per import. Only one import runs per install at a time. |
| D4 | An import always creates a new space; it never merges into an existing one. |
| D5 | `spaces.legacy_id` holds the Firebase space id and is **unique**: a Firebase space can be imported once. To import it again, delete the imported space first. |
| D6 | `assets.legacy_id` holds the Firebase asset id (unique per space). With `spaces.legacy_id` it keeps old asset URLs working: `/api/v1/spaces/{old space}/assets/{old asset}[/original|/download]` answers `301` to the UUID URL. No other `/api/v1` route accepts old ids. |
| D7 | No `legacy_id` on users, webhooks or contents. References inside a space are rewritten during the import; there is no later migration and no fallback lookup. |
| D8 | Tokens keep their Firebase values (`token`), unique per install as today. |
| D9 | Webhooks are imported **disabled**, so the two environments never both deliver. |
| D10 | A failed import keeps its half-imported space, flagged as failed, for inspection; the run records which stage failed and why. Deleting the space cleans it up. |
| D11 | Imports run in the server process, not as tasks. Each run is stored with its stages; runs are kept as history. |
| D12 | The Firebase environment exposes a read-only migration API, authenticated by a migration token generated in its admin UI. The new install calls it server-side. |
| D13 | Firebase-side work is done on a branch from `develop` and merged into `develop` after review. |

## Firebase side (branch from `develop`)

A new HTTPS function `migration` (`functions/src/migration.ts`), with a Hosting rewrite of `/api/migration/**` to
it. The public `publicv1` function is not touched.

### Migration token

- One token per environment. In Admin → Settings an admin generates it (shown once), regenerates or revokes it.
- Only its sha256 is stored, in Firestore `configs/migration` (`{ tokenHash, createdAt }`).
- Requests send `Authorization: Bearer <token>`. A missing or wrong token answers `401`. With no token configured,
  every migration endpoint answers `404`.

### Endpoints

All `GET`, JSON, read-only. Timestamps are ISO strings; documents are otherwise returned as stored, including
`data` that Firestore holds as a JSON string.

| Endpoint | Response |
|---|---|
| `/api/migration/spaces` | `[{ id, name, createdAt }]` |
| `/api/migration/spaces/{spaceId}` | The space document: `id`, `name`, `locales`, `localeFallback`, `environments`, `createdAt`, `updatedAt` |
| `/api/migration/spaces/{spaceId}/tokens` | `[{ id, name, version?, permissions?, cacheTtl?, createdAt, updatedAt }]`, `id` being the token value |
| `/api/migration/spaces/{spaceId}/webhooks` | `[{ id, name, url, enabled, events, headers?, secret?, createdAt, updatedAt }]` |
| `/api/migration/spaces/{spaceId}/schemas` | Schema documents, `id` being the schema name |
| `/api/migration/spaces/{spaceId}/translations?cursor=` | `{ items, cursor }` |
| `/api/migration/spaces/{spaceId}/assets?cursor=` | `{ items, cursor }`: folders and files with `parentPath` |
| `/api/migration/spaces/{spaceId}/contents?cursor=` | `{ items, cursor }`: content documents including `data`, `assets`, `links`, `references` |

Paged endpoints return up to 500 items ordered by document id; `cursor` is the last id of the page, or `null` on the
last page. An unknown space answers `404`.

Asset files are read from the existing public route `/api/v1/spaces/{spaceId}/assets/{assetId}/original`; nothing new
is needed for them.

### Firebase-side tests

Endpoint tests in the functions test setup: `404` without a configured token, `401` with a wrong one, each endpoint's
shape, paging through more than one page, `404` for an unknown space. The Admin → Settings token UI generates,
shows once, regenerates and revokes.

## New install

### Data model

New table `firebase_imports`, one row per run:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | UUIDv7 |
| `origin` | text | URL of the Firebase environment, e.g. `https://cms.example.com` |
| `source_space_id` | text | Firebase space id |
| `source_space_name` | text | |
| `space_id` | uuid, nullable | the new space; `on delete set null` |
| `status` | text | `RUNNING` \| `FINISHED` \| `FAILED` |
| `stages` | jsonb | `[{ stage, status, count, total?, warnings?, warningCount?, error? }]` in run order |
| `error` | jsonb, nullable | `{ stage, message }` |
| `started_by` | jsonb | `{ name, email }` of the admin |
| `started_at`, `finished_at` | timestamptz | |

- A partial unique index on `status` where `status = 'RUNNING'` allows one running import per install, across
  instances.
- A running import moves `heartbeat_at` on every progress write and every 30 s; all its writes require the row to
  still be `RUNNING`, so a run failed elsewhere stops without writing. At boot and every minute, any instance sets a
  `RUNNING` run whose heartbeat is older than 2 minutes to `FAILED` with
  `{ stage: <current>, message: 'Interrupted: the server running it stopped' }`, and its space gets
  `import_status = 'FAILED'`. A run another instance is still executing is left alone.
- The migration token is never stored: it comes with the request that starts the run and lives in memory for the run.

Changes to `spaces`:

- `legacy_id` becomes unique.
- New `import_status` text, nullable: `IMPORTING` while a run fills the space, `FAILED` after a failed run, `null`
  otherwise. A space with an `import_status` shows a badge in Admin → Spaces and cannot be opened. A `FAILED` space
  can be deleted; deleting an `IMPORTING` one answers `409` (the run owns it until it ends).

### Import API

Admin only (`role: admin`), under `/api/app/admin/firebase-import`:

| Endpoint | Behaviour |
|---|---|
| `POST /spaces` `{ origin, token }` | Calls `GET {origin}/api/migration/spaces` and answers `[{ id, name, createdAt, importedAs: { id, name } \| null }]`. `importedAs` is the local space whose `legacy_id` is that id. Connection errors answer `502` with the reason (unreachable, `401`, `404` = migration not enabled). |
| `POST /` `{ origin, token, spaceId }` | Starts a run and answers `202` with it. `409` if a run is `RUNNING`, or if a local space already has that `legacy_id`. |
| `GET /` | Runs, newest first. |
| `GET /:id` | One run with its stages; the UI polls it while `RUNNING`. |

`origin` follows the webhook URL rules: a public `https` host on the default port, no credentials, no internal or
private hosts — checked again on the address actually connected to — and redirects are never followed. With
`LOCALESS_WEBHOOK_ALLOW_INTERNAL=true` (local development, tests) any `http(s)` URL is allowed. A Firebase environment
without the migration API (its app answering `200` with HTML, or `404`) is reported as "migration not enabled". The
server makes every request to the Firebase environment; the browser never does.

### Stages

Every stage records `status` (`PENDING` → `RUNNING` → `DONE` | `FAILED`), `count`, optional `total`, and warnings
(the first 50 messages plus `warningCount`). The run row is updated as stages progress, at least once per page or
every 50 files, so polling shows movement.

| # | Stage | What it does |
|---|---|---|
| 1 | `space` | Reads the space document. Creates the space: new UUIDv7, `legacy_id` = Firebase id, `name`, `import_status = 'IMPORTING'`. Sets the run's `space_id`. |
| 2 | `locales` | Keeps the locales found in the `locales` table, in their order; others are skipped with a warning (their values stay in the data, unused). `localeFallback` becomes the default locale when kept, else the first kept locale, else `en`. Count: kept locales. |
| 3 | `environments` | Sets `environments`. Count: environments. |
| 4 | `tokens` | Inserts each token: new UUIDv7 `id`, `token` = Firebase id, name, version, permissions, cacheTtl, timestamps. A `token` that already exists in another space fails the stage: "Token `<name>` already exists in space `<space name>`". |
| 5 | `webhooks` | Inserts each webhook with a new UUIDv7, `enabled = false`; url, events, headers and secret copied. |
| 6 | `translations` | Pages through translations; `key` = Firebase id; type, locales, labels, description, timestamps. |
| 7 | `schemas` | Inserts schemas; `name` = Firebase id; fields copied as stored (they reference schemas by name). |
| 8 | `assets` | Reads every page; gives each asset a UUIDv7 dated to its `createdAt`. Inserts rows with `legacy_id` and `parent_path` mapped segment by segment to folder UUIDs. Streams each file from `{origin}/api/v1/spaces/{source}/assets/{id}/original` into `spaces/{space}/assets/{uuid}/original` and records size and md5; extracts metadata when the document carries none. A file that answers `404` is a warning, the row is kept. `total`: files. |
| 9 | `contents` | Reads every page; gives each document a UUIDv7 dated to its `createdAt`. Inserts rows as stored (`data` parsed if it is a string), `published_at = null`, references not yet rewritten. |
| 10 | `contentMigration` | Rewrites every document's references with the asset and content id maps (below). Count: documents changed. |

Then: `import_status = null`, the content and translation versions are bumped, the run is `FINISHED`.

On an error the current stage becomes `FAILED` with the message, the run becomes `FAILED` with `error`, and the
space keeps `import_status = 'FAILED'`. Stored files stay until the space is deleted (deleting a space removes its
files).

### Reference rewrite

A pure function `rewriteReferences(document, maps)` walks `data` by shape, at any depth, including every locale
variant (`field_i18n_<locale>`):

| Shape | Rewritten with |
|---|---|
| `{ kind: 'ASSET', uri }` (ASSET, ASSETS fields) | asset map |
| `{ kind: 'LINK', type: 'content', uri }` | content map (`type: 'url'` untouched) |
| `{ kind: 'REFERENCE', uri }` (REFERENCE, REFERENCES fields) | content map |
| `assets[]` | asset map |
| `links[]`, `references[]` | content map |

`_id` (block ids) and `_schema` (schema names) are not touched. An id missing from its map (deleted in Firebase
before the import) stays as it is and is reported as a warning `"<document fullSlug>: no asset|content '<id>'"`.
Asset URLs typed into RICH_TEXT or MARKDOWN values are not rewritten: under the old custom domain they resolve
through D6; otherwise they keep pointing at the Firebase environment.

### UI (Admin → Spaces)

- **Import from Firebase** opens a dialog:
  1. Origin and token, **Connect**. Errors from `POST /spaces` are shown in the dialog.
  2. The environment's spaces; already imported ones are disabled with "Imported as `<name>`". Pick one, **Import**.
  3. Progress: each stage with its status, `count` (and `count / total` for assets), warnings expandable, and the
     error of a failed stage. Polls `GET /:id` every 2 s while `RUNNING`.
- **Imports** lists past runs (origin, source space, new space, status, started by, times); a row opens the same
  progress view.
- Spaces with `import_status` show *Importing* or *Import failed*; a failed one can be deleted from the list.
- Space settings show "Imported from Firebase: `<legacy id>`" for imported spaces.

## Changes to the current branch

The UUIDv7 work on `refactor/monorepo-structure` added legacy ids broadly. This design narrows them:

| Area | Change |
|---|---|
| CLI | Remove `import:firebase`, `firebase-source`, `firebase-importer`, Firebase password-hash support (`firebase-scrypt`, `FIREBASE_SCRYPT_*`) and the `firebase-admin` dependency. `check`, `db:migrate`, `admin:create` stay. |
| Schema | Drop `users.legacy_id`, `webhooks.legacy_id`, `contents.legacy_id` and their indexes. Make `spaces.legacy_id` unique; add `spaces.import_status`; add `firebase_imports`. |
| Public API | Old space ids are resolved only on the three asset routes, which answer `301` to the UUID URL. Remove the `/contents/<old id>` redirect and the old space id resolution on every other route. |
| Delivery | `resolveAssets`, `resolveLinks`, `resolveReferences` match ids exactly; remove `legacy-ids.ts`. |
| App API / web | `?ids=` on assets and contents matches ids exactly; remove the `legacyId` fallback from the asset, references and link pickers; remove `legacyId` from the shared `Content` model. `Space.legacyId` and `Asset.legacyId` stay (display). |
| Tasks | Asset import keeps mapping Firestore ids of old export files to UUIDs with `legacy_id`. Content import maps them to new UUIDs without keeping them and does not rewrite references. |
| Docs | Rewrite `docs/deployment/migrate-from-firebase.md` as the guide to this feature (including the DNS switch for old asset URLs). Update `firebase-migration-uuidv7.md` (point here, drop the deferred reference migration), `v1-api.md`, `concepts.md`, `apps/server/README.md`, `CLAUDE.md`. |

## Testing (new install)

- A test HTTP server plays the Firebase migration API and the asset `/original` route with a fixture space: nested
  folders, files (one missing), documents with every reference kind at depth and in locale variants, a dangling
  reference, V1 and V2 tokens, a webhook, translations over two pages.
- An import runs end to end: every stage `DONE` with its counts; tokens authenticate on the public API; webhooks are
  disabled; files are served under the UUID; references point at the new UUIDs; warnings for the missing file and
  the dangling reference; the space is unpublished and has no `import_status`.
- `rewriteReferences` unit tests per shape, depth, locale variant and unmatched id.
- Guards: `409` while a run is `RUNNING` and for an already imported space; `403` for non-admins; `502` for an
  unreachable origin, a wrong token and a disabled migration API; the token is in no row or log.
- Failure: the fixture server fails during assets; the run is `FAILED` at `assets` with the message, earlier stages
  `DONE`, the space has `import_status = 'FAILED'`, and deleting it removes its rows and files.
- Restart: a `RUNNING` run left in the table is marked `FAILED` on boot.
- Old asset URLs: `/spaces/{old space}/assets/{old asset}` answers `301` to the UUID URL; `/spaces/{old space}/contents/…`
  answers `404`.
- Web: dialog flow (connect, list with imported spaces disabled, start, progress polling until done or failed), the
  imports list, the space badges.

## Out of scope

- Importing users, global settings, published snapshots, webhook logs and tasks.
- Resuming a failed import; merging into an existing space; importing several spaces in one run.
- Rewriting asset URLs inside rich text and Markdown.

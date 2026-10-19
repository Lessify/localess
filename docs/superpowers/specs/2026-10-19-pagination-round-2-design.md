# Pagination, round 2: Tasks, webhook logs, Contents and Assets (design)

> **Current rules: [docs/server/pagination.md](../../server/pagination.md).** This is the decision record (why and when);
> details below may be superseded there.

> Status: design, 2026-10-19; Tasks implemented. Order (least impact first): Tasks, webhook logs, Assets, Contents. Builds on [round 1](2026-10-18-server-pagination-design.md) (`Page<T>`, `Pageable`,
> `zPageable`, `shared/utils/paging.ts`, `PagedList`; Users and Spaces). Related: [search roadmap](../../roadmap/search.md),
> [Contents (large)](../../roadmap/contents-large-template.md), [Assets (large)](../../roadmap/assets-template.md).

## Why

The lists that grow without bound are paged on the server, the way Users and Spaces are, so no screen loads a whole
table: Tasks (one row per export or import, forever), webhook delivery logs (one row per delivery, today cut at the
newest 100 so older ones can not be reached), and the Contents and Assets folder lists (a folder answers all its items;
the pages and both pickers page in the browser).

## Decided by the user

- Page these: Tasks, webhook delivery logs, Contents and Assets folder lists ("implement everything you suggested").
- Translations are not in this round: their list and tree views are groomed separately.
- Schemas stay unpaged (bounded per space, needed whole by the editors).
- Spaces stay paged as built; the design records that the sidebar still holds every space.

## Goals

1. `GET …/tasks`, `GET …/webhooks/:id/logs`, `GET …/contents`, `GET …/assets` answer `Page<T>` with the round-1 query
   (`page`, `size` 1…100, `sort`, `direction`; ties by `id`; 400 on bad values) and their filters on the server.
2. The Tasks page, the webhook page's log table, the Contents and Assets pages and the references and assets pickers
   page, sort and filter through the server (`PagedList`).
3. Contents and Assets get a search box (server-side), the first step of the search roadmap.
4. Every caller that needs a whole list (the space's documents for the Link field, export autocomplete) keeps working.

## Non-goals

- Translations (separate grooming). Schemas. Full-text search, search in field values, ranking (search roadmap).
- Changing what `SpaceStore` holds: it still loads every document (Link field); that is the search roadmap's job.

## Decided (my calls, to check)

### The contract additions

- **Multi-value filters** (the user's decision): a filter with several values repeats the parameter
  (`status=FAILED&status=FINISHED`); Fastify's query parser gives an array, one value gives a string, so the zod schema
  takes either and checks each against its enum (400 on an unknown value). `PagedList` filters take
  `string | string[]`; Angular's `HttpParams` repeats an array's values.

### Tasks: `GET /api/app/spaces/:spaceId/tasks`

- Answers `Page<Task>`; the Tasks page is its only caller. Live updates reload the page shown. Index
  `tasks_space_idx (space_id, created_at desc)` exists: no migration.
- Sort: `createdAt` only (the user's decision), default **desc** (newest first, as today); ties by id. The other
  columns lose their sort headers.
- Default direction is per endpoint (`desc` here): `zPageable` gets a `defaultDirection` (default `asc`).
- `search`: case-insensitive contains on the id (`id::text`), the file name (`file->>'name'`) or the message.
- `kind`, `status`: multi-value, from `TaskKind` / `TaskStatus`.

### Webhook delivery logs: `GET /api/app/spaces/:spaceId/webhooks/:id/logs`

Approved by the user (W1–W6):

- Answers `Page<WebHookLog>`; the webhook page is its only caller (it never passed `limit`). Live updates (each new
  delivery) reload the page shown; on a busy webhook later pages shift, as on Users and Spaces. Index
  `webhook_logs_webhook_idx (webhook_id, created_at desc)` exists: no migration.
- The `?limit=` cap (newest 100, at most 1,000) goes: every kept delivery (`LOCALESS_WEBHOOK_LOG_DAYS`, 30 by default)
  is reachable page by page.
- Sort: `createdAt` only, default desc (newest first); ties by id. No sort headers on the table, as today.
- `search`: the log id (`id::text`), case-insensitive contains (the "Search by ID..." box).
- `event`, `status`: multi-value (repeated parameters), from `WebHookEvent` / `WebHookStatus`; 400 on unknown values.
- Tests: server (paging, order with ties, search, filters, 400, past the end), unit (screen, `WebhookService`), e2e with
  the existing webhook receiver: 25 deliveries, two pages, a filter and the id search narrowing on the server.

### Contents: `GET /api/app/spaces/:spaceId/contents`

- Always answers `Page<Content>`; every current caller moves to it:
  - the Contents page and the references picker: one folder (`parentId`), paged;
  - `findAllDocuments` (`SpaceStore`, the Link field's options): every page, 100 at a time (as `SpaceStore` loads
    spaces), until search on the server replaces it;
  - export autocomplete (`findAllByName`): one page of 5 with `name=` (prefix, kept as it is);
  - `findByIds` (a Reference(s) / Asset(s) field showing what it points to): every page of `ids=…` (no second response
    shape; a field rarely holds more than one page). My call.
- **Folders first**, then the sort, on every page (`kind` desc then the field): a folder never lands on page 3 behind
  documents, as the page shows today.
- Sort: `name` (default, case-insensitive), `schema`, `publishedAt`, `createdAt`, `updatedAt`.
- `search`: case-insensitive contains on the name or the slug, **within the open folder** (`parentId`) — not the whole
  space: results across folders need a path column and a different table, which belongs to the search roadmap.
- Existing filters kept: `parentId`, `kind`, `name` (prefix), `ids`; `limit` is replaced by `size`.

### Assets: `GET /api/app/spaces/:spaceId/assets`

Pagination and navigation only; search goes to the [search roadmap](../../roadmap/search.md) (the user's decision).

- Always answers `Page<Asset>` (list and grid layouts, 20 by default); live updates reload the page shown; `limit` is
  replaced by `size`.
- **Folders first** on every page and in every sort (today a sort header mixes them in among the files).
- Sort: `name` (default, case-insensitive), `size`, `type`, `createdAt`, `updatedAt` (the existing headers); folders
  keep name order where they have no value (size, type); ties by id.
- Kept filters: `parentId` ('' the root, absent the whole space), `kind`, `name` (prefix), `fileType`, `ids`.
- The assets picker pages on the server, keeping its folder navigation and file-type filter.
- `findByIds` (an Asset(s) field showing its assets): `ids` repeated (`ids=a&ids=b`), every page read. Export
  autocomplete: one page of 5 with `name=`. `findAllFilesByName` (no callers) is deleted. The e2e helpers page through.
- Duplicate names are allowed (the user's decision): the Create Folder, Edit File and Edit Folder dialogs drop their
  `reservedNames` check (it would only see one page), as upload and Move already allow them; a server-side check is on
  the roadmap ([asset names](../../roadmap/asset-names.md) N2). The e2e tests pinning the refusal change.
- Tests: server (folders first across pages, each sort with ties, `ids`, file type, 400, past the end), unit (page,
  picker), e2e on "Assets (large)" (paging, size sort with folders first, the picker paging the folder).

### The screens

- Same as round 1: `PagedList` drives the paginator, the sort headers and the filter toolbar; a failed load is told and
  ends only that request; live events refetch the current page; a page past the end moves to the last page.
- Contents gains an `ll-filter-toolbar` search box ("Search names..."), cleared when the folder changes (to review).
- The pickers keep their folder navigation; the page size stays what their paginator offers.

### Spaces (round 1) — recorded

- The admin table is paged, but `SpaceStore` (the switcher, the current space, the space guard) loads every space,
  100 at a time: paging Spaces buys consistency and a faster admin table, not scalability, until the switcher searches
  the server and the current space is loaded on its own. Added to the round-1 design (done).

## Left to the builder

- Indexes (e.g. on `webhook_logs (webhook_id, created_at desc)` if missing); the SQL for folders-first ordering.
- How the pickers and pages share code with `PagedList`; e2e helpers for the new list shapes.
- Tasks are hidden in the app (`FEATURE_FLAGS.importExport` is off, and only import/export creates them): Tasks are
  covered by server and unit tests, no UI e2e (my call); webhook logs, Contents and Assets get e2e tests.
- Tests: per endpoint (paging, sorts with ties, folders first across pages, search, filters incl. multi-value, 400s,
  past the end), the screens (unit), e2e: Tasks with > 1 page, webhook logs beyond 100, Contents and Assets folder
  search and paging (the large templates), the pickers paging the large folders.

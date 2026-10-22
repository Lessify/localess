# Pagination

> Part of the [server rules](README.md). Decision records: [round 1](../superpowers/specs/2026-10-18-server-pagination-design.md)
> (Users, Spaces), [round 2](../superpowers/specs/2026-10-19-pagination-round-2-design.md) (Tasks, webhook logs,
> Assets, Contents).

- **Rule:** a list that may grow is paged on the server: the endpoint answers `Page<T>` for a `Pageable` query, and the
  screen asks for one page at a time. Paging, sorting, search and filters all happen on the server.
- **Why:** a screen costs the same however big the database grows; never load a whole table, never filter only the
  loaded page.
- **Example:** Tasks (step by step [below](#adding-a-paged-list-step-by-step)).
- **Don't:** answer an array and page in the browser; let a client sort by any column or ask for an unbounded size.

## The contract

`@localess/shared` (`page.model.ts`), the same on the server and the web:

```ts
interface Page<T> { items: T[]; page: number; size: number; total: number }  // page 0-based; size as asked
interface Pageable<S> { page: number; size: number; sort: S; direction: 'asc' | 'desc' }
```

| Query | Meaning | Default | Refused (400) |
|---|---|---|---|
| `page` | 0-based | 0 | negative, not an integer |
| `size` | items per page | 20 | outside 1 … 100 |
| `sort` | one of the endpoint's sort fields | per endpoint | any other |
| `direction` | `asc` / `desc` | per endpoint (`asc` unless said) | any other |
| filters | the endpoint's own (`search`, `kind`, …) | — | a value outside its enum |

- No `totalPages`: `Math.ceil(total / size)`. A page past the end answers `items: []` with the real `total`.
- **Ties never repeat or skip a row:** every order ends with the id.
- **Several values for one filter repeat the parameter:** `status=ERROR&status=FINISHED` (Fastify reads an array, one
  value a string; `zMultiValue` accepts both).
- `search` is a case-insensitive "contains" over the fields the endpoint names, matched literally (`%` and `_` are
  text).

## Server

1. **Model** (`@localess/shared`): the sort fields in `<entity>.model.ts` (the web uses them too), the query schema in
   `<entity>.zod.ts`, built on `zPageable(fields, defaultSort, defaultDirection?)` and extended with the filters:
   `search: zSearch` (trimmed, at most 200, empty means no search), `zMultiValue(values)` for a repeated filter.

   ```ts
   export const TASK_SORT_FIELDS = ['createdAt'] as const;
   export const zTaskPageable = zPageable(TASK_SORT_FIELDS, 'createdAt', 'desc').extend({
     search: zSearch,
     kind: zMultiValue(Object.values(TaskKind) as [TaskKind, ...TaskKind[]]).optional(),
   });
   export type TaskPageable = z.infer<typeof zTaskPageable>;
   ```

2. **Repository** `findAll(…, query): Promise<XSelect[]>` (a relational query: `where`, `orderBy` the sort column then
   the id, `limit: query.size`, `offset: offsetOf(query)`, `with` the relations the list shows) and
   `findAllCount(…, query): Promise<number>` (`this.db.$count(table, where)` with the same `where`, one private method
   building it for both). Search with `containsPattern(search)` and `ilike` (`shared/utils/paging.ts`). A sort or filter needs an index
   when the table is large (`tasks_space_idx (space_id, created_at desc)`). Spaces follow this, and space locales, environments, tokens, webhooks and users; Tasks still
   answers both from one `findPage` until its module is reworked.
3. **Service** `findAll(…, query): Promise<Page<T>>`: both reads, then `toPage(rows, total, query, toX)`.
4. **Controller** `findAll(@Query({ schema: zXPageable }) query: XPageable)`.
5. **Server test** (`apps/server/test/<entity>-paging.test.ts`): the first page and the total; the next page and past
   the end; ties paged both ways without repeats; each sort; search (case, anywhere, wildcards literal); each filter,
   one value and several; the 400s.

## Web

- **Service:** `findPage(…, params: HttpParams): Observable<Page<T>>`, a live query
  (`liveQueryWith(events, scope, () => http.get<Page<T>>(url, { params }))`): a change event refetches the page shown.
- **Component:** a `PagedList` (`core/utils/paged-list.ts`) holds `page`, `size`, `sort`, `direction`, `filters`;
  `params()` is the query. Sort and filter changes go back to page 0; `onLoaded(page)` moves to the last page when the
  one shown emptied. Load with `toObservable(list.params).pipe(switchMap(params => service.findPage(params).pipe(
  catchError(() => { notify; return EMPTY; }))))`, so a failed load ends only that request.
- **Template:** `<ll-paginator [length]="total()" [(pageIndex)]="list.page" [(pageSize)]="list.size" />`;
  `(sortChange)="onSortChange($event)"` on `llTableSort` (a fixed default order: `llTableSortActive`,
  `llTableSortDirection`, `[llTableSortDisableClear]="true"`); the filter toolbar's `(filterChange)` calls
  `list.setFilters({ search, … })` (arrays for multi-select filters).
- **A whole list** (a store or picker that truly needs every item): prefer a narrow, unpaged endpoint answering only
  what the list shows (`GET /spaces/names` → `IdName[]` for the sidebar). The e2e helpers read every page
  (`AppApi.everyPage`).
- **Unit tests:** the service (URL and params), the component (first load, a filter and a sort reaching the query from
  page 0, a failed load told and the next change loading again).

## Adding a paged list, step by step

The Tasks list is the reference; each step names the file.

1. `packages/shared/src/models/task.model.ts` (`TASK_SORT_FIELDS`) and `task.zod.ts` (`zTaskPageable`, `TaskPageable`).
2. `modules/tasks/repositories/task.repository.ts`: `findPage(spaceId, query)`.
3. `modules/tasks/services/task.service.ts`: `findAll(spaceId, query)` → `Page<Task>`.
4. `modules/tasks/controllers/task.controller.ts`: `findAll(@Query({ schema: zTaskPageable }) query)`.
5. `apps/server/test/tasks-paging.test.ts`.
6. `apps/web/src/app/core/services/task.service.ts`: `findPage(spaceId, params)`.
7. `apps/web/src/app/features/spaces/tasks/tasks.component.ts` and `.html`: `PagedList`, paginator, sort, filters.
8. Their specs; the e2e helpers if they read the list (`everyPage`); the feature doc (`docs/features/…`).

## Translations: a paged list and a tree read by level

- **List** — `GET …/translations` answers `Page<Translation>` (`zTranslationPageable`: sort `key`, `createdAt`,
  `updatedAt`, default `key`; the web reads 50 at a time as the list scrolls, `TranslationPages`). Filters: `search` (the key, or the value in `locale`;
  case-insensitive contains), `key` (this key in any letter case: the add and rename dialogs' check), `label`
  (repeated: any of them), `status` (`TRANSLATED`, `PARTIALLY_TRANSLATED`, `UNTRANSLATED` over the space's locales)
  and `localeStatus` (`TRANSLATED`, `UNTRANSLATED` in `locale`).
- **Tree** — `GET …/translations/nodes?parent=` answers one level of the key tree as `Page<TranslationNode>`: each
  dotted segment below `parent` once (`name`, `path`), its translation when the path is itself a key, and how many
  matching keys lie below it (`children`). The same filters apply, so a group's count is its matches. A prefix
  match uses the byte-order index `translations_key_bytes_idx` (`key COLLATE "C"`); the order is the list's.
- **Labels** — `GET …/translations/labels`: every label of the space, for the filter.
- **Web** — `TranslationTree` (`features/spaces/translations/shared/models/translation-tree.ts`) reads a level when
  its group first opens, "Load more" for a level of more than 100 (loading by itself when scrolled into view), and the open levels again after a change. With
  a filter of at most `TREE_EXPAND_ALL_MAX` (200) matches it reads them all and shows the tree fully open; more stay
  collapsed with their counts. Clearing the filter restores what was open while browsing.

## Contents: a folder's page, or everything under it

`GET /api/app/spaces/:spaceId/contents` (`zContentPageable`, `ContentPageable`): one page of `Content`, **without the
documents' `data`, `assets`, `links` and `references`** (the repository doesn't read them; `GET …/contents/:contentId`
answers the full document for the editor).

- **Folders always first**, then by `sort` (`name`, case-insensitive, the default; `schema`, `publishedAt`,
  `createdAt`, `updatedAt`), then the id.
- `parentId`: the folder; **absent: the root**. `deep=true`: everything under it at any depth (a recursive subquery);
  under the root, the whole space.
- `kind` (`FOLDER` / `DOCUMENT`), `search` (the name or the slug, anywhere, case-insensitive, wildcards literal).

The Contents table and the References picker read one page (`ContentService.findPage` with a `FolderList`, the folder,
search and scope state they share). The breadcrumbs, the Move dialog, the Link and References fields read the light lists
instead, held live by `SpaceStore` (see "Not paged" below). Tests: `apps/server/test/contents-paging.test.ts`.

## Assets: a folder's page, or everything under it

`GET /api/app/spaces/:spaceId/assets` (`zAssetPageable`, `AssetPageable`): one page of `Asset`.

- **Folders always first**, then by `sort` (`name`, case-insensitive, the default; `size`, `type`, `createdAt`,
  `updatedAt`), then the name, then the id. Folders have no size nor type: by name among themselves whatever the sort.
- `parentId`: the folder; **absent: the root**. `deep=true`: everything under it at any depth (a recursive subquery);
  under the root, the whole space.
- `kind` (`FOLDER` / `FILE`), `fileType` (an Asset field's `AssetFileType`: files of that media type, through
  `ASSET_FILE_TYPE_MIME`; folders stay listed, to browse; `ANY` filters nothing), `search` (the name, anywhere,
  case-insensitive, wildcards literal).

The Assets page (list and grid) and the asset picker read one page (`AssetService.findPage` with a `FolderList`, as
Contents). Tests: `apps/server/test/assets-paging.test.ts`.

## Not paged (and why)

- Schemas: bounded per space (tens to a few hundred, not thousands like translation keys) and needed whole: the
  content editor renders any document's form and its nested blocks, the schema editors offer the other schemas, and
  cross references (what uses a schema) are worked out over all of them. `SpaceStore` holds them live
  (`GET …/schemas`, every schema); the Schemas page reads the store (no request of its own) and searches, filters,
  sorts and pages in the browser (`TableDataSource`, see [Table](../components/table.md)).
- The light lists `SpaceStore` holds live, every row of the space with only what the screens need (no data, no paths;
  paths are worked out from the folder chain):
  - `GET …/contents/folders` (`ContentFolderSummary`: id, kind, parentId, name, slug) and `GET …/contents/documents`
    (`ContentDocumentSummary`: id, kind, parentId, name, slug, publishedAt, updatedAt), read on entering a space:
    breadcrumbs, the Move tree, the Link / Reference / References fields, the names and slugs a folder has.
  - `GET …/assets/folders` (`AssetFolderSummary`: id, parentId, name), read on entering a space: breadcrumbs and paths
    of the Assets page and the picker, the Move dialog.
  - `GET …/assets/files` (`AssetFileSummary`: id, parentId, name, extension, type, size, width / height / duration),
    read only once an editor shows an Asset or Assets field (`SpaceStore.loadAssetFiles()`): what those fields show.
  Each is read again on every change event of its entity; patching from the event instead is a roadmap item
  ([content-store-patch](../roadmap/content-store-patch.md)).
- `SpaceStore` reads every space (100 a page): paging Spaces buys consistency and a faster admin table, not
  scalability, until the switcher searches the server.

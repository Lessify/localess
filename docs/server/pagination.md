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
   `<entity>.zod.ts`, built on `zPageable(fields, defaultSort, defaultDirection?)` and extended with the filters.

   ```ts
   export const TASK_SORT_FIELDS = ['createdAt'] as const;
   export const zTaskPageable = zPageable(TASK_SORT_FIELDS, 'createdAt', 'desc').extend({
     search: z.string().trim().max(200).optional(),
     kind: zMultiValue(Object.values(TaskKind) as [TaskKind, ...TaskKind[]]).optional(),
   });
   export type TaskPageable = z.infer<typeof zTaskPageable>;
   ```

2. **Repository** `findPage(…, query): Promise<{ rows; total }>`: one `where` for both queries; order by the sort
   column then the id; `limit(query.size).offset(offsetOf(query))`; `count()` with the same `where`. Search with
   `containsPattern(search)` and `ilike` (`shared/utils/paging.ts`). A sort or filter needs an index when the table is
   large (`tasks_space_idx (space_id, created_at desc)`).
3. **Service** `findAll(…, query): Promise<Page<T>>`: `toPage(rows, total, query, toX)`.
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
- **Every page** (a store or picker that truly needs the whole list): read 100 at a time with `expand` until
  `total` (`SpaceService.findAllPages`); the e2e helpers do the same (`AppApi.everyPage`). Prefer a narrower endpoint
  or a search when the list can be large.
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

## Not paged (and why)

- Schemas: bounded per space and needed whole by the editors.
- Folder lists for breadcrumbs and move targets (`…/folders`): the editor's folder map.
- `SpaceStore` reads every space (100 a page): paging Spaces buys consistency and a faster admin table, not
  scalability, until the switcher searches the server.
- Translations: their list and tree views are being designed.

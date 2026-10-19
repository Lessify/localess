# Server-side pagination: `Page<T>` and `Pageable` (design)

> Status: design, 2026-10-18. First users: Admin → Users and Admin → Spaces (and the sidebar's space switcher).
> Related: [Admin → Users](../../features/admin/admin-users.md) · [Admin → Spaces](../../features/admin/admin-spaces.md) ·
> [Server architecture](../../server-architecture.md) · [Shared components: table, paginator, filter toolbar](../../components/README.md)

## Why

Admin → Users and Admin → Spaces fetch every row and page, sort and filter in the browser. Nothing is slow today and
there is no target size; this is for scale: a screen should cost the same however big the database grows, never load a
whole table. The server returns one page at a time, and the shape is generic so every later list uses the same one.

## Goals

1. One generic response type, `Page<T>`, and one query shape, `Pageable`, defined once in `@localess/shared` and reused
   by every paginated endpoint from now on.
2. `GET /api/app/users` and `GET /api/app/spaces` return `Page<T>`, with paging, sorting, search and filters done on
   the server.
3. The Users and Spaces admin screens page, sort, search and filter through the server.
4. The sidebar's space switcher and the current space (`SpaceStore`) use the same spaces endpoint, loaded 100 at a
   time, every page.

## Non-goals

- Other lists (contents, assets, translations, schemas, tokens, webhooks, tasks): later, with the same types.
- Shapes without totals (a `Slice` with `hasNext`, cursor paging): only when a list is too big to count; separate types
  then, not optional fields on `Page`.
- Paging inside the sidebar's space switcher (it shows every space it loaded, with the search box below).
- Search for contents and assets ([roadmap](../../roadmap/search.md)).

## Anti-goals

- A client able to ask for a whole table (no size cap), or to sort by an arbitrary column.
- Search or filters that only cover the loaded page.
- Rows repeated or skipped between pages when sort values tie.

## Decided

### The response: `Page<T>` (`@localess/shared`)

```ts
/** One page of a list, and where it sits in the whole (after filters). */
export interface Page<T> {
  /** This page's items, in the requested order; empty past the last page. */
  items: T[];
  /** This page's number, 0-based. */
  page: number;
  /** The page size asked for (not items.length, which is smaller on the last page). */
  size: number;
  /** How many items match the filters, across all pages. */
  total: number;
}
```

- Named `Page`, no `I` prefix, no `T extends { id }` constraint (the codebase's type naming; a page may hold items
  without an `id`).
- No `totalPages`: a client computes `Math.ceil(total / size)` (0 when `total` is 0). The user's decision.
- Totals always counted: the server runs the page query and a `count(*)` with the same filters (two queries; a row
  added between them may make them differ by one, accepted). The user's decision ("we will always work with an indexed
  key").
- Example: 45 users, `size=20` → pages 0, 1, 2 hold 20, 20, 5; `total` 45. Page 5 → `items: []`, `total` 45.

### The query: `Pageable`

Every paginated endpoint takes, in its query string:

| Parameter | Meaning | Default | Rules |
|---|---|---|---|
| `page` | page number, **0-based** | 0 | integer ≥ 0 |
| `size` | items per page | 20 | integer 1 … 100 |
| `sort` | the column to sort by | per endpoint | one of the endpoint's allowed fields, else 400 |
| `direction` | `asc` or `desc` | `asc` | else 400 |

- Endpoint-specific filters sit next to these (below) and apply before counting.
- Every sort ends with `id` as a tie-breaker, so pages are stable.
- A page past the end answers `items: []` with the real `total`; the screen then moves to its last page.
- One zod schema for the four parameters in `@localess/shared/zod`, extended per endpoint with its filters and its
  allowed sort fields (an enum): `zPageable(fields, defaultSort, defaultDirection = 'asc')`. Round 2 added the default
  direction per endpoint (Tasks: newest first) and `zMultiValue(values)` for a filter with several values, sent as
  the parameter repeated (`status=ERROR&status=FINISHED`).

### Admin → Users: `GET /api/app/users`

- Sort fields: `email` (default), `name` (display name), `role`, `createdAt`, `updatedAt`.
- `search`: case-insensitive "contains" on email or display name (as the search box matches today).
- `active`: `active` | `inactive` (the existing Active filter: `disabled` false / true).
- Permission unchanged (`USER_MANAGEMENT`).

### Admin → Spaces: `GET /api/app/spaces`

- Sort fields: `id`, `name` (case-insensitive, default), `updatedAt`.
- `search`: case-insensitive match on name, or the id (as today).
- `importing`: `false` leaves out spaces being imported from Firebase (or whose import failed), which the sidebar drops
  today in the browser.
- Permission unchanged (any role).

### The screens

- Admin → Users and Admin → Spaces stop paging, sorting and filtering in the browser: the paginator, the sort headers,
  the search box and the filters send the request; a typed search waits ~300 ms (debounce) and returns to page 0, as
  does any filter or sort change.
- Live updates (the change events they already listen to) fetch the current page again.
- `SpaceStore` (the sidebar's switcher, the current space `selectedSpace`, and `spaceSelectionGuard`, which only opens
  a space that is in the store's list) loads `size=100&sort=name&importing=false`, page 0, then the next pages while
  fewer than `total` are loaded, so it still holds every space a user can open: a link, a bookmark or Admin → Spaces
  opens any space, as today. The user's decision ("load 100, if there are more items, then load next page"). A live
  update loads them again the same way. Showing fewer in the switcher, or loading the current space on its own, is the
  later improvement.
- **What paging Spaces buys** (recorded 2026-10-19, with [round 2](2026-10-19-pagination-round-2-design.md)): the admin
  table is paged, but `SpaceStore` (the switcher, the current space, the space guard) still loads every space, 100 at a
  time. So paging Spaces buys consistency (one list contract) and a faster admin table, not scalability, until the
  switcher searches the server and the current space is loaded on its own.
- **A search box in the space switcher** (the sidebar dropdown, `features.component.html`), shown only when there are
  more than 20 spaces: it filters the spaces the store already holds, in the browser (no request), by name,
  case-insensitive, as you type; "No spaces found" when nothing matches; cleared when the dropdown closes. The user's
  decision (the behaviour details are my call).

### Callers that change

`GET /api/app/users` and `GET /api/app/spaces` change shape (array → `Page<T>`): the web services, `SpaceStore`, the
server tests that read them, the e2e helpers (`AppApi.listSpaces`, `findUserByEmail` and the like) and any e2e test
reading the lists. Both are App API routes (`/api/app`, the web app's own), not the CDN or Management API, so there is
no external client to keep compatible.

## Left to the builder

- Where the shared server helper lives (e.g. `shared/` for applying `Pageable` to a Drizzle query and counting), and
  how each repository maps sort fields to columns.
- Indexes the new sorts and searches need (e.g. `lower(name)`, email), if any; a migration if so.
- How the existing `ll-table` / `TableDataSource` / `ll-paginator` / `ll-filter-toolbar` are driven by server data
  (a server-side data source, or the components fed directly), keeping them reusable for the next lists.
- How the e2e helpers find a user or space by email or name (a `search` query, or paging through).
- Tests: the shared schema (defaults, caps, unknown sort field, direction), each endpoint (paging, totals, each sort
  with ties, search, filters, past the end), the screens (unit), and e2e for paging, sorting and searching on both
  screens with more than one page of data, plus the invited user appearing (the case that prompted this).

# Server-side Pagination (Users, Spaces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GET /api/app/users` and `GET /api/app/spaces` return one page (`Page<T>`) with paging, sorting, search and filters done on the server; Admin → Users and Admin → Spaces drive them; `SpaceStore` loads every space 100 at a time; the sidebar space switcher gets a search box past 20 spaces.

**Architecture:** One generic contract in `@localess/shared` (`Page<T>`, `Pageable`, a zod factory per endpoint). On the server a small paging helper in `shared/utils/` turns a validated `Pageable` into `limit`/`offset` and wraps rows + count; each repository maps its allowed sort fields to columns and always appends `id`. In the web app, a server-paged list state (signals → `HttpParams`) feeds `ll-table` items, `ll-paginator` length, the sort header and the filter toolbar.

**Tech Stack:** TypeScript, zod 4, NestJS 12 + Drizzle (Postgres), Angular 22 signals, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-18-server-pagination-design.md](../specs/2026-10-18-server-pagination-design.md)

## Global Constraints

- `Page<T>` = `{ items: T[]; page: number; size: number; total: number }` — no `totalPages`, no `I` prefix, no `T extends { id }`.
- Query: `page` (0-based, default 0, integer ≥ 0), `size` (default 20, integer 1…100), `sort` (endpoint's allowed fields, else 400), `direction` (`asc` | `desc`, default `asc`, else 400).
- Every sort ends with `id` ascending as tie-breaker. Past the last page: `items: []`, real `total`.
- Users: sort `email` (default) | `name` | `role` | `createdAt` | `updatedAt`; `search` = case-insensitive contains on email or display name; `active` = `active` | `inactive` (`disabled` false / true).
- Spaces: sort `name` (default, case-insensitive `lower(name)`) | `id` | `updatedAt`; `search` = case-insensitive contains on name, or equal to the id; `importing=false` leaves out spaces whose `importStatus` is not null.
- `SpaceStore`: `size=100&sort=name&importing=false`, page 0, then next pages while loaded < `total`; a live event reloads all pages.
- Space switcher search box: only when > 20 spaces; filters loaded spaces by name, case-insensitive, as you type; "No spaces found"; cleared when the dropdown closes.
- Screens: typed search debounced ~300 ms; search, filter or sort change → page 0; live events refetch the current page; past the end (after a delete) → move to the last page.
- `packages/ui/` is never modified (fixes go in `apps/web`). Commits as alexcibotari, no `Co-Authored-By`. After every change: `pnpm build`, `pnpm lint:fix`. One build/test run at a time.

## Review Focus

1. A tie on the sort value (two users with the same role, two spaces named alike): no row repeated or skipped across pages — Task 3 and 4 tests page through tied rows.
2. `search` with LIKE wildcards (`%`, `_`, `\`): matched literally, not as patterns — Task 3 and 4 tests (`escapeLike`, as `assets.repository.ts` does).
3. `size=0`, `size=101`, `page=-1`, `page=1.5`, `sort=password`, `direction=up`: 400, nothing read — Task 1 schema tests and one API test per endpoint.
4. Deleting the last row of the last page from the screen: the screen shows the new last page, not an empty table — Task 5 unit test.
5. More than 100 spaces: the store holds them all and a link to space 150 opens — Task 6 unit test (3 pages) and e2e (Task 7, 101 spaces).

---

### Task 1: The shared contract

**Files:**
- Create: `packages/shared/src/models/page.model.ts`, `packages/shared/src/models/page.zod.ts`, `packages/shared/src/models/page.zod.test.ts`
- Modify: `packages/shared/src/index.ts` (export the model), `packages/shared/src/zod.ts` (export the zod)

**Interfaces:**
- Produces: `interface Page<T> { items: T[]; page: number; size: number; total: number }`; `type SortDirection = 'asc' | 'desc'`; `interface Pageable<S extends string = string> { page: number; size: number; sort: S; direction: SortDirection }`; `PAGE_SIZE_DEFAULT = 20`, `PAGE_SIZE_MAX = 100`; `zPageable<const S extends readonly [string, ...string[]]>(fields: S, defaultSort: S[number])` → a zod object (coercing query strings) whose output is `Pageable<S[number]>`, `.extend()`-able with filters.

- [ ] **Step 1: Write the failing tests** (`page.zod.test.ts`): `zPageable(['email','name'], 'email').parse({})` → `{ page: 0, size: 20, sort: 'email', direction: 'asc' }`; `parse({ page: '2', size: '50', sort: 'name', direction: 'desc' })` → numbers coerced; each of `{size:'0'}`, `{size:'101'}`, `{page:'-1'}`, `{page:'1.5'}`, `{sort:'password'}`, `{direction:'up'}` fails `safeParse`; `.extend({ search: z.string().optional() })` keeps both.
- [ ] **Step 2: Run** `pnpm shared:test` — FAIL (module missing).
- [ ] **Step 3: Implement** the model and `zPageable` (Page docs as in the spec's code block).
- [ ] **Step 4: Run** `pnpm shared:test` — PASS.
- [ ] **Step 5: Commit** `feat(shared): Page<T> and Pageable, one paging contract`.

### Task 2: The server paging helper

**Files:**
- Create: `apps/server/src/shared/utils/paging.ts`, `apps/server/src/shared/utils/paging.test.ts`

**Interfaces:**
- Consumes: `Page`, `Pageable` (Task 1).
- Produces: `offsetOf(p: Pageable): number` (`page * size`); `toPage<R, T>(rows: R[], total: number, p: Pageable, map: (r: R) => T): Page<T>`; `containsPattern(search: string): string` (`%` + `escapeLike(search)` + `%`; move `escapeLike` here from `assets.repository.ts` if it is local there, and import it back).

- [ ] **Step 1: Failing tests:** `offsetOf({page:2,size:20,…})` = 40; `toPage([], 45, {page:5,size:20,…}, x=>x)` = `{ items: [], page: 5, size: 20, total: 45 }`; `containsPattern('50%_a\\b')` escapes `%`, `_`, `\`.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/shared/utils/paging.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(server): paging helper`.

### Task 3: `GET /api/app/users` paged

**Files:**
- Modify: `apps/server/src/modules/users/repositories/users.repository.ts` (`findAll` → `findPage`), `…/services/users.service.ts` (`list` → `page`), `…/controllers/users.controller.ts` (query schema), `apps/server/test/users.test.ts`, `apps/server/test/auth.test.ts` (status-only, unchanged)

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces: `USER_SORT_FIELDS = ['email','name','role','createdAt','updatedAt'] as const`; `UsersRepository.findPage(q: UserQuery): Promise<{ rows: UserRow[]; total: number }>` with `UserQuery = Pageable<UserSortField> & { search?: string; active?: 'active' | 'inactive' }`; `UsersService.page(q): Promise<Page<UserDto>>`; controller `@Query(new ZodValidationPipe(zPageable(USER_SORT_FIELDS,'email').extend({ search, active })))`. Sort `name` → `display_name` (nulls last), `role` → `role`; every order ends `asc(users.id)`. Two queries (rows with limit/offset, `count(*)` with the same `where`).

- [ ] **Step 1: Failing tests** in `users.test.ts` (`describe('list, paged')`), with 25 users created through the app: default → `page 0, size 20, total = all, items` sorted by email; `?page=1` → the rest; `?size=5&sort=role&direction=desc` with several users of the same role → pages 0…n concatenated equal the full ordered list, no duplicates; `?search=ALI` matches email or display name, case-insensitive; `?search=%` matches only emails containing `%` (none); `?active=inactive` → only disabled; `?page=99` → `items: []`, `total` unchanged; `?size=101`, `?sort=password`, `?direction=up` → 400. Update the existing list assertion (`users.test.ts:51`) to `response.json().items`.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/users.test.ts` — FAIL.
- [ ] **Step 3: Implement** repository, service, controller.
- [ ] **Step 4: Run** the file, then `pnpm server:test` — PASS.
- [ ] **Step 5: Commit** `feat(users): GET /api/app/users returns a page`.

### Task 4: `GET /api/app/spaces` paged

**Files:**
- Modify: `apps/server/src/modules/spaces/repositories/spaces.repository.ts` (`findAll` → `findPage`), `…/services/spaces.service.ts` (`list` → `page`), `…/controllers/spaces.controller.ts`, `apps/server/test/app-spaces.test.ts`, `apps/server/test/app-events.test.ts:110` (reads the list)

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces: `SPACE_SORT_FIELDS = ['name','id','updatedAt'] as const`; `SpacesRepository.findPage(q: SpaceQuery): Promise<{ rows: SpaceRow[]; total: number }>`, `SpaceQuery = Pageable<SpaceSortField> & { search?: string; importing?: boolean }` (`importing` parsed from `'true' | 'false'`); `SpacesService.page(q): Promise<Page<Space>>`. `name` sorts `lower(name)`; `search` = `lower(name) like lower(contains)` or `id = search` (only when it is a UUID); `importing=false` → no `firebase_imports` row with status RUNNING or FAILED (the condition `importStatus` already encodes in `space.query.ts`).

- [ ] **Step 1: Failing tests** in `app-spaces.test.ts` (`describe('list, paged')`): 25 spaces → default sorted by `lower(name)`, two spaces with the same name page stably (`?size=1` through both); `?search=mark` case-insensitive; `?search=<id>` finds that space; `?importing=false` leaves out a space with a RUNNING and one with a FAILED import (insert `firebase_imports` rows as `app-firebase-import` tests do); past the end; 400s as in Task 3.
- [ ] **Step 2: Run** the file — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the file, then `pnpm server:test` — PASS.
- [ ] **Step 5: Commit** `feat(spaces): GET /api/app/spaces returns a page`.

### Task 5: Admin → Users and Admin → Spaces page on the server

**Files:**
- Create: `apps/web/src/app/core/utils/paged-list.ts`, `…/paged-list.spec.ts`
- Modify: `apps/web/src/app/features/admin/users/user.service.ts` (+spec), `users.component.ts/html` (+spec), `apps/web/src/app/core/services/space.service.ts` (+spec), `apps/web/src/app/features/admin/spaces/spaces.component.ts/html` (+spec)

**Interfaces:**
- Consumes: `Page<T>` (Task 1); endpoints of Tasks 3–4.
- Produces: `class PagedList<F extends Record<string, string | undefined>>` — signals `page`, `size`, `sort`, `direction`, `filters`; methods `setPage(i)`, `setSize(n)` (→ page 0), `setSort(field, dir)` (→ page 0; `''` direction → the endpoint default), `setFilters(f)` (→ page 0), `params(): HttpParams` (computed), `onLoaded(page: Page<unknown>)` (if `items` empty and `total > 0` → `setPage(lastPage)`); `UserService.findPage(params: Signal<HttpParams>): Observable<Page<User>>` and `SpaceService.findPage(params: Signal<HttpParams>): Observable<Page<Space>>` (live: `liveQueryWith` over `toObservable(params)` with `switchMap`; search typed in the toolbar is debounced 300 ms before `setFilters`). The components feed `TableDataSource` with `items` only (no `.sort`, `.paginator`, `.filterPredicate` attached), bind `ll-paginator [length]="total" [pageIndex] [pageSize] (page)`, and `llTableSort (sortChange)` → `setSort`.

- [ ] **Step 1: Failing tests:** `paged-list.spec.ts` — params for defaults (`page=0&size=20`), sort/filter reset page to 0, empty `search` omitted, `onLoaded({items:[], total: 45, page: 5, size: 20})` → page 2; `user.service.spec.ts` / `space.service.spec.ts` — `findPage` sends the params and refetches on a change event; `users.component.spec.ts` — a sort header click sends `sort=role&direction=asc&page=0`, the paginator shows `total`; same shape for `spaces.component.spec.ts`.
- [ ] **Step 2: Run** `pnpm test --include='**/{paged-list,user.service,space.service,users.component,spaces.component}.spec.ts'` — FAIL.
- [ ] **Step 3: Implement** `PagedList`, the services, the two screens.
- [ ] **Step 4: Run** those specs, then `pnpm test` — PASS.
- [ ] **Step 5: Commit** `feat(admin): Users and Spaces page, sort and search on the server`.

### Task 6: `SpaceStore` loads every space; the switcher search box

**Files:**
- Modify: `apps/web/src/app/core/stores/space.store.ts` (+spec), `apps/web/src/app/core/services/space.service.ts` (`findAllPages`), `apps/web/src/app/features/features.component.ts/html` (+spec)

**Interfaces:**
- Consumes: Task 4 endpoint, `SpaceService` (Task 5).
- Produces: `SpaceService.findAllPages(): Observable<Space[]>` — live; per refetch loads `page=0,1,…` with `size=100&sort=name&importing=false` until loaded ≥ `total`, emits the concatenation once; `SpaceStore.load` uses it (drop the browser `importStatus` filter). Switcher: `spaceSearch = signal('')`, `filteredSpaces = computed(...)`; search input shown when `spaces().length > 20`, "No spaces found" when empty, cleared on menu close.

- [ ] **Step 1: Failing tests:** `space.service.spec.ts` — `findAllPages` with `total: 250` requests pages 0, 1, 2 (size 100) and emits 250 spaces; `space.store.spec.ts` — 250 spaces loaded, a selected id from page 3 is kept; `features.component.spec.ts` — 21 spaces → search box present, typing `mark` filters case-insensitively, no match → "No spaces found"; 20 spaces → no search box.
- [ ] **Step 2: Run** those specs — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run**, then `pnpm test` — PASS.
- [ ] **Step 5: Commit** `feat(web): the space store loads every page; the switcher searches past 20`.

### Task 7: E2E and docs

**Files:**
- Modify: `apps/e2e/tests/support/app-api.ts` (`listSpaces`, `listUsers` read `items`; `findUserByEmail` uses `?search=`), `apps/e2e/tests/support/sessions.ts` (status only, unchanged), `apps/e2e/tests/admin/users.spec.ts`, `apps/e2e/tests/admin/spaces.spec.ts`, `apps/e2e/tests/space/navigation.spec.ts`, `apps/e2e/TEST-PLAN.md`, `docs/features/admin/admin-users.md`, `docs/features/admin/admin-spaces.md`, `docs/frontend-state.md` (SpaceStore loading), `docs/server-architecture.md` (paging helper in `shared/utils`), `CLAUDE.md` (a row for the paging contract)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the e2e tests:** Users with 25 extra users (API) — two pages, sort by role, search by part of an email (server-side: a user on page 2 found from page 1), the Active filter; invite a user → `search` for their email shows them, total +1; Spaces with 25 extra spaces — two pages, search by name; navigation — with 101 spaces (API, cleaned up), a link to the 101st by name opens it, and the switcher's search box finds it.
- [ ] **Step 2: Run** `pnpm build:prod && pnpm server:build && pnpm e2e:run tests/admin tests/space/navigation.spec.ts` — PASS (the features exist since Tasks 3–6; a failure here is a helper or a gap to fix).
- [ ] **Step 3: Update docs** (the listed files: contract, defaults, caps, allowed sorts and filters per endpoint, store loading 100 at a time).
- [ ] **Step 4: Run** `pnpm build`, `pnpm lint:fix`, then `CI=1 pnpm e2e:run` (full) — 0 failed, 0 flaky.
- [ ] **Step 5: Commit** `test(e2e): paging, sorting and search on Users and Spaces; docs`.

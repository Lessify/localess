# Spaces module: repositories that query, services that shape — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Spaces module reads with Drizzle relational queries in three repository shapes, transforms only in services, answers models that mirror their entities with optional relations, and the web works with those shapes.

**Architecture:** A shared `SpaceLookupRepository` (server `shared/`) replaces `shared/queries/space.query.ts` / `SpaceRow` for every module. The Spaces module's repositories return entities (`findAll`, `findAllCount`, `findOne`), writes return nothing, services re-read and map with `shared/transformers/space.transformer.ts`. New endpoints: `GET /api/app/spaces/names` (`IdName[]`) and `GET /api/app/spaces/:spaceId/environments`. `SpaceStore` keeps `IdName[]`, the selected `Space` and its environments.

**Tech Stack:** NestJS 12, Drizzle 0.45 (`relations()` + `db.query`), zod 4, Angular 22 + NgRx Signals, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-19-spaces-module-readability-design.md`

## Global Constraints

- Repository read shapes: `findAll(…): Promise<XEntity[] | XSelect[]>`, `findAllCount(…): Promise<number>`, `findOne(…): Promise<X | undefined>`; a repository never transforms, throws an HTTP error or calls a service.
- Relational queries (`db.query.<table>.findMany/findFirst({ with })`) by default; `select` only for calculations (counts, the overview).
- Writes in a repository return `Promise<void>`; the service re-reads with `findOne` and maps.
- Shared models mirror entities: the columns plus one optional field per relation of `infra/database/relations.ts`, same names; no computed fields.
- Every public method and exported function in `apps/server/src/modules/spaces/` declares its return type.
- v1 responses (CDN, Management) are byte-for-byte unchanged: `toPublicSpace` keeps `{ id, name, locales: {id,name}[] (position order), defaultLocale: {id,name}, createdAt, updatedAt }`; legacy-id resolution and the 503 while importing (`shared/http/space-id.ts`) unchanged.
- The sidebar list leaves out spaces with a `firebase_imports` row in `RUNNING` or `FAILED`, sorted by `lower(name)` then `id`.
- Space locales and environments are always ordered by `position`, then `createdAt`.
- Commit as `alexcibotari <alexandru.cibotari@gmail.com>`, no `Co-Authored-By`; only when the user asks.

## Review Focus

1. A space's locales order: two locales with the same position (old data) keep `created_at` order, as the SQL did — pin in Task 1's lookup test.
2. The v1 Management `GET /api/manage/v1/spaces/:spaceId` answer is unchanged — pin in Task 1 (`toPublicSpace` over the lookup result, exact object).
3. A write to a space, locale or environment that does not exist answers 404, not 500, now that repositories return nothing — pin in Task 2's service tests.
4. A space id restored from localStorage that is no longer in the `IdName[]` list falls back to the first space and never requests the stale one — pin in Task 3's store spec.
5. A space being imported shows in Admin → Spaces with its badge and Firestore id, but not in the sidebar list — pin in Task 2 (endpoint test) and Task 3 (admin component spec).

---

### Task 1: Shared space lookup replaces `space.query.ts` for every module (no API change)

**Files:**
- Create: `apps/server/src/shared/repositories/space-lookup.repository.ts`
- Modify: `apps/server/src/shared/entities/space.entity.ts` (add `SpaceWithLocales`)
- Modify: `apps/server/src/shared/shared.module.ts` (provide + export `SpaceLookupRepository`)
- Modify: `apps/server/src/shared/transformers/space.transformer.ts` (`toPublicSpace(space: SpaceWithLocales)`)
- Modify: `apps/server/src/shared/http/space-id.ts` (own `case` expression, no import from `space.query.ts`)
- Modify consumers: `modules/{assets,contents,schemas,tasks,translations}/**`, `infra/http/v1/v1-request.ts`, and `SpaceService.findPublic` in the Spaces module (every `findSpace`, `requireSpace`, `selectSpaces`, `SpaceRow`, `space.locales` outside the Spaces module's own repositories, which keep `space.query.ts` until Task 2)
- Delete: `modules/{assets,contents,schemas,tasks}/repositories/space.repository.ts`; `modules/translations/repositories/space-locale.repository.ts` (its reads move to the lookup)
- Test: `apps/server/test/space-lookup.test.ts`

**Interfaces:**
- Produces (`space.entity.ts`):
  `export type SpaceWithLocales = SpaceEntity & { defaultLocale: LocaleEntity; spaceLocales: (SpaceLocaleEntity & { locale: LocaleEntity })[] };`
- Produces (`SpaceLookupRepository`, injected as `spaceLookupRepository`):
  - `exists(spaceId: string, tx?: Transaction): Promise<boolean>` (false for a non-UUID id)
  - `findOne(spaceId: string, tx?: Transaction): Promise<SpaceWithLocales | undefined>` — `with: { defaultLocale: true, spaceLocales: { orderBy: [asc(position), asc(createdAt)], with: { locale: true } } }`
- Produces: `toPublicSpace(space: SpaceWithLocales): PublicSpace` (same object as today; `locales` = `spaceLocales.map(it => ({ id, name }))`).
- Consumers replace `space.locales` with `space.spaceLocales.map(it => it.locale)` (or `.locale.id`), keep `space.defaultLocaleId`; a missing space inside a transaction is a `NotFoundException` thrown by the calling repository's caller as today (`requireSpace` callers in `asset.repository.ts`, `content.repository.ts`, `schema.repository.ts`, `task.repository.ts`, `translation-snapshot.repository.ts` call `findOne(spaceId, t)` and throw `NotFoundException('Space not found')` where they did before — the behaviour is kept, the throw moves out of the shared helper into them).

- [ ] **Step 1: Write `apps/server/test/space-lookup.test.ts`**
  - `findOne` answers the space with `defaultLocale.id === 'en'` and `spaceLocales.map(it => it.locale.id)` equal to `['en', 'de', 'ro']` after inserting `space_locales` with positions `0, 1, 1` where `de` was created before `ro` (ties by `created_at`).
  - `findOne('not-a-uuid')` and an unknown UUID answer `undefined`; `exists` answers `true` / `false` likewise.
  - `findOne(id, tx)` inside `transaction(...)` sees a space inserted in that transaction.
  - `toPublicSpace(await findOne(id))` equals `{ id, name, locales: [{ id: 'en', name: 'English' }, …], defaultLocale: { id: 'en', name: 'English' }, createdAt: <iso>, updatedAt: <iso> }` exactly (no extra keys).
- [ ] **Step 2: Run** `cd apps/server && npx vitest run test/space-lookup.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement `SpaceLookupRepository`, `SpaceWithLocales`, the new `toPublicSpace`**, move every consumer, delete the files listed.
- [ ] **Step 4: Run** `cd apps/server && npx tsc --noEmit -p tsconfig.json && npx vitest run` — Expected: all pass (including `v1-cdn`, `manage-api`, `v1-import-window`, translations and contents suites, unchanged).
- [ ] **Step 5: Commit** (when asked): `refactor(server): SpaceLookupRepository replaces space.query.ts (relational read of a space with its locales)`

### Task 2: Spaces module — three read shapes, writes return nothing, models mirror entities, new endpoints

**Files:**
- Modify: `packages/shared/src/models/space.model.ts` — `Space`, `SpaceLocale`, `SpaceEnvironment` (below); remove `SpaceImportStatus` use from `Space`
- Create: `packages/shared/src/models/id-name.model.ts` (`export interface IdName { id: string; name: string }`), export from `index.ts`
- Modify: `apps/server/src/modules/spaces/repositories/{space,space-locale,space-environment,space-template,locale,space-overview}.repository.ts`, `space-change.ts`
- Modify: `apps/server/src/modules/spaces/services/{space,space-locale,space-environment,locale}.service.ts`
- Modify: `apps/server/src/modules/spaces/controllers/{space,space-locale,space-environment,space.management}.controller.ts`
- Modify: `apps/server/src/shared/transformers/space.transformer.ts` (`toSpace`, `toSpaceLocale`, `toSpaceEnvironment`)
- Delete: `apps/server/src/shared/queries/space.query.ts` (its last users are this module's repositories)
- Modify: `apps/server/test/architecture.test.ts` (return-type check)
- Test: `apps/server/test/app-spaces.test.ts`, `spaces-paging.test.ts`, `updated-at.test.ts`, `content-snapshots.test.ts`, `translation-snapshots.test.ts` (adjust), new `apps/server/test/space-environments.test.ts`

**Interfaces:**
- Consumes: `SpaceLookupRepository` is not used inside this module (it has its own `SpaceRepository.findOne`).
- Produces (shared models):
  ```ts
  export interface Space {
    id: string; name: string; defaultLocaleId: string; createdAt: Timestamp; updatedAt: Timestamp;
    defaultLocale?: Locale; spaceLocales?: SpaceLocale[]; environments?: SpaceEnvironment[]; firebaseImport?: FirebaseImport;
  }
  export interface SpaceLocale { spaceId: string; localeId: string; position: number; createdAt: Timestamp; locale?: Locale; space?: Space }
  export interface SpaceEnvironment { id: string; spaceId: string; name: string; url: string; position: number; createdAt: Timestamp; updatedAt: Timestamp; space?: Space }
  ```
  `firebaseImport` is the existing `FirebaseImport` model mapped by `toFirebaseImport`.
- Produces (repositories, every method with its declared return type):
  - `SpaceRepository.findAll(query: SpacePageable): Promise<SpaceSelect[]>` (`with: { firebaseImport: true }`, search/importing/sort as today); `findAllCount(query: SpacePageable): Promise<number>` (same where); `findAllNames(): Promise<Pick<SpaceEntity, 'id' | 'name'>[]>` (the sidebar filter, `lower(name)`, `id`); `findOne(spaceId: string): Promise<SpaceSelect | undefined>` (`with: { defaultLocale, spaceLocales (ordered) { locale } }`); `create(space: SpaceInsertEntity, tx?: Transaction): Promise<void>` (id chosen by the service); `rename(spaceId: string, name: string, tx?): Promise<void>`; `delete(spaceId: string, tx?): Promise<void>`.
  - `SpaceLocaleRepository.create | delete | reorder | setDefault(…): Promise<void>`.
  - `SpaceEnvironmentRepository.findAll(spaceId: string): Promise<SpaceEnvironmentEntity[]>` (position, createdAt); `findOne(spaceId: string, environmentId: string): Promise<SpaceEnvironmentEntity | undefined>`; `create | update | delete | reorder(…): Promise<void>`.
  - `space-change.ts`: `changeSpace(…): Promise<void>` (touch + `spaces` event, as today).
  - `SpaceTemplateRepository.createSpace(…): Promise<void>` with the space id passed in.
- Produces (services, all mapping in `space.transformer.ts`):
  - `SpaceService.findAll(query): Promise<Page<Space>>`, `findAllNames(): Promise<IdName[]>`, `findOne(spaceId): Promise<Space>` (404 `Space not found`), `create(…): Promise<Space>` (re-read), `rename(…): Promise<Space>`, `remove(…): Promise<void>`, `findTemplates`, `findOverview` unchanged in behaviour.
  - `SpaceLocaleService.create | remove | reorder | setDefault(…): Promise<Space>` (re-read with `SpaceRepository.findOne`).
  - `SpaceEnvironmentService.findAll(spaceId): Promise<SpaceEnvironment[]>` (404 for an unknown space); `create | update | remove | reorder(…): Promise<SpaceEnvironment[]>` (the list after the write; 404 `Environment not found` for an unknown environment).
- Produces (routes): `GET /api/app/spaces/names` → `IdName[]` (`@RequireAnyRole()`, declared before `:spaceId`); `GET /api/app/spaces/:spaceId/environments` → `SpaceEnvironment[]` (`@RequireAnyRole()`). Every other route keeps its path and permission; bodies answer the shapes above.

- [ ] **Step 1: Write the failing tests**
  - `spaces-paging.test.ts`: page items have `firebaseImport` for the imported spaces (`status: 'RUNNING'`, `'FAILED'`) and none for the others; no `locales` / `environments` / `importStatus` / `legacyId` keys.
  - `app-spaces.test.ts`: `GET /api/app/spaces/names` answers `[{ id, name }]` sorted case-insensitively, without the importing and failed spaces; `GET /api/app/spaces/:id` answers `defaultLocale` and `spaceLocales[].locale` in position order and no `environments`; `PUT …/locales/order`, `PUT …/default-locale`, `POST …/locales` answer that same shape; a write on an unknown space answers 404.
  - `space-environments.test.ts`: `GET …/environments` answers `[]` then the created ones in position order with `spaceId`, `position`; create/update/reorder/remove answer the list after; `PATCH`/`DELETE` an unknown environment → 404; an unknown space → 404.
  - `architecture.test.ts`: `it('every public method and exported function in modules/spaces declares its return type')` — fails today.
- [ ] **Step 2: Run** `cd apps/server && npx vitest run test/spaces-paging.test.ts test/app-spaces.test.ts test/space-environments.test.ts test/architecture.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the shared models, the repositories, services, transformers and controllers above; add return types across `modules/spaces/`; update the existing server tests that read the old shapes (`updated-at`, `content-snapshots`, `translation-snapshots`). Rebuild `packages/shared` before the server type-check.
- [ ] **Step 4: Run** `pnpm --filter @localess/shared build && cd apps/server && npx tsc --noEmit -p tsconfig.json && npx vitest run` — Expected: all pass. (`pnpm build` of the web is expected to fail until Task 3; do not commit Task 2 alone.)

### Task 3: Web — `SpaceStore` keeps `IdName[]`, the selected space and its environments; readers move to the relations

**Files:**
- Modify: `apps/web/src/app/core/services/space.service.ts` — `findAllNames(): Observable<IdName[]>` (live, `spaces` events), `findById(id: string): Observable<Space>` (live), `findEnvironments(spaceId: string): Observable<SpaceEnvironment[]>` (live, `spaces` events for that id), `findPage` as is; delete `findAllPages`; environment writes typed `Observable<SpaceEnvironment[]>`.
- Modify: `apps/web/src/app/core/stores/space.store.ts`
- Modify: `apps/web/src/app/core/guards/space-selection.guard.ts`, `features/features.component.{ts,html}`, `features/admin/spaces/spaces.component.{ts,html}`, `features/spaces/settings/general/general.component.html`, and every file the compiler lists reading `selectedSpace().locales | .environments | .defaultLocale` (about 35, under `features/spaces/{contents,translations,settings,dashboard}`, `shared/components/{locale-icon,translate-locale-dialog}`, `core/services/{locale,translation}.service.ts`, `shared/models/locale.model.ts`)
- Test: `core/stores/space.store.spec.ts`, `core/services/space.service.spec.ts`, `features/admin/spaces/spaces.component.spec.ts`, the specs of the changed readers

**Interfaces:**
- Consumes: Task 2's routes and models.
- Produces (`SpaceStore`): state `spaces: IdName[]`, `selectedSpace: Space | undefined`, `environments: SpaceEnvironment[]`; computed `locales: Signal<Locale[]>` = `selectedSpace()?.spaceLocales?.map(it => it.locale!) ?? []` (a web-side reading of the provided data, the one place it is derived) and `defaultLocale: Signal<Locale | undefined>` = `selectedSpace()?.defaultLocale`; `environment` resolved from `environments` as today (remembered id, else the first). `changeSpace(space: IdName)`. A selected id not in `spaces` falls back to `spaces[0]` before any `findById` request.
- Admin → Spaces: badge from `firebaseImport.status` (`RUNNING` → "Importing", `FAILED` → "Import failed", hints as today) and, when `firebaseImport` exists, the Firestore id `firebaseImport.sourceSpaceId` after the name (`<code>`). Settings → General: the "Imported from Firebase" line is removed.

- [ ] **Step 1: Write the failing specs**
  - `space.store.spec.ts`: loads `IdName[]` from `findAllNames`; selects the persisted id when listed, else the first, without calling `findById` for the stale id; on selection calls `findById` and `findEnvironments`; `locales()` follows `spaceLocales` order; `environment()` is the remembered one, else the first.
  - `space.service.spec.ts`: `findAllNames` GETs `/api/app/spaces/names`; `findEnvironments` GETs `/api/app/spaces/s1/environments`; both refetch on a `spaces` event.
  - `spaces.component.spec.ts`: a space with `firebaseImport: { status: 'RUNNING', sourceSpaceId: 'fb1' }` renders "Importing" and `fb1`; `FAILED` renders "Import failed"; none renders neither.
- [ ] **Step 2: Run** `pnpm test` — Expected: FAIL in those specs (and compile errors listing the readers).
- [ ] **Step 3: Implement** the service, store, guard, switcher, admin table, settings line, and move every reader to `spaceStore.locales()`, `spaceStore.defaultLocale()`, `spaceStore.environments()`.
- [ ] **Step 4: Run** `pnpm build && pnpm lint:fix && pnpm test` — Expected: build OK, lint clean, all specs pass.
- [ ] **Step 5: Commit Tasks 2 and 3 together** (when asked): `refactor(spaces): repositories query, services shape; Space mirrors its entity; IdName list, environments endpoint; SpaceStore`

### Task 4: E2E helpers and specs follow the new shapes

**Files:**
- Modify: `apps/e2e/tests/support/app-api.ts` — `SpaceDto` = `{ id; name; defaultLocaleId; defaultLocale?: {id,name}; spaceLocales?: { position: number; locale: {id,name} }[] }`; add `findSpaceEnvironments(id: string): Promise<{ id: string; name: string; url: string; position: number }[]>` (`GET /api/app/spaces/:id/environments`)
- Modify: `apps/e2e/tests/space/locales.spec.ts`, `space/environments.spec.ts`, `confirmations/cancel.spec.ts` (locales from `spaceLocales.map(it => it.locale)`, environments from `findSpaceEnvironments`), `space/general.spec.ts` if it asserts the Firebase line, `admin/*` for the badge if any

- [ ] **Step 1: Update the helpers and the specs above.**
- [ ] **Step 2: Run** `pnpm e2e` (CI=1 full run, one run at a time) — Expected: all pass, `failOnFlakyTests` green.
- [ ] **Step 3: Commit** (when asked): `test(e2e): spaces helpers read spaceLocales and the environments endpoint`

### Task 5: Docs

**Files:**
- Modify: `docs/server/controllers-services-repositories.md` (repository read shapes `findAll`/`findAllCount`/`findOne`, relational first, writes return `void`, the service re-reads and maps; `SpaceLookupRepository` for other modules), `docs/server/naming.md` (return types, scoped to `modules/spaces/` and widening per module; repository method names; models mirror entities with optional relations), `docs/server/architecture.md` (shared `space-lookup.repository.ts` replaces `shared/queries/space.query.ts`; "tables are shared, queries are not" allows `shared/repositories/` for a table every module reads), `docs/server/README.md` (the return-type check), `docs/frontend-state.md` (`SpaceStore`), `docs/features/admin/admin-spaces.md` (badge and Firestore id), `docs/features/spaces/settings.md` (General without the Firebase line, environments endpoint), `CLAUDE.md` (Server architecture / Naming rows)

- [ ] **Step 1: Update the docs above** to match Tasks 1–3.
- [ ] **Step 2: Run** `grep -rn "SpaceRow\|space.query\|findAllPages\|importStatus\|legacyId" docs CLAUDE.md apps/server/src apps/web/src --include=*.md --include=*.ts | grep -v superpowers` — Expected: no hits outside `shared/http/space-id.ts` (its own import status) and the v1 docs.
- [ ] **Step 3: Commit** (when asked): `docs: spaces read shapes, SpaceLookupRepository, models with relations, SpaceStore`

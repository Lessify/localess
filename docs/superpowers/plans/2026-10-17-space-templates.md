# Space Templates on the Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Space templates move to the server and are applied in the create transaction; a test-only template,
"Translations, large" (10,000 generated translations in English, German and French), is offered in development and
e2e and never in production; e2e tests start from it.

**Architecture:** Templates are typed data in the spaces module (`apps/server/src/modules/spaces/templates/`). A
`SpaceTemplatesRepository` creates the space (through `SpacesRepository.create(…, tx)`) and writes the template's
locales, schemas and translations in the same transaction. `LOCALESS_TEST_TEMPLATES` decides whether test templates are
listed and accepted. The web dialog lists templates from the server and sends the chosen id with the one create
request.

**Tech Stack:** NestJS 12 + Fastify, Drizzle/Postgres, zod, vitest (server); Angular 22 + Spartan (web); Playwright
1.64 (e2e).

**Spec:** [docs/roadmap/space-templates.md](../../roadmap/space-templates.md)

## Global Constraints

- Setting: `LOCALESS_TEST_TEMPLATES` (`true`/`false`), default `false`; never inferred from `NODE_ENV`.
- `pnpm dev` turns it on; a developer's `apps/server/.env` can still turn it off; `node dist/main.js` and the Docker
  image are untouched.
- Choosing a template other than Empty: Admin role, or `SCHEMA_CREATE` on top of `SPACE_MANAGEMENT` (today's rule,
  now enforced by the server). Empty (or no template): `SPACE_MANAGEMENT` only.
- Unknown template id, or a test template while the setting is off: 400, nothing created.
- Templates publish nothing and create no tokens (every space already gets the Auto Generated Preview Token).
- Generated data is a pure function: no randomness, no clock, no database reads. Ids (UUIDv7) and timestamps may differ.
- The four existing templates keep their content (ids, names, descriptions, icons, schemas) and their order: Empty,
  Blog, E-Commerce, Marketing Site. Test templates come after them.
- No commits unless the user asks (CLAUDE.md); never a `Co-Authored-By` trailer; commit as
  `alexcibotari <alexandru.cibotari@gmail.com>`.
- Small machine: builds, server tests and e2e runs one at a time, in this checkout only.
- Never run prettier on `.md` files.

### "Translations, large" data rule (`TRANSLATIONS_LARGE`)

Fixed by this plan; the server generator and the e2e expectations both follow it, written separately.

| | Rule |
|---|---|
| Locales | `en` (default, as every space), then `de`, `fr` |
| Fields (in order) | `title`, `subtitle`, `body`, `button`, `link`, `caption`, `hint`, `label`, `alt`, `footer` |
| Keys | `section{SS}.page{PP}.{field}`, SS = 01..20, PP = 01..50 (zero-padded): 20 × 50 × 10 = **10,000**, generated in that nested order |
| Value | `{Field} of section {s}, page {p} ({locale})`, numbers unpadded, field capitalised: `section07.page12.title` in `de` = `Title of section 7, page 12 (de)` |
| Labels | by section: 1–5 `marketing`, 6–10 `checkout`, 11–15 `account`, 16–20 `legal`; `button` keys also `cta` (after the section label) |
| Description | `title` keys only: `Page {p} of section {s}` |
| Gaps | page 50: no `fr` value (Partially Translated, 200 keys); page 49 `hint`: no value at all, `locales: {}` (Untranslated, 20 keys) |
| Counts | Translated 9,780 · Partially Translated 200 · Untranslated 20 · `legal` 2,500 · `cta` 1,000 |
| Display | name `Translations (large)`, description `10,000 translated keys in English, German and French. For testing.`, icon `lucideLanguages` |

## Review Focus

1. **The setting off in production**: `GET /api/app/spaces/templates` lists no test template and
   `POST /api/app/spaces { template: 'TRANSLATIONS_LARGE' }` answers 400 with no space created — Task 3 tests it with the
   switch off; Task 6 checks it against the Docker image.
2. **A failure mid-template leaves nothing**: no space, no locales, no schemas, no translations, no token — Task 3
   (rollback test).
3. **10,000 rows exceed Postgres' bind-parameter limit (65,535) in one insert**: inserts go in chunks of 1,000 — Task 3
   (the large template creates 10,000 rows).
4. **A custom user without `SCHEMA_CREATE` posts a template id directly** (bypassing the dialog): 403, nothing created
   — Task 3.
5. **`/api/app/spaces/templates` vs `/api/app/spaces/:spaceId`**: the static route answers, not a space lookup of id
   `templates` — Task 3 (the list test).

---

### Task 1: The `LOCALESS_TEST_TEMPLATES` setting

**Files:**
- Modify: `apps/server/src/infra/config/config.ts` (env schema next to `LOCALESS_TASK_WORKER`; `AppConfig`; `loadConfig`)
- Test: `apps/server/src/infra/config/config.test.ts`
- Create: `apps/server/dev.env`
- Modify: `apps/server/package.json` (`dev:node`), `apps/server/.env.example`, `docs/deployment/configuration.md`,
  `apps/e2e/playwright.config.ts` (`server()` env)

**Interfaces:**
- Produces: `AppConfig.testTemplates: boolean`

- [ ] **Step 1: Write the failing tests** in `config.test.ts`:
  `it('turns test templates off unless LOCALESS_TEST_TEMPLATES=true')` — `loadConfig({...base}).testTemplates === false`,
  `loadConfig({...base, LOCALESS_TEST_TEMPLATES: 'true'}).testTemplates === true`, `'false'` → `false`, `'yes'` throws.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/infra/config/config.test.ts` — FAIL (`testTemplates` undefined).
- [ ] **Step 3: Implement** `LOCALESS_TEST_TEMPLATES: z.enum(['true','false']).default('false').transform(v => v === 'true')`,
  `testTemplates` in `AppConfig` (doc comment: "LOCALESS_TEST_TEMPLATES: test-only space templates; development and e2e") and `loadConfig`.
- [ ] **Step 4: Run** the same command — PASS.
- [ ] **Step 5: Wire the environments.**
  - `apps/server/dev.env` (committed): a comment line and `LOCALESS_TEST_TEMPLATES=true`.
  - `dev:node`: `node --watch --enable-source-maps --env-file=dev.env --env-file-if-exists=.env dist-dev/main.js`
    (the later file wins, so `.env` overrides).
  - `.env.example`, "Workers and webhooks" section style: `# Test-only space templates (development and e2e; never in production).` / `#LOCALESS_TEST_TEMPLATES=false`.
  - `configuration.md`: row `| \`LOCALESS_TEST_TEMPLATES\` | \`false\` | Offer the test-only space templates (large generated data) — for development and e2e only; \`pnpm dev\` turns it on |`.
  - `playwright.config.ts` `server()` env: `LOCALESS_TEST_TEMPLATES: 'true'`.
- [ ] **Step 6: Verify** `pnpm server:build` succeeds.

### Task 2: Templates as server data, and the large generator

**Files:**
- Create: `apps/server/src/modules/spaces/templates/space-template.model.ts`, `empty.template.ts`, `blog.template.ts`,
  `ecommerce.template.ts`, `marketing.template.ts`, `translations-large.template.ts`, `index.ts`
- Test: `apps/server/src/modules/spaces/templates/templates.test.ts`,
  `apps/server/src/modules/spaces/templates/translations-large.template.test.ts`
- Source to move from: `apps/web/src/app/features/admin/spaces/templates/*.ts`, `space-template.model.ts`,
  `templates/templates.spec.ts` (web files are deleted in Task 4)

**Interfaces:**
- Produces:
  ```ts
  export type SpaceTemplateSchema = SchemaComponentExport | SchemaEnumExport; // from @localess/shared
  export interface TemplateTranslation { key: string; locales: Record<string, string>; labels?: string[]; description?: string }
  export interface SpaceTemplate {
    id: string; name: string; description: string; icon: string;
    test?: boolean;                               // offered only with config.testTemplates
    locales?: string[];                           // added after the default locale (en), in order
    schemas: SpaceTemplateSchema[];
    translations?: () => TemplateTranslation[];   // pure; called once per create
  }
  export const SPACE_TEMPLATES: readonly SpaceTemplate[]; // EMPTY, BLOG, ECOMMERCE, MARKETING, TRANSLATIONS_LARGE
  export const EMPTY_TEMPLATE_ID = 'EMPTY';
  export function largeTranslations(): TemplateTranslation[];
  ```

- [ ] **Step 1: Move the checks** of the web `templates.spec.ts` into `templates.test.ts` (vitest `describe/it`), over
  `SPACE_TEMPLATES`: order `['EMPTY','BLOG','ECOMMERCE','MARKETING','TRANSLATIONS_LARGE']`; only `TRANSLATIONS_LARGE`
  has `test: true`; every other existing check unchanged (non-empty name/description/icon, schema ids, references
  resolve, ENUM sources), plus: `zSchemaExportArraySchema.parse(template.schemas)` succeeds for each.
- [ ] **Step 2: Write** `translations-large.template.test.ts`:
  - `it('generates 10,000 keys in order')`: length 10000; `[0].key === 'section01.page01.title'`; `[9999].key === 'section20.page50.footer'`; keys unique.
  - `it('writes values that name their place and locale')`: `section07.page12.title` → `{ en: 'Title of section 7, page 12 (en)', de: 'Title of section 7, page 12 (de)', fr: 'Title of section 7, page 12 (fr)' }`, labels `['checkout']`, description `'Page 12 of section 7'`; `section03.page04.button` labels `['marketing','cta']`, no description.
  - `it('leaves the fixed gaps')`: `section01.page50.title` locales `{ en, de }` only; `section05.page49.hint` locales `{}`; statuses counted with the UI rule (all three non-empty = Translated, none = Untranslated, else Partially) → 9780 / 200 / 20; label counts `legal` 2500, `cta` 1000.
  - `it('is stable')`: `expect(largeTranslations()).toEqual(largeTranslations())` and a `createHash('sha256')` of `JSON.stringify` pinned to a literal (computed once, then fixed in the test).
- [ ] **Step 3: Run** `pnpm --filter @localess/server exec vitest run src/modules/spaces/templates` — FAIL (modules missing).
- [ ] **Step 4: Implement**: copy the four templates verbatim (imports from `@localess/shared`); `translations-large.template.ts`
  builds the array with nested loops over sections, pages, fields per the data rule table; `TRANSLATIONS_LARGE` =
  `{ id: 'TRANSLATIONS_LARGE', test: true, locales: ['de','fr'], schemas: [], translations: largeTranslations, … }`
  with the display values from the table. A comment above the generator restates the rule and its counts.
- [ ] **Step 5: Run** the same command — PASS (then fix the hash literal and run again).

### Task 3: The API — list templates, create with a template

**Files:**
- Create: `apps/server/src/modules/spaces/repositories/space-templates.repository.ts`
- Modify: `apps/server/src/modules/spaces/controllers/spaces.controller.ts`, `services/spaces.service.ts`,
  `spaces.module.ts`, `packages/shared/src/models/space.model.ts`
- Modify: `apps/server/src/modules/schemas/controllers/schemas.controller.ts` (remove `POST template`), and its tests in
  `apps/server/test/app-schemas.test.ts`; `zSchemaTemplateSchema` in `packages/shared/src/models/schema.zod.ts` if
  nothing else uses it
- Test: `apps/server/test/app-space-templates.test.ts`

**Interfaces:**
- Consumes: `SPACE_TEMPLATES`, `SpaceTemplate` (Task 2); `AppConfig.testTemplates` (Task 1); `SpacesRepository.create(name, defaultLocaleId, tx)`
- Produces:
  - shared: `export interface SpaceTemplateSummary { id: string; name: string; description: string; icon: string }`;
    `SpaceCreate { name: string; template?: string }`
  - `GET /api/app/spaces/templates` → `SpaceTemplateSummary[]` (`@RequirePermission(SPACE_MANAGEMENT)`)
  - `POST /api/app/spaces` body `{ name, template?: string }` (`z.string().min(1).max(64).optional()`)
  - `SpacesService.templates(user: UserRow): SpaceTemplateSummary[]`; `SpacesService.create(name: string, templateId: string | undefined, user: UserRow)`
  - `SpaceTemplatesRepository.createSpace(name: string, template: SpaceTemplate, tx?: Transaction): Promise<SpaceRow>`

- [ ] **Step 1: Write the failing tests** (`app-space-templates.test.ts`, two apps: `createTestApp({ LOCALESS_TEST_TEMPLATES: 'true' })` and `createTestApp()`; users via `userWithAccess`: admin, manager `['SPACE_MANAGEMENT']`, designer `['SPACE_MANAGEMENT','SCHEMA_CREATE']`):
  - `lists the templates in order, test ones only when turned on`: admin, switch on → ids `['EMPTY','BLOG','ECOMMERCE','MARKETING','TRANSLATIONS_LARGE']`, each with `name/description/icon` and no other keys; switch off → the first four.
  - `offers only Empty without SCHEMA_CREATE`: manager → `['EMPTY']`; designer → all four (switch off).
  - `creates a space from the Blog template in one request`: admin posts `{ name, template: 'BLOG' }` → 201; `GET …/schemas` names sorted = `['author','blogpost','blogtag','category']`; one token (preview).
  - `creates the large translations space`: switch on, `TRANSLATIONS_LARGE` → 201 within the test's default timeout; space locales `['en','de','fr']`, default `en`; 10,000 `translations` rows; row `section07.page12.title` matches the Task 2 sample; published translation CDN for `en` → 404; draft (preview token) `de` → `section07.page12.title` = `Title of section 7, page 12 (de)`.
  - `refuses an unknown template, and a test template while turned off`: `'NOPE'` → 400; switch off + `TRANSLATIONS_LARGE` → 400; space count unchanged.
  - `refuses a template to a user without SCHEMA_CREATE`: manager + `BLOG` → 403, space count unchanged; manager + `EMPTY` and without `template` → 201.
  - `rolls back everything when the template fails`: call `SpaceTemplatesRepository.createSpace('Broken', { …BLOG_TEMPLATE, locales: ['xx-not-a-locale'] })` → rejects; counts of `spaces`, `space_locales`, `tokens`, `schemas`, `translations` unchanged.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/app-space-templates.test.ts` — FAIL (404 on the list route).
- [ ] **Step 3: Implement.**
  - Repository `createSpace`: one `transaction(this.db, tx, …)`: `SpacesRepository.create(name, DEFAULT_LOCALE.id, t)`;
    insert `space_locales` for `template.locales` at positions 1..n; insert schemas mapped from the export format the
    way the removed `applyTemplate` controller did (`id` → `name`, `previewField`/`fields`/`values` when present), ids
    `newUuid()`; insert `template.translations?.()` in chunks of 1,000 (`id: newUuid()`, `spaceId`, `key`, `locales`,
    `labels ?? null`, `description ?? null`); return `requireSpace(t, id)`. No extra events (the `spaces` created event
    from `SpacesRepository.create` covers it), no draft drops (a new space has none).
  - Service: `offered(user)` = `SPACE_TEMPLATES` minus `test` ones unless `config.testTemplates`, minus non-Empty ones
    unless `canPerform(toPrincipal(user), SCHEMA_CREATE)`. `create`: no id → Empty; id not in `SPACE_TEMPLATES` or a
    `test` one while off → `BadRequestException('Unknown template')`; known but not offered → `ForbiddenException()`;
    then `toSpace(await this.templates.createSpace(name, template))`.
  - Controller: `@Get('templates')` declared before `@Get(':spaceId')`; create passes `@CurrentUser() user`.
  - Remove `POST /api/app/spaces/:spaceId/schemas/template` and its tests.
- [ ] **Step 4: Run** the new test file, `test/app-spaces.test.ts` and `test/app-schemas.test.ts` — PASS.
- [ ] **Step 5: Run** `pnpm server:test` and `pnpm shared:test` — PASS.

### Task 4: The web dialog uses the server's templates

**Files:**
- Modify: `apps/web/src/app/core/services/space.service.ts` (+ its spec), `features/admin/spaces/space-create-dialog/*`
  (component, html, model, spec), `features/admin/spaces/spaces.component.ts` (+ spec)
- Delete: `features/admin/spaces/templates/` (all), `space-template.model.ts`, `space-template.service.ts`,
  `space-template.service.spec.ts`

**Interfaces:**
- Consumes: `SpaceTemplateSummary`, `SpaceCreate.template` (Task 3)
- Produces: `SpaceService.templates(): Observable<SpaceTemplateSummary[]>` (`GET /api/app/spaces/templates`);
  `SpaceCreateDialogResult { name: string; template: string }`

- [ ] **Step 1: Write the failing tests** (HttpTestingController pattern, `docs/testing.md`):
  - `space.service.spec.ts`: `templates()` GETs `/api/app/spaces/templates`; `create({ name, template: 'BLOG' })` POSTs that body.
  - `space-create-dialog.component.spec.ts` (replace the role-based cases): with the server answering four templates →
    four radio cards, Empty checked; answering only `[EMPTY]` → no "Template" fieldset; Create closes with `{ name, template }`.
  - `spaces.component.spec.ts`: one `POST /api/app/spaces` with `{ name, template }`, success toast `Space has been created.`; on error `Space can not be created.`; no second request.
- [ ] **Step 2: Run** `pnpm test` — the new cases FAIL.
- [ ] **Step 3: Implement**: the dialog loads `templates()` on open (signal), shows the fieldset when more than one
  template is offered, form default `EMPTY`; register `lucideLanguages` beside the existing icons. `openAddDialog`
  sends `spaceService.create({ name, template })` once; delete the template-apply branch and warning. Remove
  `canChooseTemplate` and the `UserStore` use if nothing else needs them.
- [ ] **Step 4: Run** `pnpm test`, then `pnpm build` and `pnpm lint:fix` — PASS, clean.

### Task 5: E2E — the fixture option and the large-space tests

**Files:**
- Modify: `apps/e2e/tests/support/app-api.ts` (`createSpace`), `apps/e2e/tests/support/fixtures.ts` (`space`)
- Create: `apps/e2e/tests/support/large-translations.ts`, `apps/e2e/tests/translations/large-space.spec.ts`
- Run unchanged: `apps/e2e/tests/admin/space-templates.spec.ts`

**Interfaces:**
- Consumes: the API of Task 3; the data rule table (Global Constraints)
- Produces: `AppApi.createSpace(name: string, template?: string)`; fixture option `spaceTemplate: string | undefined`
  (`test.use({ spaceTemplate: 'TRANSLATIONS_LARGE' })`); in `large-translations.ts`: `LARGE = { locales: ['en','de','fr'], keys: 10_000, translated: 9_780, partly: 200, untranslated: 20 }`,
  `largeKey(section: number, page: number, field: string): string`, `largeValue(section, page, field, locale): string`
  (written from the table, not imported from the server)

- [ ] **Step 1: Fixture**: `spaceTemplate: [undefined, { option: true }]`; `space` calls `api.createSpace(uniqueName('E2E'), spaceTemplate)`.
- [ ] **Step 2: Write `large-space.spec.ts`** (`test.use({ spaceTemplate: 'TRANSLATIONS_LARGE' })`, page object
  `TranslationsPage`, pre-check → action → post-check, searches narrow enough that the virtual list renders every match):
  - `a new space has drafts and nothing published`: for each of `en, de, fr`, `GET /api/v1/spaces/:id/translations/:locale?token=<preview>` → 404 `File not found, Publish first.`; with `version=draft` → 200 and `section07.page12.title` = `largeValue(7, 12, 'title', locale)`.
  - `searches values in the chosen locale`: German, search `section 7, page 12 (de)` → keys `section07.page12.*` (10, sorted); the same text in English → none.
  - `filters by label and by status` (search by key narrows each to a few rows): label `cta` + search `section03.page04` → only `section03.page04.button`; status Untranslated + search `section01` → only `section01.page49.hint`; status Partially Translated + search `section02.page50` → the 10 `section02.page50.*` keys; status Translated + search `section02.page50` → none.
  - `the tree branches by section and page`: Tree layout → 20 roots `section01`…`section20`; expanding `section07` shows `page01`…`page50`; `page12` shows its 10 keys.
  - `adds, edits and removes one key among 10,000`: add `extra.key` (en `Extra`) → UI, reload, API (10,001 rows); edit `section07.page12.title` German value → UI, reload, API; delete `extra.key` → UI, reload, API (10,000).
  - `draft and published follow one English change`: publish (UI) → published `en` has `Title of section 7, page 12 (en)`; edit that value in English (UI) to `Changed` → draft `Changed`, published unchanged; publish → published `Changed`.
- [ ] **Step 3: Run** `pnpm build:prod && pnpm server:build`, then `pnpm --filter @localess/e2e exec playwright test tests/translations/large-space.spec.ts --repeat-each 5` — all green; tsc and prettier per the e2e skill.
- [ ] **Step 4: Run** `tests/admin/space-templates.spec.ts` unchanged — it must still pass (labels kept). The test
  template is not added to its table (creating 10,000 rows through the dialog is covered by the API test).

### Task 6: Production check, full suite, docs

**Files:**
- Create: `apps/e2e/tests/api/space-templates.spec.ts`
- Modify: `apps/e2e/README.md`, `apps/e2e/TEST-PLAN.md`, `docs/features/admin/admin-spaces.md`,
  `docs/roadmap/space-templates.md` (status → done), `CLAUDE.md` (knowledge-base row for the design)

- [ ] **Step 1: Write** `api/space-templates.spec.ts`: `@smoke` test `the production image offers no test templates`,
  `test.skip(!E2E_BASE_URL, 'only against a running server (the Docker image)')`: the list has no `TRANSLATIONS_LARGE`;
  creating with it → 400 and no space with that name. A second test, without `@smoke`, skipped when `E2E_BASE_URL` is
  set: the e2e server lists `TRANSLATIONS_LARGE`.
- [ ] **Step 2: Run** `CI=1 pnpm e2e:run` (background, once) — all green, no flakes; `pnpm e2e:smoke` against a local
  Docker image if one is built, otherwise left to the `e2e-docker` CI job.
- [ ] **Step 3: Docs**: README (fixture option `spaceTemplate`, the test templates and `LOCALESS_TEST_TEMPLATES`),
  TEST-PLAN rows (✅ + spec for each new scenario), admin-spaces.md (templates come from the server; one request), the
  design's status line, the CLAUDE.md table row
  `| Space templates on the server, test templates (LOCALESS_TEST_TEMPLATES, "Translations (large)") | docs/roadmap/space-templates.md | Space creation, templates, e2e test data |`.
- [ ] **Step 4: Report** to the user and ask before committing.

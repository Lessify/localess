# Space templates on the server, and test templates (design)

> Status: built (2026-10-17): [plan](../superpowers/plans/2026-10-17-space-templates.md). Related: [Admin → Spaces](../features/admin/admin-spaces.md) ·
> [Translations](../features/spaces/translations.md) · [Publish flow](../publish-flow.md) ·
> [E2E tests](../../apps/e2e/README.md), [test plan](../../apps/e2e/TEST-PLAN.md)

## Why

E2E tests build their own world before they can test anything: every translation, schema and document they need is
created through the App API, one call at a time. That is slow to run and buries the point of each test under setup.
A test that wants to check search, filters or the tree against a realistic number of translations can't afford to
create them at all, so today nothing tests the Translations page at scale.

The fix: **prepared spaces**. A test asks for a space made from a test template and starts with everything it needs,
filled by the server in one step, then changes only the one thing it tests.

To get there, space templates move from the web app to the server: the server lists them and applies one when it
creates a space, in the same transaction.

## Goals

1. **Templates live on the server.** The four templates offered today (Empty, Blog, E-Commerce, Marketing Site) move
   from `apps/web/src/app/features/admin/spaces/templates/` to the server, with the same content.
2. **The server lists the templates** a user can choose from; the Create Space dialog shows that list.
3. **Creating a space takes an optional template.** The server creates the space and everything the template holds
   in **one transaction**: the space is complete or not created at all. (Today the browser creates the space, then
   sends the schemas in a second request; when that fails the space stays, empty, with "Space has been created, but the
   template could not be applied.")
4. **Test templates**: offered only when the server runs for development or e2e, never in production.
5. **The first test template: "Translations, large"** (scope of this round; content templates come later).
6. **Stable output.** A template produces the same data on every machine and every run. E2E stability depends on it.
7. **E2E tests use it** through the `space` fixture, and a first set of translation tests is written on it.

## Non-goals

- Test templates for contents, schemas or assets (the next rounds; the design should let them be added without
  changes to the mechanism).
- Templates defined by users, or uploaded, or stored in the database.
- Remembering which template a space was made from.
- Changing the content of the four existing templates.
- **Permissions.** Tests run as the admin seeded from `LOCALESS_ADMIN_EMAIL` / `LOCALESS_ADMIN_PASSWORD`, which can do
  everything. User permissions will be reworked separately; per-permission rules for templates, and tests for users
  with different permissions, come with that work.
- New tokens: every space already gets the "Auto Generated Preview Token" in the creating transaction
  (`createPreviewToken`, `apps/server/src/shared/data-rules/space-tokens.ts`), which reads published and draft
  versions. Templates create none.

## Anti-goals (it fails even if it works)

- **A test template reachable in production**: listed, or accepted by the create request, on an install that did not
  turn them on deliberately.
- **Output that varies between runs**: random values, the clock, unordered iteration deciding what is generated.
  Generated ids (UUIDv7) and timestamps may differ; everything a test or a user can see (keys, values, labels,
  descriptions, which values are missing) may not.
- **A slow fill.** Setup must stay well under a second or two per space; 10,000 rows go in bulk inserts, not one
  insert per row.
- **Tests sharing a space they change.** Publishing covers every translation of a space at once, so a test that
  changes or publishes gets its own space.

## Decided

### Server

- **Templates are server code** (TypeScript data, typed like today's `SpaceTemplate`), in a module the spaces module
  uses. Every template has an `id`, `name`, `description`, `icon` (a lucide name, as today) and what it creates. A test
  template is marked as one (e.g. `test: true`).
- **List endpoint**: `GET /api/app/spaces/templates` → `{ id, name, description, icon }[]`, in display order (Empty
  first, as today). Test templates are included only when test templates are on.
  *Changed after review (2026-10-18):* the list is ids only (`SpaceTemplateId[]`, a union in `@localess/shared`);
  titles, descriptions and icons moved to the dialog, and Empty is no template at all (none sent: the space alone).
- **Create**: `POST /api/app/spaces` accepts an optional `template` (a template id). Absent means Empty. An unknown id,
  or a test template while they are off, is refused (400) and nothing is created.
- **One transaction**: the space, its default locale, the preview token (as today), then the template's locales,
  schemas and translations, then the events. Built on `SpaceRepository.create(name, defaultLocaleId, tx)` and the
  existing bulk writers (`SchemaRepository.createMany(…, tx)`, a bulk translation insert like
  `translation-import.repository.ts` `insertMany`), all with the same `tx`.

### Test templates are on in development and e2e, off in production

- One explicit setting, **off by default**: `LOCALESS_TEST_TEMPLATES=true|false` in `apps/server/src/infra/config/config.ts`
  (the `LOCALESS_TASK_WORKER` pattern), documented in `apps/server/.env.example` and
  `docs/deployment/configuration.md` ("for development and e2e only").
- **`pnpm dev` turns it on** without the developer editing anything, and the e2e server start
  (`apps/e2e/playwright.config.ts` `server()`) sets it.
- **Production** (the Docker image, `node dist/main.js`) never has it unless someone sets it on purpose. It is not
  inferred from `NODE_ENV`: a server started without `NODE_ENV` must not offer test templates.

### "Translations, large" (`translations_large`)

- **Locales**: English (default), German, French.
- **10,000 translation keys**, filled in every locale, except a fixed set of gaps (below).
- **Generated by a rule, not stored**: a pure function of its fixed constants. No randomness, no clock, no
  dependence on the database, the locale list order or iteration order of unordered collections. The same
  template always gives the same keys, values, labels and gaps.
- **Predictable shape**, so a test can work out what a search or filter must return:
  - keys at three levels, e.g. `section07.page12.title` (sections × pages × fields = 10,000), so the tree has real
    branches;
  - values that say where they come from, e.g. `Title 12 of page 7 (de)`, so a search in one locale finds only that
    locale's text;
  - labels on a fixed pattern (a few distinct labels, e.g. by section);
  - deliberate gaps on a fixed pattern (e.g. every 50th key has no French value, a few have an empty value), so the
    status filter finds Translated, Partially Translated and Untranslated keys;
  - descriptions on some keys, on a pattern.
- **Nothing is published.** A template writes the translations only; publishing stays the user's action, as in any
  space. A new space from it has drafts and no published version.
- The rule and its counts are written down next to the template (a comment or a short section in this document),
  so a test author can compute expectations without reading the generator.

### E2E

- The `space` fixture takes an option for the template (e.g. `test.use({ spaceTemplate: 'translations_large' })`);
  without it, a space is created as today. `AppApi.createSpace(name, template?)` passes it.
- Each test still gets its own space, deleted afterwards.
- E2E expectations are **written independently** of the server's generator: counts and a few literal keys and values
  in the spec or a small helper, not an import of the server code (a bug in the generator must fail a test, not be
  copied into its expectation).
- A first set of translation tests on the template (the agreed scenarios):
  - search in each locale; filter by label; filter by status; the tree's branches and counts;
  - add, edit and remove one key: in the UI, after a reload, through the API;
  - a new space: the published endpoint refuses every locale (404, "Publish first"), the draft (preview token)
    serves the generated values in every locale;
  - the CDN story (the test publishes first): change one English value → the draft (preview token) has the new value, the published version
    the old one → publish → the published version has the new value.
- The Docker smoke job (production image, setting off) checks that no test template is listed and that creating a
  space with one is refused.

### Web

- The Create Space dialog loads the templates from the server instead of `SPACE_TEMPLATES`, and sends the chosen id
  with the create request (one request). The two-step create, `SpaceTemplateService.apply()` and the "template could
  not be applied" warning go away.
- The dialog looks as it does today (radio cards with icon, name, description); a test template is shown like any
  other.

## Calls made in writing this (check these)

- **Setting name and default**: `LOCALESS_TEST_TEMPLATES`, off unless set.
- **Who may choose a template**: today's rule, now enforced by the server on the create request: a template other
  than Empty needs the Admin role, or `SCHEMA_CREATE` on top of `SPACE_MANAGEMENT`. The list endpoint offers templates
  only to those users, as the dialog does today.
  *Changed after review (2026-10-18):* a template is part of creating a space, so it needs exactly what creating one
  needs (`SPACE_MANAGEMENT`), nothing more.
- **The German and French locales** for the large template.
- **The old `POST /api/app/spaces/:spaceId/schemas/template`** route, used only by the web template apply: removed once
  nothing calls it.
- **Where this document lives**: `docs/roadmap/` with the other designs and to-dos.

## Left to the builder

- Module layout on the server (where templates and the generator live; one file per template as today).
- The exact generator constants (section, page and field counts; label names; gap pattern), as long as the shape and
  stability above hold and the rule is written down.
- How `pnpm dev` sets the switch (e.g. a committed dev env file loaded before `.env`, or the dev script), as long as a
  developer's `.env` can still override it and the production start is untouched.
- Moving `templates.spec.ts` checks (unique schema ids, references resolve, ENUM sources) to a server test, plus server
  tests for: the list with the switch on and off, create with each template, an unknown or disabled template refused
  with nothing created, a failure mid-template rolls back the space, and generator stability (two runs equal; a few
  fixed keys and values pinned).
- Updating `apps/e2e/tests/admin/space-templates.spec.ts` (it should pass unchanged, since the dialog keeps its
  labels), `docs/features/admin/admin-spaces.md`, `apps/e2e/README.md` and TEST-PLAN.md.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules
- **No AI attribution in commits:** Never add `Co-Authored-By:` trailers (e.g. `Co-Authored-By: Claude ...`) to commit messages.

## Commands

pnpm workspace (pnpm via `npm install -g pnpm`, not Corepack, which can't launch pnpm 12; version pinned by `packageManager`). Run everything from the root.

```bash
# Setup
pnpm install           # every workspace; install scripts are allow-listed in pnpm-workspace.yaml (allowBuilds)

# Development
pnpm dev               # one terminal: NestJS API on :3000 + Angular dev server on http://localhost:4200 (proxies /api to :3000)
                       # server: SWC → apps/server/dist-dev, restarts on change; `tsc --noEmit --watch` prints type errors (dev:types)
                       # env from apps/server/.env (gitignored); LOCALESS_ADMIN_EMAIL/PASSWORD seed an admin; embedded Postgres in .data at the repo root
pnpm server:dev        # the server part alone; `pnpm start` the Angular part alone

# Build
pnpm build             # Default build
pnpm build:prod        # Production build (apps/web/dist/browser, served by the server)
pnpm server:build      # Compile the server (apps/server/dist; builds packages/shared first)
docker compose up      # Server + Postgres 18 from the Dockerfile

# Code quality
pnpm lint              # ESLint check: web (angular-eslint), server, shared and e2e (typescript-eslint, type-aware, imports sorted); the server's also type-checks its tests
pnpm lint:fix          # Auto-fix lint issues
pnpm prettier          # Prettier check of the whole repository (CI); .prettierignore keeps docs, packages/ui and third-party copies out
pnpm prettier:fix      # Format the whole repository

# Testing
pnpm test              # Vitest + happy-dom (via Angular's @angular/build:unit-test builder); specs use Jasmine-style describe/it
pnpm test:scripts      # node:test suites for tools/scripts and packages/visual-editor-sync
pnpm server:test       # Server vitest suite (real embedded Postgres, one database per file)
pnpm shared:test       # packages/shared: type-check + vitest (models, zod validators, roles, locales)
pnpm e2e               # Playwright end-to-end tests (apps/e2e): builds SPA + server, runs them on a fresh embedded Postgres
pnpm e2e:run           # same, against the existing builds; `pnpm e2e:install` once to download Chromium
pnpm e2e:smoke         # only the @smoke critical path (~30 s), against the existing builds
pnpm demos             # product videos for the website (apps/e2e/demos) into apps/e2e/demo-videos (WebM; MP4 + poster with ffmpeg)

# Server CLI (apps/server/src/cli; needs `pnpm server:build` first)
pnpm localess <command>                       # db:migrate, check, admin:create --email <email>
pnpm localess:check                           # Health check of an installation
pnpm --filter @localess/server db:generate    # Generate a Drizzle migration after editing the schema

# Dependencies
pnpm --filter @localess/web add <pkg>         # add to one workspace; versions used by several workspaces go in the pnpm-workspace.yaml catalog ("catalog:")
```

## Architecture Overview

**Localess** is a Translation & Content Management System (CMS) built with Angular 22, NgRx Signals, and a self-hosted NestJS + Postgres server.

### Tech Stack
- **Frontend**: Angular 22 (standalone components, signals, OnPush), TypeScript 6.0 (Angular 22 requires it; the catalog pins it for every workspace)
- **State**: NgRx Signals (`@ngrx/signals`)
- **Backend**: NestJS 12 on Fastify (`apps/server/`, ESM), serving the API and the built SPA from one port
- **Database**: Postgres via Drizzle ORM; migrations in `apps/server/drizzle` run on every boot; `embedded-postgres` starts a local one when `DATABASE_URL` is unset
- **Auth**: Session cookies + argon2id passwords, Google/Microsoft via OIDC (`apps/server/src/auth`)
- **Storage**: Local disk driver (`apps/server/src/infra/storage`); an S3-compatible driver is an open decision (see docs/deployment/production.md)
- **UI**: Spartan/Helm component library (`packages/ui/`); Angular Material remains only as residual providers in `app.config.ts`
- **Styling**: Tailwind CSS 4 + SCSS
- **Rich Text**: TipTap editor

### Repository Layout

pnpm workspace monorepo (one root `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml`; run everything from the root):

```
apps/web/                  # @localess/web — Angular app (its own angular.json)
apps/server/               # @localess/server — NestJS server, Drizzle migrations in apps/server/drizzle
apps/e2e/                  # @localess/e2e — Playwright end-to-end tests against the built server + SPA
packages/shared/           # @localess/shared — domain contract used by server and web: models, enums, roles, locales, extractContent; zod validators in @localess/shared/zod
packages/ui/               # @localess/ui — Spartan/Helm components (source only), imported as @spartan-ng/helm/*
packages/visual-editor-sync/ # sync-v1.js for customer sites in the Visual Editor, built into the web assets
tools/scripts/             # repo tooling: version bump, version.json, locale flags generator
tools/openapi/             # third-party OpenAPI specs for code generation
docs/                      # project knowledge base (see table below)
```

Domain types are defined once in `packages/shared`: import them from `@localess/shared` in both apps (never redeclare a model on one side). The server compiles against its `dist` (`tsc -b` builds it first); the web app and the server tests read its source.

Workspace-specific commands: `pnpm --filter @localess/server <script>` (e.g. `db:generate`). pnpm is strict: a workspace can only import packages it declares in its own `package.json`.
Each workspace (and `tools/`) has a README with its commands and layout; the root README has the same map for humans. How the structure came about: [docs/roadmap/monorepo-structure.md](docs/roadmap/monorepo-structure.md).

### Application Structure

```
apps/web/src/app/
├── core/          # App-wide singletons and state (@core/*)
│   ├── api/       # Runtime config, SSE change events, liveQuery, apiInterceptor
│   ├── services/  # App API services used by several features or by a store
│   ├── stores/    # 3 NgRx Signal stores (UserStore, SpaceStore, LocalSettingsStore)
│   ├── guards/    # roleGuard, spaceSelectionGuard, dirty-form guard
│   └── error-handler/, title/, utils/
├── shared/        # Reusable UI only (@shared/*)
│   ├── components/# Dialogs, table, paginator, tree, filter-toolbar, locale-icon, logo, etc. (toasts via NotificationService/Sonner)
│   ├── models/    # UI-only model helpers (labels, icons, sorting, form shapes); domain types come from @localess/shared
│   └── pipes/, directives/, validators/ (cross-feature validators only)
├── features/      # Lazy-loaded feature routes; each owns the services, validators and models only it uses
│   ├── admin/     # Space & user administration
│   └── spaces/    # Main workspace: contents, translations, schemas, assets, tasks, dashboard
├── auth/          # Auth: login (Email, Google, Microsoft), reset
└── app.config.ts  # Root provider configuration (HTTP, interceptors, runtime config)

apps/server/src/   # NestJS server: infra/ (config, database, storage, events, http), auth/, modules/<feature>/ (service + /api/app and /api/v1 controllers), cli/ — see apps/server/README.md
```

### State Management

Three NgRx Signal stores initialized at app startup:
- **`UserStore`**: Auth state and the user's one role (loaded from `/api/auth/me`)
- **`SpaceStore`**: Selected workspace, content hierarchy, schemas, documents
- **`LocalSettingsStore`**: User preferences (persisted to localStorage)

### Routing & Guards

- Root redirects to `/features`, authenticated via `authGuard()`
- Feature routes use `roleGuard(list)` in `features-routing.module.ts`; the server enforces the same role lists (`packages/shared/src/roles.ts`: `ANY_ROLE`, `TRANSLATORS`, `CONTENT_WRITERS`, `DEVELOPERS`, `ADMINS`) with `@RequireRole` on every App API route
- All features are lazy-loaded

### Services Pattern

Domain services (in `core/services/`; services used by one feature live in that feature) call the App API (`/api/app/**`, session cookie + `X-Requested-With` header added by `apiInterceptor`). Live data uses `liveQueryWith(events, scope, fetch)`: the server publishes change events (`pg_notify` → SSE at `/api/app/events`) and the client refetches. The CDN API is served at `/api/v1/**` (`?token=`) and the Management API at `/api/manage/v1/**` (`Authorization: Bearer`), both with API tokens. Runtime config (login providers, etc.) comes from `GET /api/config`.

## Angular Code Conventions

These apply to all Angular code in this project (from `.github/copilot-instructions.md`):

- **Standalone components**: Do NOT add `standalone: true` in `@Component`/`@Directive`/`@Pipe` decorators (it's the default)
- **Change detection**: Always set `changeDetection: ChangeDetectionStrategy.OnPush` (the default since Angular 22, kept explicit); `Eager` only where documented (the CDK-based `ll-table`)
- **Signals**: Use `signal()` for local state, `computed()` for derived state; use `update()`/`set()`, never `mutate()`
- **Inputs/Outputs**: Use `input()` and `output()` functions, not `@Input()`/`@Output()` decorators
- **Injection**: Use `inject()` function, not constructor injection
- **Control flow**: Use `@if`, `@for`, `@switch` — not `*ngIf`, `*ngFor`, `*ngSwitch`
- **CSS bindings**: Use `[class]` bindings — not `ngClass`; use `[style]` bindings — not `ngStyle`
- **Host bindings**: Put in the `host` object of `@Component`/`@Directive` — not `@HostBinding`/`@HostListener`
- **Forms**: Reactive forms only (no template-driven)
- **Services**: `providedIn: 'root'` for singletons
- **Images**: Use `NgOptimizedImage` for static images
- **TypeScript**: Strict mode, avoid `any` (use `unknown`), prefer type inference
- **Templates**: type-checked strictly (`strictTemplates`); give a template typed values (a typed getter or lookup in the component) rather than `$any()` or an untyped `form.controls[name]`

## Git Commits

**Never create git commits unless the user explicitly asks.** Do not commit after making changes, after a migration, or at the end of a task. Only commit when the user says "commit" or "push".

## After Making Changes

After every code change, always run the following in order:

1. `pnpm build` — verify the project compiles without errors
2. `pnpm lint:fix` — auto-fix lint issues
3. `pnpm prettier:fix` — format (the whole repository: server, shared, e2e and tools included)

## Environment & Local Setup

Two Angular build configurations: `development` and `production`. In development, `pnpm dev` (or `pnpm start` alone) proxies `/api` to the server on :3000 (`apps/web/proxy.conf.cjs`). Server configuration is environment variables only — every one is listed with its default in [apps/server/.env.example](apps/server/.env.example); see also [apps/server/README.md](apps/server/README.md) and [docs/deployment/configuration.md](docs/deployment/configuration.md).

There is no in-app setup wizard. Start the server once with `LOCALESS_ADMIN_EMAIL` and `LOCALESS_ADMIN_PASSWORD` set to seed an admin (only when no users exist), or run `pnpm localess admin:create --email <email>`. Local data (embedded Postgres, uploaded files) lives in `.data` at the repo root (unless `LOCALESS_DATA_DIR` is set) and persists across restarts; delete it to start from scratch.

## Project Knowledge Base

Detailed documentation lives in `docs/`. Read the relevant file when working on the corresponding area:

| Topic | File | Read when working on |
|-------|------|----------------------|
| Domain concepts (Space, Content, Schema, Translation, Asset), **how localised values are stored** | [docs/concepts.md](docs/concepts.md) | Any new feature, onboarding, anything reading/writing a localised field |
| CDN caching, `cv` param, redirect logic, TTLs | [docs/cdn-caching.md](docs/cdn-caching.md) | `apps/server/src/modules/*/controllers/*.cdn.controller.ts`, `apps/server/src/infra/http/v1/` |
| V1 API — CDN API (`/api/v1`) and Management API (`/api/manage/v1`), endpoints, token types | [docs/v1-api.md](docs/v1-api.md) | Any `*.cdn.controller.ts` / `*.management.controller.ts` or `apps/server/src/infra/http/v1/` |
| Publish flow & cache invalidation | [docs/publish-flow.md](docs/publish-flow.md) | Content/translation publish, tasks |
| Webhooks — events, payload, HMAC signing, logging | [docs/webhooks.md](docs/webhooks.md) | `apps/server/src/modules/webhooks/`, webhook UI |
| API token types (public, preview, management), values, guards | [docs/auth-tokens.md](docs/auth-tokens.md) | Middleware, token management, public API |
| Frontend architecture, routing, packages/ui | [docs/frontend-architecture.md](docs/frontend-architecture.md) | Any Angular feature work |
| NgRx Signal stores, state patterns | [docs/frontend-state.md](docs/frontend-state.md) | Adding/editing stores or components |
| User roles (Admin, Developer, Editor, Translator, Viewer), the role lists, `@RequireRole`, route guards, `hasRole` | [docs/frontend-permissions.md](docs/frontend-permissions.md) | Auth, guards, user management, any new route or button that changes data |
| Spartan UI migration (checkbox, select, notifications) | [docs/spartan-ui-migration.md](docs/spartan-ui-migration.md) | Migrating Material → Spartan, dialogs, forms |
| **Shared components** (`ll-table`, `ll-paginator`, `ll-tree`, `ll-filter-toolbar`) — index, required doc structure | [docs/components/README.md](docs/components/README.md) | Anything in `apps/web/src/app/shared/components/`; read before adding or changing one |
| **Firebase → NestJS/Postgres migration** — plan, phases, progress log | [docs/roadmap/firebase-to-nestjs-postgres.md](docs/roadmap/firebase-to-nestjs-postgres.md), [apps/server/README.md](apps/server/README.md) | Anything in `apps/server/`, or replacing a Firebase dependency |
| Repository layout, workspaces, structure refactoring phases | [docs/roadmap/monorepo-structure.md](docs/roadmap/monorepo-structure.md) | Moving files between apps/packages, workspace scripts, Dockerfile |
| Import / Export (hidden behind `FEATURE_FLAGS.importExport`) — what is hidden, what must be fixed before turning it back on | [docs/roadmap/import-export.md](docs/roadmap/import-export.md) | Contents/Schemas/Assets/Translations import or export, Tasks page, `apps/server/src/modules/tasks/task-runner.service.ts` |
| **Server rules** — index of the normative server docs, how a rule is written, what checks them (`apps/server/test/architecture.test.ts`) | [docs/server/README.md](docs/server/README.md) | Before any server change |
| **Pagination** — `Page<T>` / `Pageable` (`@localess/shared`), `zPageable` (default direction per endpoint), `zMultiValue` (`status=A&status=B`), repository `findAll` + `findAllCount`, web `PagedList`, the step-by-step for a new paged list (Tasks); decision records: round 1, round 2 specs | [docs/server/pagination.md](docs/server/pagination.md) | Any list endpoint or table that may grow: page it on the server the same way |
| **Server architecture** — modules and layers (controller, service, transformer, repository), auth, transactions, the shared module, data rules, database entities (`shared/entities/<entity>.entity.ts`: `<Entity>Entity`, `<Entity>InsertEntity`, `<Entity>Select` with the relations of `infra/database/relations.ts`; never sent to the web) | [docs/server/architecture.md](docs/server/architecture.md) | Any code in `apps/server/src/`; read before adding or moving server code |
| **Controllers, services, repositories** — one set per entity and sub-entity (`space`, `space-locale`, `space-environment`), what each layer does, validation (`@Body({ schema: zX })`, the 400 body), request models defined once in `@localess/shared` (`<entity>.zod.ts`: `zX` + `X`, the web sends `X`), repositories that only query (`findAll` / `findAllCount` / `findOne`, relational first, writes answer nothing), `SpaceLookupRepository` for reading a space from any module | [docs/server/controllers-services-repositories.md](docs/server/controllers-services-repositories.md) | Adding or splitting a controller, service or repository |
| **Naming** — singular files and classes (`space-locale.service.ts` / `SpaceLocaleService`), NestJS method names (`findAll`, `findOne`, `find<What>`, `create`, `update`, `remove`), repository names (`findPage`, `delete`), request models `zX` / `X` (`<Entity>Create`, `<Entity>Update`, `<Entity><Action>`, `<Entity>Pageable`), response models mirroring their entity with optional relations, declared return types (Spaces so far) | [docs/server/naming.md](docs/server/naming.md) | Naming any server file, class, method or model |
| **Content and asset trees** — `parent_id` with cascade, slugs unique per parent, paths computed (`content-tree.query.ts`), the editor's folder map | [docs/roadmap/content-asset-tree.md](docs/roadmap/content-asset-tree.md) | Anything that creates, moves or deletes contents or assets, or needs a `fullSlug` |
| Asset name rules (TODO) — upload vs dialogs vs server: short names, duplicates, Edit Folder length | [docs/roadmap/asset-names.md](docs/roadmap/asset-names.md) | Asset upload, folder or file dialogs, asset name validation |
| Space templates on the server (one create transaction), test templates (`LOCALESS_TEST_TEMPLATES`: "Translations (large)", 10,000 generated keys; "Contents (all fields)", every field kind, files, nested blocks; "Assets (large)", 1,000 files in one folder; "Contents (large)", 2,000 documents) for prepared e2e spaces | [docs/roadmap/space-templates.md](docs/roadmap/space-templates.md), [docs/roadmap/contents-template.md](docs/roadmap/contents-template.md), [docs/roadmap/assets-template.md](docs/roadmap/assets-template.md), [docs/roadmap/contents-large-template.md](docs/roadmap/contents-large-template.md) | Space creation, `apps/server/src/modules/spaces/templates/`, the Create Space dialog, e2e test data (`spaceTemplate` fixture option) |
| Screen scenarios and recordings for the documentation (TODO) — a scenario and video per feature, doc screenshots, one realistic "Acme" space for every recording; kept apart from the e2e tests | [docs/roadmap/documentation-media.md](docs/roadmap/documentation-media.md) | The product videos (`apps/e2e/demos/`), docs media |
| Search for contents and assets (TODO) — none today; `?name=` stays a name prefix, search gets its own parameter; fields, matching, index, scope to decide | [docs/roadmap/search.md](docs/roadmap/search.md) | Contents or Assets lists, the pickers, the `?name=` filter of the App API |
| Reference field Path setting (TODO) — stored but unused by the picker since 2024; options: filter, open in folder, remove | [docs/roadmap/reference-path-filter.md](docs/roadmap/reference-path-filter.md) | Reference / References fields, the references picker dialog |
| Database structure review — per-table decisions (locales, default locale, environments), open TODOs | [docs/roadmap/database-structure.md](docs/roadmap/database-structure.md) | `apps/server/src/infra/database/schema.ts`, new tables or columns, space locales/environments |
| End-to-end tests (Playwright) — how a run works, fixtures, error guard, page objects, conventions; the test plan (what is covered, planned, bugs found); the product videos (`demos/`); the e2e skills (`writing-localess-e2e-tests`: one test or covering a whole feature; `playwright-best-practices`) and the Playwright Test Agents (`.claude/agents/`, drafts only) | [apps/e2e/README.md](apps/e2e/README.md), [apps/e2e/TEST-PLAN.md](apps/e2e/TEST-PLAN.md) | Any `apps/e2e/` test, or any UI change to a covered flow (labels, button names, dialogs, toasts are what the tests look for) |
| Frontend testing — Vitest setup (`test.isolate: true`), HttpTestingController + ChangeEventsService stub pattern for services | [docs/testing.md](docs/testing.md) | Any new/edited `*.spec.ts`, `apps/web/src/test-setup.ts` |
| UUIDv7 ids (`newUuid()`), `legacy_id` (assets only; a space's Firestore id is its `firebase_imports.source_space_id`, for old asset URLs), schema `name` / translation `key` / token `token` as references; the original migration plan, superseded by the space import | [docs/roadmap/firebase-migration-uuidv7.md](docs/roadmap/firebase-migration-uuidv7.md) | Any new table or id, schema/translation/token keys |
| **Deployment & self-hosting** | | |
| Deployment overview, requirements, ways to run, first admin, CLI | [docs/deployment/overview.md](docs/deployment/overview.md) | Any deployment/self-hosting question |
| Docker image & Compose | [docs/deployment/docker.md](docs/deployment/docker.md) | `Dockerfile`, `docker-compose.yml` |
| Every environment variable, OAuth provider setup | [docs/deployment/configuration.md](docs/deployment/configuration.md) | `apps/server/src/infra/config/`, login providers, storage |
| Reverse proxy, CDN, backups, multiple instances | [docs/deployment/production.md](docs/deployment/production.md) | Production hardening, scaling |
| Upgrades, migrations on boot, backup/restore, rollback | [docs/deployment/updates.md](docs/deployment/updates.md) | Releases, `apps/server/drizzle/` |
| Health check CLI (`pnpm localess:check`) vs `/api/health` | [docs/deployment/check.md](docs/deployment/check.md) | `apps/server/src/cli/check.ts`, `apps/server/src/infra/health/`, diagnosing a broken install |
| Importing spaces from a Firebase install (Admin → Spaces → Import from Firebase) | [docs/deployment/migrate-from-firebase.md](docs/deployment/migrate-from-firebase.md), [docs/roadmap/firebase-space-import.md](docs/roadmap/firebase-space-import.md) | `apps/server/src/modules/firebase-import/` |
| **Feature modules — Admin** | | |
| Admin overview (users, spaces, settings) | [docs/features/admin/overview.md](docs/features/admin/overview.md) | Any admin feature |
| Admin → Users | [docs/features/admin/admin-users.md](docs/features/admin/admin-users.md) | `features/admin/users/` |
| Admin → Spaces | [docs/features/admin/admin-spaces.md](docs/features/admin/admin-spaces.md) | `features/admin/spaces/` |
| **Feature modules — Spaces** | | |
| Spaces overview | [docs/features/spaces/overview.md](docs/features/spaces/overview.md) | Any space feature |
| Dashboard | [docs/features/spaces/dashboard.md](docs/features/spaces/dashboard.md) | `features/spaces/dashboard/` |
| Translations | [docs/features/spaces/translations.md](docs/features/spaces/translations.md) | `features/spaces/translations/` |
| Contents | [docs/features/spaces/contents.md](docs/features/spaces/contents.md) | `features/spaces/contents/` |
| Assets | [docs/features/spaces/assets.md](docs/features/spaces/assets.md) | `features/spaces/assets/` |
| Schemas | [docs/features/spaces/schemas.md](docs/features/spaces/schemas.md) | `features/spaces/schemas/` |
| Tasks | [docs/features/spaces/tasks.md](docs/features/spaces/tasks.md) | `features/spaces/tasks/` |
| Space Settings | [docs/features/spaces/settings.md](docs/features/spaces/settings.md) | `features/spaces/settings/` |
| Open API | [docs/features/spaces/open-api.md](docs/features/spaces/open-api.md) | `features/spaces/developers/open-api/` |
| **Feature modules — Me** | | |
| Me / User profile | [docs/features/me.md](docs/features/me.md) | `features/me/` |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules
- **No AI attribution in commits:** Never add `Co-Authored-By:` trailers (e.g. `Co-Authored-By: Claude ...`) to commit messages.

## Commands

```bash
# Development (two terminals)
npm run server:dev     # NestJS API on :3000 (embedded Postgres in server/.data; LOCALESS_ADMIN_EMAIL/PASSWORD seed an admin)
npm start              # Angular dev server on http://localhost:4200, proxying /api to :3000

# Build
npm run build          # Default build
npm run build:prod     # Production build (dist/localess/browser, served by the server)
npm run server:build   # Compile the server (server/dist)
docker compose up      # Server + Postgres 18 from the Dockerfile

# Code quality
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix lint issues
npm run prettier:fix   # Format code

# Testing
npm test               # Vitest + happy-dom (via Angular's @angular/build:unit-test builder); specs use Jasmine-style describe/it
npm run test:scripts   # node:test suite for scripts/ (*.test.mjs)
npm run server:test    # Server vitest suite (real embedded Postgres, one database per file)

# Server CLI (server/src/cli; needs `npm run server:build` first)
npm run localess -- <command>   # e.g. user:create, user:reset-password, migrate
npm run localess:check          # Health check of an installation
npm run localess:import         # One-off import from a Firebase install (import:firebase)
cd server && npm run db:generate # Generate a Drizzle migration after editing the schema
```

## Architecture Overview

**Localess** is a Translation & Content Management System (CMS) built with Angular 21+, NgRx Signals, and a self-hosted NestJS + Postgres server.

### Tech Stack
- **Frontend**: Angular 21 (standalone components, signals, OnPush)
- **State**: NgRx Signals (`@ngrx/signals`)
- **Backend**: NestJS 12 on Fastify (`server/`, ESM), serving the API and the built SPA from one port
- **Database**: Postgres via Drizzle ORM; migrations in `server/drizzle` run on every boot; `embedded-postgres` starts a local one when `DATABASE_URL` is unset
- **Auth**: Session cookies + argon2id passwords, Google/Microsoft via OIDC (`server/src/auth`)
- **Storage**: Local disk or S3-compatible driver (`server/src/storage`)
- **UI**: Spartan/Helm component library (`libs/ui/`); Angular Material remains only as residual providers in `app.config.ts`
- **Styling**: Tailwind CSS 4 + SCSS
- **Rich Text**: TipTap editor

### Application Structure

```
src/app/
├── core/          # Singleton services: error handler, HTTP interceptors, title service
├── shared/        # Cross-feature code
│   ├── models/    # TypeScript interfaces for all domain types
│   ├── services/  # Domain services calling the server's App API over HttpClient
│   ├── stores/    # 4 NgRx Signal stores (UserStore, SpaceStore, AppSettingsStore, LocalSettingsStore)
│   ├── guards/    # dirty-form.guard.ts (unsaved-changes guard); permission guards live in features-routing.module.ts
│   └── components/# Shared dialogs, table, paginator, tree, filter-toolbar, locale-icon, logo, etc. (toasts via NotificationService/Sonner)
├── features/      # Lazy-loaded feature routes
│   ├── admin/     # Space & user administration
│   └── spaces/    # Main workspace: contents, translations, schemas, assets, tasks, dashboard
├── auth/          # Auth: login (Email, Google, Microsoft), reset
└── app.config.ts  # Root provider configuration (HTTP, interceptors, runtime config)

server/src/        # NestJS server: auth, app-api (/api/app), public-api (/api/v1), events (SSE), tasks, webhooks, cli
server/drizzle/    # Drizzle SQL migrations
libs/ui/           # 44+ reusable Spartan/Helm UI components
```

### State Management

Four NgRx Signal stores initialized at app startup:
- **`UserStore`**: Auth state, role, granular permissions (loaded from `/api/auth/me`)
- **`SpaceStore`**: Selected workspace, content hierarchy, schemas, documents
- **`AppSettingsStore`**: Global UI settings
- **`LocalSettingsStore`**: User preferences (persisted to localStorage)

### Routing & Guards

- Root redirects to `/features`, authenticated via `authGuard()`
- Feature routes use `permissionGuard(...permissions)` in `features-routing.module.ts`; the server enforces the same permissions with `@RequirePermission` on every App API route
- All features are lazy-loaded

### Services Pattern

Domain services (in `shared/services/`) call the App API (`/api/app/**`, session cookie + `X-Requested-With` header added by `apiInterceptor`). Live data uses `liveQueryWith(events, scope, fetch)`: the server publishes change events (`pg_notify` → SSE at `/api/app/events`) and the client refetches. The public REST API is served at `/api/v1/**` with API tokens. Runtime config (login providers, etc.) comes from `GET /api/config`.

## Angular Code Conventions

These apply to all Angular code in this project (from `.github/copilot-instructions.md`):

- **Standalone components**: Do NOT add `standalone: true` in `@Component`/`@Directive`/`@Pipe` decorators (it's the default)
- **Change detection**: Always set `changeDetection: ChangeDetectionStrategy.OnPush`
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

## Git Commits

**Never create git commits unless the user explicitly asks.** Do not commit after making changes, after a migration, or at the end of a task. Only commit when the user says "commit" or "push".

## After Making Changes

After every code change, always run the following in order:

1. `npm run build` — verify the project compiles without errors
2. `npm run lint:fix` — auto-fix lint and prettier issues

## Environment & Local Setup

Two Angular build configurations: `development` and `production`. In development, `npm start` proxies `/api` to the server on :3000 (`proxy.conf.cjs`). Server configuration is environment variables only — see [server/README.md](server/README.md) and [docs/deployment/configuration.md](docs/deployment/configuration.md).

There is no in-app setup wizard. Start the server once with `LOCALESS_ADMIN_EMAIL` and `LOCALESS_ADMIN_PASSWORD` set to seed an admin (only when no users exist), or run `npm run localess -- user:create`. Local data (embedded Postgres, uploaded files) lives in `server/.data` and persists across restarts.

## Project Knowledge Base

Detailed documentation lives in `docs/`. Read the relevant file when working on the corresponding area:

| Topic | File | Read when working on |
|-------|------|----------------------|
| Domain concepts (Space, Content, Schema, Translation, Asset), **how localised values are stored** | [docs/concepts.md](docs/concepts.md) | Any new feature, onboarding, anything reading/writing a localised field |
| CDN caching, `cv` param, redirect logic, TTLs | [docs/cdn-caching.md](docs/cdn-caching.md) | `server/src/public-api/`, public API |
| V1 API — all endpoints, controllers, token permissions | [docs/v1-api.md](docs/v1-api.md) | Any work in `server/src/public-api/` |
| Publish flow & cache invalidation | [docs/publish-flow.md](docs/publish-flow.md) | Content/translation publish, tasks |
| Webhooks — events, payload, HMAC signing, logging | [docs/webhooks.md](docs/webhooks.md) | `server/src/webhooks/`, webhook UI |
| API token auth & permissions | [docs/auth-tokens.md](docs/auth-tokens.md) | Middleware, token management, public API |
| Frontend architecture, routing, libs/ui | [docs/frontend-architecture.md](docs/frontend-architecture.md) | Any Angular feature work |
| NgRx Signal stores, state patterns | [docs/frontend-state.md](docs/frontend-state.md) | Adding/editing stores or components |
| User roles, route guards, UI permissions | [docs/frontend-permissions.md](docs/frontend-permissions.md) | Auth, guards, user management |
| Spartan UI migration (checkbox, select, notifications) | [docs/spartan-ui-migration.md](docs/spartan-ui-migration.md) | Migrating Material → Spartan, dialogs, forms |
| **Shared components** (`ll-table`, `ll-paginator`, `ll-tree`, `ll-filter-toolbar`) — index, required doc structure | [docs/components/README.md](docs/components/README.md) | Anything in `src/app/shared/components/`; read before adding or changing one |
| **Firebase → NestJS/Postgres migration** — plan, phases, progress log | [docs/roadmap/firebase-to-nestjs-postgres.md](docs/roadmap/firebase-to-nestjs-postgres.md), [server/README.md](server/README.md) | Anything in `server/`, or replacing a Firebase dependency |
| Frontend testing — Vitest setup (`test.isolate: true`), HttpTestingController + ChangeEventsService stub pattern for services | [docs/testing.md](docs/testing.md) | Any new/edited `*.spec.ts`, `src/test-setup.ts` |
| Firebase data migration with UUIDv7 ids, reference rewrite, legacy ids (planned) | [docs/roadmap/firebase-migration-uuidv7.md](docs/roadmap/firebase-migration-uuidv7.md) | `server/src/firebase-import/`, id generation, schema/translation/token keys |
| **Deployment & self-hosting** | | |
| Deployment overview, requirements, ways to run, first admin, CLI | [docs/deployment/overview.md](docs/deployment/overview.md) | Any deployment/self-hosting question |
| Docker image & Compose | [docs/deployment/docker.md](docs/deployment/docker.md) | `Dockerfile`, `docker-compose.yml` |
| Every environment variable, OAuth provider setup | [docs/deployment/configuration.md](docs/deployment/configuration.md) | `server/src/config/`, login providers, storage |
| Reverse proxy, CDN, backups, multiple instances | [docs/deployment/production.md](docs/deployment/production.md) | Production hardening, scaling |
| Upgrades, migrations on boot, backup/restore, rollback | [docs/deployment/updates.md](docs/deployment/updates.md) | Releases, `server/drizzle/` |
| Health check CLI (`npm run localess:check`) vs `/api/health` | [docs/deployment/check.md](docs/deployment/check.md) | `server/src/cli/check.ts`, `server/src/health/`, diagnosing a broken install |
| Importing a Firebase install (`import:firebase`) | [docs/deployment/migrate-from-firebase.md](docs/deployment/migrate-from-firebase.md) | `server/src/firebase-import/` |
| **Feature modules — Admin** | | |
| Admin overview (users, spaces, settings) | [docs/features/admin/overview.md](docs/features/admin/overview.md) | Any admin feature |
| Admin → Users | [docs/features/admin/admin-users.md](docs/features/admin/admin-users.md) | `features/admin/users/` |
| Admin → Spaces | [docs/features/admin/admin-spaces.md](docs/features/admin/admin-spaces.md) | `features/admin/spaces/` |
| Admin → Settings | [docs/features/admin/admin-settings.md](docs/features/admin/admin-settings.md) | `features/admin/settings/` |
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

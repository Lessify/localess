# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start              # Dev server with proxy (http://localhost:4200)
npm run emulator       # Firebase emulator with persistence
npm run emulator:debug # Firebase emulator with debug output

# Build
npm run build          # Default build
npm run build:prod     # Production build (optimized)
npm run build:docker   # Docker-specific build

# Code quality
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix lint issues
npm run prettier:fix   # Format code

# Testing
npm test               # Karma + Jasmine test runner

# Firebase Functions (from /functions directory)
cd functions && npm run build   # Compile TypeScript functions
cd functions && npm run serve   # Run functions locally
```

## Architecture Overview

**Localess** is a Translation & Content Management System (CMS) built with Angular 21+, NgRx Signals, and Firebase.

### Tech Stack
- **Frontend**: Angular 21 (standalone components, signals, OnPush)
- **State**: NgRx Signals (`@ngrx/signals`)
- **Backend**: Firebase (Firestore, Auth, Storage, Functions, Hosting)
- **UI**: Angular Material + custom Spartan/Helm component library (`libs/ui/`)
- **Styling**: Tailwind CSS 4 + SCSS
- **Rich Text**: TipTap editor
- **Functions**: Express.js on Firebase Functions (Europe-west6)

### Application Structure

```
src/app/
├── core/          # Singleton services: error handler, HTTP interceptors, title service
├── shared/        # Cross-feature code
│   ├── models/    # TypeScript interfaces for all domain types
│   ├── services/  # 24+ Firebase-backed domain services
│   ├── stores/    # 4 NgRx Signal stores (UserStore, SpaceStore, AppSettingsStore, LocalSettingsStore)
│   ├── guards/    # Permission-based route guards using Firebase custom claims
│   └── components/# Shared dialogs, snackbars, logo
├── features/      # Lazy-loaded feature routes
│   ├── admin/     # Space & user administration
│   └── spaces/    # Main workspace: contents, translations, schemas, assets, tasks, dashboard
├── login/         # Auth (Email, Google, Microsoft)
├── setup/         # Initial setup wizard
└── app.config.ts  # Root provider configuration (Firebase, HTTP, etc.)

functions/src/     # Firebase Cloud Functions backend
libs/ui/           # 44+ reusable Spartan/Helm UI components
```

### State Management

Four NgRx Signal stores initialized at app startup:
- **`UserStore`**: Auth state, role, granular permissions (derived from Firebase custom claims)
- **`SpaceStore`**: Selected workspace, content hierarchy, schemas, documents
- **`AppSettingsStore`**: Global UI settings
- **`LocalSettingsStore`**: User preferences (persisted to localStorage)

### Routing & Guards

- Root redirects to `/features`, authenticated via `authGuard()`
- Feature routes use granular permission guards (e.g., `canManageTranslations`, `canReadSchemas`)
- All features are lazy-loaded

### Firebase Services Pattern

Domain services (in `shared/services/`) wrap Firestore CRUD operations. Functions are deployed to `europe-west6`. The public REST API is exposed via the `publicv1` Firebase Function rewrite at `/api/v1/**`.

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

## After Making Changes

After every code change, always run the following in order:

1. `npm run build` — verify the project compiles without errors
2. `npm run lint:fix` — auto-fix lint and prettier issues

## Environment & Emulator Setup

Three environment configurations: `development`, `production`, `docker`. Firebase emulators support Firestore, Auth, Storage, and Functions locally. The proxy config (`proxy.conf.cjs`) forwards API calls during development.

## Project Knowledge Base

Detailed documentation lives in `docs/`. Read the relevant file when working on the corresponding area:

| Topic | File | Read when working on |
|-------|------|----------------------|
| Domain concepts (Space, Content, Schema, Translation, Asset) | [docs/concepts.md](docs/concepts.md) | Any new feature, onboarding |
| CDN caching, `cv` param, redirect logic, TTLs | [docs/cdn-caching.md](docs/cdn-caching.md) | `functions/src/v1/cdn.ts`, public API |
| Publish flow & cache invalidation | [docs/publish-flow.md](docs/publish-flow.md) | Content/translation publish, tasks |
| API token auth & permissions | [docs/auth-tokens.md](docs/auth-tokens.md) | Middleware, token management, public API |
| Firebase billing & cost optimization | [docs/billing.md](docs/billing.md) | Functions, Storage, cost analysis |
| Frontend architecture, routing, libs/ui | [docs/frontend-architecture.md](docs/frontend-architecture.md) | Any Angular feature work |
| NgRx Signal stores, state patterns | [docs/frontend-state.md](docs/frontend-state.md) | Adding/editing stores or components |
| User roles, route guards, UI permissions | [docs/frontend-permissions.md](docs/frontend-permissions.md) | Auth, guards, user management |
| Spartan UI migration (checkbox, select, notifications) | [docs/spartan-ui-migration.md](docs/spartan-ui-migration.md) | Migrating Material → Spartan, dialogs, forms |
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
| Open API | [docs/features/spaces/open-api.md](docs/features/spaces/open-api.md) | `features/spaces/open-api/` |
| **Feature modules — Me** | | |
| Me / User profile | [docs/features/me.md](docs/features/me.md) | `features/me/` |

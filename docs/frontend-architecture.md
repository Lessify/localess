# Frontend Architecture

> Related: [State Management](frontend-state.md) · [User Roles & Permissions](frontend-permissions.md) · [Concepts](concepts.md) · [Spartan UI Migration](spartan-ui-migration.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone, zoneless, signals) |
| State | NgRx Signals (`@ngrx/signals`) |
| UI Components | Angular Material (being migrated) + Spartan/Helm (`libs/ui/`) |
| Styling | Tailwind CSS 4 + SCSS |
| Backend SDK | AngularFire (Firestore, Auth, Storage, Functions, Remote Config) |
| Rich Text | TipTap editor |
| Change Detection | `ChangeDetectionStrategy.OnPush` everywhere + `provideZonelessChangeDetection()` |

---

## Application Entry Points

```
src/
  app/
    app.config.ts          ← root providers (Firebase, router, Material, image loader)
    app-routing.ts         ← root routes + authGuard
    app.component.*        ← root shell
    core/                  ← singleton: error handler, HTTP interceptors, title service
    features/              ← all authenticated feature routes (lazy-loaded)
    auth/                  ← AuthModule: login/, reset/, setup/ (email / Google / Microsoft sign-in, password reset, first-run wizard)
    shared/                ← cross-feature: models, services, stores, guards, pipes
  environments/            ← firebase-config per environment
  assets/                  ← static files (version.json, icons)
libs/
  ui/                      ← 44+ reusable Spartan/Helm components
```

---

## Routing Structure

All authenticated routes live under `/features` and are protected by `authGuard()`:

```
/auth/login                         → LoginComponent (lazy, AuthModule)
/auth/reset                         → ResetComponent (lazy, AuthModule)
/auth/setup                         → SetupComponent (lazy, AuthModule)
/features/
  welcome                           → WelcomeComponent
  me/                               → profile, account settings
  spaces/:spaceId/
    dashboard                       → DashboardModule
    translations                    → TranslationsModule  [TRANSLATION_READ]
    contents                        → ContentsModule      [CONTENT_READ]
    assets                          → AssetsModule        [ASSET_READ]
    schemas                         → SchemasModule       [SCHEMA_READ]
    tasks                           → TasksModule         [TRANSLATION_READ]
    developers/                     → DevelopersModule (no route guard — see note below)
      webhooks, webhooks/:webhookId → WebhooksComponent / WebhookDetailComponent
      open-api                      → OpenApiComponent (nested under developers, not a standalone route)
    settings                        → SettingsModule      [SPACE_MANAGEMENT]
  admin/
    users                           → UsersModule         [USER_MANAGEMENT]
    spaces                          → SpacesModule        [SPACE_MANAGEMENT]
    settings                        → SettingsModule      [SETTINGS_MANAGEMENT]
```

Guards in brackets are Firebase `customClaims`-based (`AuthGuard` + `authGuardPipe`). `spaces/:spaceId/developers` (and its `webhooks`/`open-api` children) has no `canActivate` guard at the route level — access to those sections is only gated client-side via sidebar visibility (see [User Roles & Permissions](frontend-permissions.md)).

---

## Firebase Integration

All Firebase services are configured in `app.config.ts`:

- **Auth** — `indexedDBLocalPersistence` + `browserPopupRedirectResolver`; emulator on port 9099
- **Firestore** — `memory` local cache; emulator on port 8080
- **Storage** — emulator on port 9199
- **Functions** — region `europe-west6`; emulator on port 5001
- **Analytics** — screen tracking + user tracking
- **Performance** — automatic web vitals
- **Remote Config** — feature flags (e.g. `unsplash_ui_enable`)

---

## Image Loader

A custom `IMAGE_LOADER` is registered in `app.config.ts` that automatically appends `?w=<width>` for responsive asset resizing via the CDN:

```typescript
// Usage in templates (NgOptimizedImage)
<img ngSrc="/api/v1/spaces/.../assets/..." width="400" height="300" />
// → becomes: /api/v1/.../assets/...?w=400

// With thumbnail (for animated images/videos)
<img ngSrc="..." [loaderParams]="{ thumbnail: true }" />
// → becomes: /api/v1/.../assets/...?w=400&thumbnail=true
```

---

## `libs/ui/` Component Library

44+ headless components built on Radix-style primitives (Spartan/Helm pattern). Components include: `accordion`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `combobox`, `command`, `dialog`, `dropdown-menu`, `field`, `input`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `switch`, `tabs`, `textarea`, `toggle`, `tooltip`, `typography` and more.

Import from `@libs/ui/<component-name>`.

---

## `core/` Module

Singleton services initialized once at app startup:
- **ErrorHandler** — global Angular error handler, sends to logging
- **HTTP Interceptors** — request/response lifecycle hooks
- **Title Service** — dynamic `<title>` updates based on active route

---

## `shared/` Structure

```
shared/
  models/        ← TypeScript interfaces mirroring Firestore documents (frontend version)
  services/      ← 20+ AngularFire-backed CRUD services, one per domain entity
  stores/        ← 4 NgRx Signal stores (see frontend-state.md)
  guards/        ← dirty-form.guard (unsaved changes warning)
  components/    ← shared dialogs, snackbars, logo, breadcrumb, table (`ll-table`) + paginator (`ll-paginator`) — a Material-free MatTable/MatPaginator/MatSort replacement, see spartan-ui-migration.md
  directives/    ← custom Angular directives
  pipes/         ← custom Angular pipes
  validators/    ← custom reactive form validators
  generated/     ← auto-generated code (do not edit manually)
```

---

## Implementation Files

- `src/app/app.config.ts` — root provider configuration
- `src/app/app-routing.ts` — root routes and `authGuard`
- `src/app/features/features-routing.module.ts` — all feature routes and permission guards
- `libs/ui/` — shared component library

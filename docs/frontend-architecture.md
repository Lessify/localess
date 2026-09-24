# Frontend Architecture

> Related: [State Management](frontend-state.md) · [User Roles & Permissions](frontend-permissions.md) · [Concepts](concepts.md) · [Spartan UI Migration](spartan-ui-migration.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone, zoneless, signals) |
| State | NgRx Signals (`@ngrx/signals`) |
| UI Components | Spartan/Helm (`libs/ui/`); Angular Material only as residue in `app.config.ts` (see below) |
| Styling | Tailwind CSS 4 + SCSS |
| Backend SDK | AngularFire (Firestore, Auth, Storage, Functions, Remote Config) |
| Rich Text | TipTap editor |
| Change Detection | `ChangeDetectionStrategy.OnPush` everywhere + `provideZonelessChangeDetection()` |

---

## Application Entry Points

```
src/
  app/
    app.config.ts          ← root providers (Firebase, router, paginator defaults, image loader)
    app-routing.ts         ← root routes + authGuard
    app.component.*        ← root shell
    core/                  ← singleton: error handlers, HTTP interceptors, title strategy, utils
    features/              ← all authenticated feature routes (lazy-loaded)
    auth/                  ← AuthModule: login/, reset/, shared/ (email / Google / Microsoft sign-in, password reset)
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
/features/                          → redirects to welcome
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

`features/whats-new/` holds the What's New dialog (`WhatsNewDialogComponent` + `whats-new.data.ts`). It is opened from the sidebar in `features.component`, which shows an "unseen" marker while the newest entry's version is newer than `LocalSettingsStore.lastSeenWhatsNewVersion`.

---

## Firebase Integration

All Firebase services are configured in `app.config.ts`:

- **Auth** — `indexedDBLocalPersistence` + `browserPopupRedirectResolver`; emulator on port 9099
- **Firestore** — `memory` local cache; emulator on port 8080
- **Storage** — emulator on port 9199
- **Functions** — region from `environment.functions.region` (`europe-west6` in dev/docker; production injects `LOCALESS_REGION` at build time); emulator on port 5001
- **Analytics** — screen tracking + user tracking
- **Performance** — automatic web vitals
- **Remote Config** — feature flags (e.g. `unsplash_ui_enable`)

Angular Material residue: `app.config.ts` still registers `provideNativeDateAdapter()` and `MAT_PAGINATOR_DEFAULT_OPTIONS` (the latter has no remaining consumer — `ll-paginator` reads `PAGINATOR_DEFAULT_OPTIONS`). No `MatDialog` usage remains; dialogs use `HlmDialogService`.

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

Import from `@spartan-ng/helm/<component-name>` (path aliases in `tsconfig.json` map these to `libs/ui/<component-name>/src/index.ts`).

---

## `core/` Module

Singleton services initialized once at app startup:
- **`AppErrorHandler`** (`error-handler/app-error-handler.service.ts`) — global Angular error handler. Shows an error toast via `NotificationService`, then delegates to the default handler (console). Chunk-load failures (a stale tab after a deploy) instead show a persistent "A new version is available" toast with a Reload action.
- **`FormErrorHandlerService`** (`error-handler/form-error-handler.service.ts`) — maps reactive-form control errors to display messages
- **HTTP Interceptors** — request/response lifecycle hooks
- **`PageTitleStrategy`** (`title/page-title.strategy.ts`) — a `TitleStrategy` that sets `<title>` to `<appName> - <route title>`
- **`utils/`** — stateless helpers: `filter-predicate-utils`, `name-utils`, `object-utils`

---

## `shared/` Structure

```
shared/
  models/        ← TypeScript interfaces mirroring Firestore documents (frontend version)
  services/      ← 20+ AngularFire-backed CRUD services, one per domain entity
  stores/        ← 4 NgRx Signal stores (see frontend-state.md)
  guards/        ← dirty-form.guard (unsaved changes warning)
  components/    ← tree, table, paginator, filter-toolbar (see components/README.md), locale-icon, asset-card, background, logo,
                   confirmation-dialog, image-preview-dialog, translate-locale-dialog, unsplash-assets-select-dialog, dialog (width constants)
  directives/    ← custom Angular directives
  pipes/         ← custom Angular pipes (incl. `canUserPerform`, see frontend-permissions.md)
  validators/    ← custom reactive form validators
  generated/     ← auto-generated code (do not edit manually)
```

---

## Implementation Files

- `src/app/app.config.ts` — root provider configuration
- `src/app/app-routing.ts` — root routes and `authGuard`
- `src/app/features/features-routing.module.ts` — all feature routes and permission guards
- `libs/ui/` — shared component library

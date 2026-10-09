# Frontend Architecture

> Related: [State Management](frontend-state.md) · [User Roles & Permissions](frontend-permissions.md) · [Concepts](concepts.md) · [Spartan UI Migration](spartan-ui-migration.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 21 (standalone, zoneless, signals) |
| State | NgRx Signals (`@ngrx/signals`) |
| UI Components | Spartan/Helm (`packages/ui/`); Angular Material only as residue in `app.config.ts` (see below) |
| Styling | Tailwind CSS 4 + SCSS |
| Backend access | `HttpClient` against the NestJS server (`/api/auth`, `/api/app`, `/api/config`); live updates over SSE (`/api/app/events`) |
| Rich Text | TipTap editor |
| Change Detection | `ChangeDetectionStrategy.OnPush` everywhere + `provideZonelessChangeDetection()` |

---

## Application Entry Points

```
apps/web/src/
  app/
    app.config.ts          ← root providers (HttpClient + apiInterceptor, runtime config, router, paginator defaults, image loader)
    app-routing.ts         ← root routes + authGuard
    app.component.*        ← root shell
    core/                  ← app-wide: api/ (runtime config, SSE, liveQuery, apiInterceptor), services/, stores/, guards/, error handlers, HTTP interceptors, title strategy, utils
    features/              ← all authenticated feature routes (lazy-loaded)
    auth/                  ← AuthModule: login/ (email + Google / Microsoft redirect), reset/ (request link), reset-confirm/ (set new password)
    shared/                ← reusable UI: components, pipes, directives, cross-feature validators, UI model helpers
  environments/            ← build-time constants only (appName, production, version)
  assets/                  ← static files (version.json, icons)
packages/ui/               ← 44+ reusable Spartan/Helm components (imported as @spartan-ng/helm/*)
```

---

## Routing Structure

All authenticated routes live under `/features` and are protected by `authGuard()`:

```
/auth/login                         → LoginComponent (lazy, AuthModule)
/auth/reset                         → ResetComponent (lazy, AuthModule)
/auth/reset/confirm?token=          → ResetConfirmComponent (from the reset email or an admin-issued link)
/features/                          → redirects to welcome
  welcome                           → WelcomeComponent
  me/                               → profile, account settings
  spaces/:spaceId/
    dashboard                       → DashboardModule
    translations                    → TranslationsModule  [TRANSLATION_READ]
    contents                        → ContentsModule      [CONTENT_READ]
    assets                          → AssetsModule        [ASSET_READ]
    schemas                         → SchemasModule       [SCHEMA_READ]
    tasks                           → TasksModule         [any *_EXPORT / *_IMPORT]
    developers/                     → DevelopersModule (no route guard — see note below)
      webhooks, webhooks/:webhookId → WebhooksComponent / WebhookDetailComponent
      open-api                      → OpenApiComponent (nested under developers, not a standalone route)
    settings                        → SettingsModule      [SPACE_MANAGEMENT]
  admin/
    users                           → UsersModule         [USER_MANAGEMENT]
    spaces                          → SpacesModule        [SPACE_MANAGEMENT]
    settings                        → SettingsModule      [SETTINGS_MANAGEMENT]
```

Guards in brackets are `permissionGuard(...)` (`core/guards/permission.guard.ts`), reading role and permissions from `UserStore`; the server enforces the same permissions on every `/api/app` call. `spaces/:spaceId/developers` (and its `webhooks`/`open-api` children) has no `canActivate` guard at the route level — access to those sections is only gated client-side via sidebar visibility (see [User Roles & Permissions](frontend-permissions.md)).

`features/whats-new/` holds the What's New dialog (`WhatsNewDialogComponent` + `whats-new.data.ts`). It is opened from the sidebar in `features.component`, which shows an "unseen" marker while the newest entry's version is newer than `LocalSettingsStore.lastSeenWhatsNewVersion`.

---

## Server Integration

The SPA is served by the NestJS server on the same origin as the API, so every call is a relative `/api/...` URL and the session cookie travels automatically. In development `pnpm start` proxies `/api` to the server (`proxy.conf.cjs`).

- **`apiInterceptor`** (`core/api/api.interceptor.ts`) — adds `X-Requested-With: XMLHttpRequest` to every `/api/` request (the server's CSRF rule for cookie-authenticated writes), and treats a `401` from `/api/app/**` or `/api/auth/me` as signed out: `UserStore.signedOut()` and a redirect to `/auth/login`.
- **`AppConfigService`** (`core/api/app-config.service.ts`) — loads `GET /api/config` in `provideAppInitializer` before the first render: login providers, login message, whether password reset by email is available, Unsplash plugin, machine translation enabled. This replaced the build-time `LOCALESS_*` defines, `firebase-config*.json` and Remote Config, so one build serves every install. Falls back to defaults (everything off) if the call fails.
- **`ChangeEventsService`** (`core/api/change-events.service.ts`) — one shared `EventSource` on `GET /api/app/events[?spaceId=]` per space (or one global), closed with its last subscriber. Events are `{ spaceId, entity, id?, op }`; after a reconnect it emits a resync event (`entity: '*'`) because events sent while disconnected are lost.
- **`liveQuery(scope, fetch)`** (`core/api/live-query.ts`) — the replacement for Firestore's `collectionData`/`docData`: fetches once, then refetches (debounced 100 ms) whenever a matching change event arrives. Services return these long-lived Observables, so components did not change.
- **Auth** — email/password via `POST /api/auth/login`; Google / Microsoft are full-page redirects to `/api/auth/oauth/{google,microsoft}` (no popups); sign-out is `POST /api/auth/logout`. `UserStore` reads the session from `GET /api/auth/me`.
- **Uploads** — multipart `HttpClient` requests with progress (`reportProgress`); the server streams them to storage and returns the finished asset.

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

## `packages/ui/` Component Library

44+ headless components built on Radix-style primitives (Spartan/Helm pattern). Components include: `accordion`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `combobox`, `command`, `dialog`, `dropdown-menu`, `field`, `input`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `sheet`, `sidebar`, `skeleton`, `sonner`, `spinner`, `switch`, `tabs`, `textarea`, `toggle`, `tooltip`, `typography` and more.

Import from `@spartan-ng/helm/<component-name>` (path aliases in `tsconfig.json` map these to `packages/ui/<component-name>/src/index.ts`).

---

## `core/` Module

App-wide singletons and state (`@core/*`). Rule: if more than one feature (or a store) uses it, it lives here;
if one feature uses it, it lives in that feature.

- **`services/`** — App API services (`HttpClient`, reads are `liveQuery`s) used by several features or by a store
- **`stores/`** — the 4 NgRx Signal stores (see [frontend-state.md](frontend-state.md))
- **`guards/`** — `permissionGuard`, `spaceSelectionGuard`, the dirty-form (unsaved changes) guard
- **`utils/content-data.ts`** — `normalizeContent`, `copyBlock`: the shape documents are loaded, compared and saved in
- **`AppErrorHandler`** (`error-handler/app-error-handler.service.ts`) — global Angular error handler. Shows an error toast via `NotificationService`, then delegates to the default handler (console). Chunk-load failures (a stale tab after a deploy) instead show a persistent "A new version is available" toast with a Reload action.
- **`FormErrorHandlerService`** (`error-handler/form-error-handler.service.ts`) — maps reactive-form control errors to display messages
- **HTTP Interceptors** — `apiInterceptor` (`api/`, see above) and `HttpErrorInterceptor` (`http-interceptors/`), which reports HTTP errors to `AppErrorHandler` except `401`s from the API, which are left to the auth flow
- **`api/`** — `AppConfigService`, `ChangeEventsService`, `liveQuery`, `apiInterceptor` (see [Server Integration](#server-integration))
- **`PageTitleStrategy`** (`title/page-title.strategy.ts`) — a `TitleStrategy` that sets `<title>` to `<appName> - <route title>`
- **`utils/`** — stateless helpers: `filter-predicate-utils`, `name-utils`, `object-utils`

---

## `shared/` Structure

```
shared/           ← reusable UI only (`@shared/*`)
  models/        ← UI-only model helpers (labels, icons, sorting, form shapes). The API's JSON shapes themselves
                   (timestamps are ISO strings), enums and permission rules come from `@localess/shared` (packages/shared)
  components/    ← tree, table, paginator, filter-toolbar (see components/README.md), locale-icon, asset-card, background, logo,
                   confirmation-dialog, image-preview-dialog, translate-locale-dialog, unsplash-assets-select-dialog, dialog (width constants)
  directives/    ← custom Angular directives
  pipes/         ← custom Angular pipes (incl. `canUserPerform`, see frontend-permissions.md)
  validators/    ← reactive form validators used by more than one feature (`common`, `space`); single-feature validators
                   live in their feature (e.g. `features/spaces/schemas/shared/schema.validator.ts`)
  generated/     ← auto-generated code (do not edit manually)
```

---

## Security Headers

The server sets browser security headers on every non-API response (`apps/server/src/infra/static/static-site.ts`, an `onSend` hook skipped for `/api/**`). That's on purpose: `/api/v1` assets must stay embeddable on customer sites, and they send their own sandbox CSP (`apps/server/src/modules/assets/asset-headers.ts`). The same file gives hashed bundles `public,max-age=31536000,immutable` and `index.html` / `ngsw*` `no-cache`; `SpaFallbackFilter` serves `index.html` for unknown non-API GETs.

| Header | Value |
|---|---|
| `Content-Security-Policy-Report-Only` | The app's CSP. **Report-only for now:** browsers log violations to the console but block nothing. |
| `X-Frame-Options` | `SAMEORIGIN`. Enforced now, because `frame-ancestors` has no effect in report-only mode. |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

How the CSP is built:

- **Scripts** allow only `'self'`, with no `'unsafe-inline'`. That is why the theme bootstrap lives in `apps/web/src/scripts/theme-init.js` rather than an inline `<script>` in `index.html`. OAuth sign-in is a full-page redirect, so no identity-provider scripts are needed.
- **The one inline handler** in the production `index.html` is `onload="this.media='all'"`, which Angular's critical-CSS inlining adds. It is allowed by its hash through `'unsafe-hashes'`. If Angular changes that handler, the hash must be updated. A production build plus `grep onload apps/web/dist/browser/index.html` shows the current one.
- **Styles** need `'unsafe-inline'`: Angular component styles, Spartan and the inlined critical CSS all depend on it. Google Fonts are allowed for styles and fonts.
- **Connections** allow `'self'` plus `https://api.github.com` (the release check).
- **Frames** allow `https:` plus `http://localhost` / `http://127.0.0.1`, because visual-editor preview environments can be any site.
- **Adding a new external origin** (a script CDN, an API the browser calls directly, a font host) means adding it to the matching directive in `static-site.ts`, or the browser reports it, and after the switch blocks it.

**Switching to enforcing.** Watch the browser console in production for `[Report Only]` CSP messages, especially on login with Google or Microsoft, the Open API page (Stoplight Elements), the contents editor with preview, and assets with Unsplash. Once it stays clean, rename the header key `content-security-policy-report-only` to `content-security-policy` in `static-site.ts` and redeploy the server.

## Implementation Files

- `apps/web/src/app/app.config.ts` — root provider configuration
- `apps/web/src/app/core/api/` — runtime config, change events (SSE), `liveQuery`, `apiInterceptor`
- `apps/web/src/app/app-routing.ts` — root routes and `authGuard`
- `apps/web/src/app/features/features-routing.module.ts` — all feature routes and permission guards
- `apps/server/src/infra/static/static-site.ts` — static serving, cache and security headers
- `packages/ui/` — shared component library

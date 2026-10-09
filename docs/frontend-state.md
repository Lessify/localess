# Frontend State Management

> Related: [Frontend Architecture](frontend-architecture.md) · [User Roles & Permissions](frontend-permissions.md)

## Overview

State is managed with **NgRx Signals** (`@ngrx/signals`). Four global signal stores are provided at root level and initialized at app startup. All stores use `patchState` for updates — never mutate signal state directly.

---

## Store Overview

| Store | Key | Persisted | Purpose |
|-------|-----|-----------|---------|
| `UserStore` | `LL-USER-STATE` | `isAuthenticated` only | Session user (`GET /api/auth/me`), role, permissions |
| `SpaceStore` | `LL-SPACE-STATE` | `selectedSpaceId`, `selectedEnvironmentBySpaceId` | Active workspace, content path, schemas |
| `AppSettingsStore` | — | No | Global UI settings (`GET /api/app/settings`) |
| `LocalSettingsStore` | `LL-SETTINGS-STATE` | All fields | User preferences (theme, layouts, editor) |

---

## UserStore

**File:** `apps/web/src/app/core/stores/user.store.ts`

Reads the session from `GET /api/auth/me` (via `load()`, run in `onInit`). The response carries the user's identity, linked sign-in providers, `role`, `permissions` and `lock`, read from the `users` row — there are no token claims.

```typescript
// Key state
{
  id, displayName, initials, email, emailVerified, photoURL,
  role: 'admin' | 'custom' | undefined,
  permissions: string[] | undefined,
  lock: boolean | undefined,
  isAuthenticated: boolean,
  loaded: boolean,            // the /api/auth/me check has answered at least once
  isPasswordProvider, isGoogleProvider, isMicrosoftProvider, numberProviders
}

// Key computed
isRoleAdmin: computed(() => role() === 'admin')
isLocked:    computed(() => lock() === true)

// Key methods
load()            // GET /api/auth/me → signedIn(user), or signedOut() on error (401 = no session)
signedIn(user)    // patches the user state, persists isAuthenticated: true (also called by the login form)
signedOut()       // resets to the initial state with loaded: true, persists isAuthenticated: false
```

Auth providers supported: **Email/Password**, **Google**, **Microsoft**.

`role`, `permissions` and `lock` drive all route-level permission guards (`permissionGuard` waits for `loaded`). `MeService` calls `load()` again after profile, email or password changes, and the `apiInterceptor` calls `signedOut()` on a `401` from the app API. A role/permission change made by an admin reaches the server immediately and the UI on the next `load()` (e.g. a reload).

---

## SpaceStore

**File:** `apps/web/src/app/core/stores/space.store.ts`

Loads all spaces the user has access to (a `liveQuery` over `GET /api/app/spaces`, refetched on `spaces` change events). Tracks the currently selected space and environment.

```typescript
// Key state
{
  spaces: Space[],
  loaded: boolean,           // true once load() has resolved (success, empty, or error)
  selectedSpaceId: string | undefined,
  selectedEnvironmentBySpaceId: Record<string, string>,
  environment: SpaceEnvironment | undefined,
  contentPath: PathItem[],   // breadcrumb trail for content browser
  assetPath: PathItem[],     // breadcrumb trail for asset browser
  schemas: Schema[],         // schemas for the selected space
  documents: ContentDocument[] // documents for the selected space
}

// Key computed
selectedSpace: computed(() => spaces().find(s => s.id === selectedSpaceId()))
hasNoSpaces:   computed(() => loaded() && spaces().length === 0)  // gated on loaded so it is not true before the first response
```

Key methods:
- `load()` — `rxMethod` that streams `SpaceService.findAll()`; called from `onInit`. Sets `loaded`, and clears the selection when the list is empty
- `spaceById(id)` — returns a `computed` signal of the space with that id (or `undefined`)
- `changeSpace(space)` — switch active workspace, reset paths, resolve environment
- `changeContentPath(path)` / `changeAssetPath(path)` — update breadcrumb navigation
- `changeEnvironment(env)` — switch preview environment (persisted per space)
- `_syncSpaceData(spaceId)` — private `rxMethod`, fed from `onInit` with `selectedSpaceId` (or `undefined` while signed out). Owns the `schemas`/`documents` live queries (HTTP fetch + refetch on the space's SSE change events): on every id change it clears both, then `switchMap`s to the new space's queries, closing the old ones (and, with the last subscriber, that space's `EventSource`). Each query retries with exponential backoff (1s → 30s cap) and an error toast. Gated on `UserStore.isAuthenticated` because this root store outlives the signed-in shell

**The URL selects the space, not the store.** Every space route lives under a componentless `spaces/:spaceId` parent in `features-routing.module.ts`, guarded by `spaceSelectionGuard` (`apps/web/src/app/core/guards/space-selection.guard.ts`). The guard waits for `loaded$` (a `withProps` observable of `loaded`, created once so guards don't leave an effect behind per navigation), then:
- `:spaceId` is in `spaces` → `changeSpace()` if it differs from the stored selection, allow.
- otherwise (deleted, mistyped, another install) → warning toast, redirect to the stored space's dashboard, or the first space if that one is gone too (never back to an id that would fail again), or `/features/welcome` when there are none.

This is what makes shared links work: the persisted `selectedSpaceId` is only a default for when the URL names no space. Don't call `changeSpace()` before navigating — navigate and let the guard select, so an unsaved-changes `canDeactivate` can still cancel the switch. Selecting the space is all it takes: the store then moves its own documents/schemas live queries to it (see `_syncSpaceData`).

**Space Environments** — a Space can have multiple environments (e.g. staging, production URLs). The selected environment is persisted per space in `selectedEnvironmentBySpaceId`.

---

## AppSettingsStore

**File:** `apps/web/src/app/core/stores/app-settings.store.ts`

Loads global application settings through `SettingsService.find()` — a live query on `GET /api/app/settings` (the single `settings` row), refetched on `settings` change events. Contains UI configuration set by admins (e.g. custom branding). Readable by every role.

```typescript
{ ui: AppUi | undefined }
```

Not persisted to `localStorage` — always fetched fresh on startup.

Runtime server configuration (login providers, plugins, machine translation) is not in a store: it is `AppConfigService.config()` (`core/api/`), loaded from `GET /api/config` before the first render — see [Frontend Architecture](frontend-architecture.md#server-integration).

---

## LocalSettingsStore

**File:** `apps/web/src/app/core/stores/local-settings.store.ts`

Fully client-side user preferences, persisted to `localStorage`. No server interaction.

```typescript
{
  theme: 'light' | 'dark' | 'auto',
  debugEnabled: boolean,
  editorEnabled: boolean,
  editorSize: '' | 'sm' | 'md' | 'lg' | 'xl',
  editorFormWidth: number,         // % width of the form panel in the editor
  assetLayout: 'list' | 'grid',
  assetDialogLayout: 'list' | 'grid',
  translationLayout: 'list' | 'tree',
  markdownMode: 'source' | 'wysiwyg',  // how MARKDOWN fields are edited
  lastSeenWhatsNewVersion: string   // newest What's New entry the user has opened
}
```

Theme switching applies CSS classes + `data-theme` attribute to `<html>` immediately. `'auto'` is resolved once: `load()` (run in `onInit`) checks the OS `prefers-color-scheme` media query at startup and patches `theme` to `'light'` or `'dark'`. It does not listen for later OS changes.

`markdownMode` is the author's chosen way of editing MARKDOWN content fields — raw markdown or the visual editor — remembered across reloads and shared by every markdown field at once. See [Contents → Field Editors](features/spaces/contents.md#the-mode-is-a-remembered-user-preference).

---

## Store Usage Pattern

Inject stores using `inject()` in components or services:

```typescript
// In a component
readonly spaceStore = inject(SpaceStore);
readonly userStore  = inject(UserStore);

// Read state as signals
const spaceId = this.spaceStore.selectedSpace()?.id;
const isAdmin = this.userStore.isRoleAdmin();

// Update state
this.spaceStore.changeEnvironment(env);
this.localSettingsStore.setTheme('dark');
```

Never call `patchState` from outside the store — use the store's exposed methods.

---

## Adding a New Store

1. Create `apps/web/src/app/core/stores/<name>.store.ts`
2. Use `signalStore({ providedIn: 'root' }, withState<T>(...), withMethods(...), withComputed(...), withHooks(...))`
3. Initialize in `withHooks.onInit` if it needs to load data
4. Persist to `localStorage` only what's needed for app shell restore (not server data — that comes from live queries)

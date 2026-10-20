# Frontend State Management

> Related: [Frontend Architecture](frontend-architecture.md) · [User Roles](frontend-permissions.md)

## Overview

State is managed with **NgRx Signals** (`@ngrx/signals`). Four global signal stores are provided at root level and initialized at app startup. All stores use `patchState` for updates — never mutate signal state directly.

---

## Store Overview

| Store | Key | Persisted | Purpose |
|-------|-----|-----------|---------|
| `UserStore` | `LL-USER-STATE` | `isAuthenticated` only | Session user (`GET /api/auth/me`), role |
| `SpaceStore` | `LL-SPACE-STATE` | `selectedSpaceId`, `selectedEnvironmentBySpaceId` | Active workspace, content path, schemas |
| `LocalSettingsStore` | `LL-SETTINGS-STATE` | All fields | User preferences (theme, layouts, editor) |

---

## UserStore

**File:** `apps/web/src/app/core/stores/user.store.ts`

Reads the session from `GET /api/auth/me` (via `load()`, run in `onInit`). The response carries the user's identity, linked sign-in providers and `role`, read from the `users` row — there are no token claims.

```typescript
// Key state
{
  id, displayName, initials, email, emailVerified, photoURL,
  role: UserRole | undefined,   // ADMIN, DEVELOPER, EDITOR, TRANSLATOR, VIEWER
  isAuthenticated: boolean,
  loaded: boolean,            // the /api/auth/me check has answered at least once
  isPasswordProvider, isGoogleProvider, isMicrosoftProvider, numberProviders
}

// Key computed
isRoleAdmin: computed(() => role() === 'ADMIN')

// Key methods
load()            // GET /api/auth/me → signedIn(user), or signedOut() on error (401 = no session)
signedIn(user)    // patches the user state, persists isAuthenticated: true (also called by the login form)
signedOut()       // resets to the initial state with loaded: true, persists isAuthenticated: false
```

Auth providers supported: **Email/Password**, **Google**, **Microsoft**.

`role` drives every route guard (`roleGuard` waits for `loaded`) and the `hasRole` pipe. `MeService` calls `load()` again after profile, email or password changes, and the `apiInterceptor` calls `signedOut()` on a `401` from the app API. A role change made by an admin reaches the server immediately and the UI on the next `load()` (e.g. a reload).

---

## SpaceStore

**File:** `apps/web/src/app/core/stores/space.store.ts`

Holds the sidebar's list of spaces, and the selected space with what its screens need. The list is `IdName[]` (`{ id, name }`) from `GET /api/app/spaces/names`, a `liveQuery` refetched on `spaces` change events; the server leaves out spaces being imported or whose import failed. Once a space is selected (and listed), the store reads it (`GET /api/app/spaces/:spaceId`: the space with `defaultLocale` and `spaceLocales`) and its environments (`GET /api/app/spaces/:spaceId/environments`), both live.

```typescript
// Key state
{
  spaces: IdName[],          // the sidebar list: every space the user can open, by name
  currentSpace: Space | undefined,      // the selected space with its default locale and locales, once it arrived
  environments: SpaceEnvironment[],     // the selected space's environments, in their order
  loaded: boolean,           // true once load() has resolved (success, empty, or error)
  selectedSpaceId: string | undefined,
  selectedEnvironmentBySpaceId: Record<string, string>,
  environment: SpaceEnvironment | undefined,
  contentFolderId: string | null, // content folder shown (null: root); breadcrumbs come from the live folder map
  assetFolderId: string | null,   // asset folder shown (null: root); breadcrumbs come from the live folder map
  schemas: Schema[],         // schemas for the selected space
  documents: ContentDocument[] // documents for the selected space
}

// Key computed
selectedSpace: computed(() => currentSpace()?.id === selectedSpaceId() ? currentSpace() : undefined)
locales:       computed(() => selectedSpace()?.spaceLocales.map(it => it.locale))  // the one place the web reads spaceLocales
defaultLocale: computed(() => selectedSpace()?.defaultLocale)
// `spaces`: SpaceService.findAllNames(), again on each `spaces` event; the space guard reads the same list
hasNoSpaces:   computed(() => loaded() && spaces().length === 0)  // gated on loaded so it is not true before the first response
```

Key methods:
- `load()` — `rxMethod` that streams `SpaceService.findAllNames()`; called from `onInit`. Sets `loaded`; keeps the selected space (and its open folders) while it is listed, else selects the first (none when the list is empty)
- `spaceById(id)` — returns a `computed` signal of the space with that id (or `undefined`)
- `changeSpace(space: IdName)` — switch active workspace (a listed one, else the first), reset paths; the environment resolves once the space's environments arrive (the remembered one by id, else the first)
- `changeContentPath(path)` / `changeAssetPath(path)` — update breadcrumb navigation
- `changeEnvironment(env)` — switch preview environment (persisted per space)
- `_syncSpaceData(spaceId)` — private `rxMethod`, fed from `onInit` with `selectedSpaceId` (or `undefined` while signed out). Owns the live queries of the selected space (`findById`, `findEnvironments`) and its `schemas`/`documents` (HTTP fetch + refetch on the space's SSE change events): on every id change it clears the space, its environments, `schemas` and `documents`, then `switchMap`s to the new space's queries, closing the old ones (and, with the last subscriber, that space's `EventSource`). Each query retries with exponential backoff (1s → 30s cap) and an error toast. Gated on `UserStore.isAuthenticated` because this root store outlives the signed-in shell

**The URL selects the space, not the store.** Every space route lives under a componentless `spaces/:spaceId` parent in `features-routing.module.ts`, guarded by `spaceSelectionGuard` (`apps/web/src/app/core/guards/space-selection.guard.ts`). The guard waits for `loaded$` (a `withProps` observable of `loaded`, created once so guards don't leave an effect behind per navigation), then:
- `:spaceId` is in `spaces` → `changeSpace()` if it differs from the stored selection, allow.
- otherwise (deleted, mistyped, another install) → warning toast, redirect to the stored space's dashboard, or the first space if that one is gone too (never back to an id that would fail again), or `/features/welcome` when there are none.

This is what makes shared links work: the persisted `selectedSpaceId` is only a default for when the URL names no space. Don't call `changeSpace()` before navigating — navigate and let the guard select, so an unsaved-changes `canDeactivate` can still cancel the switch. Selecting the space is all it takes: the store then moves its own documents/schemas live queries to it (see `_syncSpaceData`).

**Space Environments** — a Space can have multiple environments (e.g. staging, production URLs). The selected environment is persisted per space in `selectedEnvironmentBySpaceId`, **by id** (names may repeat); a stored id that no longer matches (or a name stored by an older version) falls back to the first environment.

---

## The instance label

Not a store: the installation's label (`LOCALESS_INSTANCE_NAME` / `LOCALESS_INSTANCE_COLOR`) comes with the runtime config
(`AppConfigService.config().instance`, from `GET /api/config`), shown by `ll-instance-label` in the sidebar and on the
login page. It is deployment configuration, not data: there is no settings table or settings page.

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

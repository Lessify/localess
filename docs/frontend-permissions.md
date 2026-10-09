# User Roles & Permissions

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md) · [Auth Tokens](auth-tokens.md)

## Two Permission Systems

Localess has **two separate permission systems** that should not be confused:

| System | Used by | Stored in | Enforced by |
|--------|---------|-----------|-------------|
| **User permissions** | CMS users (editors, admins) | `users` table (`role`, `permissions`) | Server guards on `/api/app/**` + route guards + UI |
| **API token permissions** | Programmatic API consumers | `tokens` table | `TokenAuthService` on `/api/v1/**` |

This document covers **user permissions**. See [Auth Tokens](auth-tokens.md) for API token permissions.

---

## User Roles

Two roles exist, stored in the `users.role` column (`null` = no access):

| Role | Access |
|------|--------|
| `admin` | Full access to everything — bypasses all permission checks |
| `custom` | Granular access — only what's listed in `users.permissions` |

Role and permissions are read from the `users` row on **every request** (the session resolves to the current row), so a change applies immediately on the server — there are no token claims to refresh.

A `lock: true` flag (`users.lock`) does **not** block login. Its only consumer is `UserStore.isLocked`, which `me.component.html` uses to hide the Update Profile / Email / Password actions on the user's own profile page. It is UI-only — nothing server-side enforces it (`/api/app/me` does not check it). Blocking sign-in is the separate `users.disabled` flag: a disabled user can't log in, and their existing sessions stop resolving.

---

## User Permissions (granular, `custom` role only)

```typescript
enum UserPermission {
  // Administration
  USER_MANAGEMENT        // Manage users (invite, edit, delete)
  SPACE_MANAGEMENT       // Create/edit/delete spaces and their settings
  SETTINGS_MANAGEMENT    // Edit global app settings

  // Translations
  TRANSLATION_READ       // View translations
  TRANSLATION_CREATE     // Add new translation keys
  TRANSLATION_UPDATE     // Edit translation values
  TRANSLATION_DELETE     // Delete translation keys
  TRANSLATION_PUBLISH    // Publish translations to CDN
  TRANSLATION_EXPORT     // Export translations as file
  TRANSLATION_IMPORT     // Import translations from file

  // Schemas
  SCHEMA_READ            // View schemas
  SCHEMA_CREATE          // Create schema types/fields
  SCHEMA_UPDATE          // Edit schema types/fields
  SCHEMA_DELETE          // Delete schemas
  SCHEMA_EXPORT          // Export schema definitions
  SCHEMA_IMPORT          // Import schema definitions

  // Content
  CONTENT_READ           // View content documents
  CONTENT_CREATE         // Create content documents
  CONTENT_UPDATE         // Edit content documents
  CONTENT_DELETE         // Delete content documents
  CONTENT_PUBLISH        // Publish content to CDN
  CONTENT_EXPORT         // Export content
  CONTENT_IMPORT         // Import content

  // Assets
  ASSET_READ             // View assets
  ASSET_CREATE           // Upload assets
  ASSET_UPDATE           // Edit asset metadata
  ASSET_DELETE           // Delete assets
  ASSET_EXPORT           // Export assets
  ASSET_IMPORT           // Import assets

  // Dev
  DEV_OPEN_API           // Access the Developers → Open API section
  DEV_WEBHOOK            // Access the Developers → Webhooks section
}
```

> **Note:** Unlike every other permission above, `DEV_OPEN_API` and `DEV_WEBHOOK` are **not** enforced by a route guard — the `spaces/:spaceId/developers` route (which hosts both Open API and Webhooks) has no `canActivate` in `features-routing.module.ts`. They only control sidebar link visibility, checked client-side via the `DEV_OPEN_API` / `DEV_WEBHOOK` `permission` entries on the Developers sidebar items in `apps/web/src/app/features/features.component.ts`. A user who guesses the URL can still reach `/features/spaces/:spaceId/developers/...` without holding either permission.

---

## How Guards Work

### Server (the real enforcement)

Every `/api/app/**` and `/api/auth/**` route goes through the global `AuthGuard` (`apps/server/src/auth/auth.guard.ts`): it requires a valid session unless the route is `@Public()`, then checks the route's access metadata from `apps/server/src/auth/decorators.ts` against the user's current row:

| Decorator | Passes when |
|---|---|
| `@Public()` | always (login, OAuth, `/api/config`, the public `/api/v1` API, health) |
| `@RequireAnyRole()` | role is `admin` or `custom` (e.g. reading spaces) |
| `@RequirePermission(a, b, …)` | admin, or holds **any** of the permissions (e.g. `SCHEMA_READ` or `CONTENT_READ` for schemas) |
| `@RequireAllPermissions(a, b, …)` | admin, or holds **all** of them (e.g. machine translation needs `TRANSLATION_UPDATE` + `CONTENT_UPDATE`) |
| *(none)* | any signed-in session, even without a role (e.g. `/api/app/me`) |

No session → `401`; insufficient access → `403`. Checks that depend on the request body or target live in the controller or service: task create/delete require the permission named by the task `kind` (`ASSET_REGEN_METADATA` is admin-only), and user management uses `canGrant` / `canManageUser` (below). The helpers are in `packages/shared/src/permissions.ts` (`canPerform`, `canGrant`, `canManageUser`), shared with the UI. CSRF: every non-GET request authenticated by the session cookie must carry `X-Requested-With` (added by the Angular `apiInterceptor`).

### Frontend (navigation only)

`authGuard()` in `apps/web/src/app/app-routing.ts` sends signed-out users to `/auth/login`. Feature routes in `features-routing.module.ts` use the functional `permissionGuard(...permissions)` (`apps/web/src/app/shared/guards/permission.guard.ts`):

```typescript
// a child of the `spaces/:spaceId` parent route (see frontend-state.md → SpaceStore)
{
  path: 'translations',
  canActivate: [permissionGuard(UserPermission.TRANSLATION_READ)],
}
```

The guard waits until `UserStore.loaded()` (the `GET /api/auth/me` check has answered), so a deep link opened in a new tab is decided on the real permissions. Admins pass; `custom` users need **any** of the listed permissions; otherwise it redirects to `/features`.

```typescript
role === 'admin' || (role === 'custom' && permissions.some(it => userStore.permissions()?.includes(it)))
```

The `tasks` route requires any `*_EXPORT` / `*_IMPORT` permission (the Firebase-era guard checked `TRANSLATION_READ` by mistake).

---

## How UI Conditionally Renders

### `canUserPerform` pipe (templates)

The main template gating mechanism is `CanUserPerformPipe` (`apps/web/src/app/shared/pipes/can-user-perform.pipe.ts`). It takes a single permission or an array (any-of match) and returns an `Observable<boolean>`, so pair it with `async`:

```html
@if ('SPACE_MANAGEMENT' | canUserPerform | async) { ... }
@if (item.permission | canUserPerform | async) { ... }   <!-- string | string[] | undefined -->
```

`admin` → always `true`; `custom` → `permissions` includes the value (or any of the array); `undefined` permission → `true`; no role → `false`.

### `UserStore` signals (component code)

In component classes, use `UserStore` signals:

```typescript
readonly userStore = inject(UserStore);

// Check role
this.userStore.isRoleAdmin()          // boolean signal

// Check specific permission
this.userStore.permissions()?.includes(UserPermission.CONTENT_PUBLISH)
```

---

## Access Lifecycle

1. Admin invites a user → `POST /api/app/users` creates the `users` row with its `role` + `permissions` (after a `canGrant` check)
2. User signs in (password, or Google/Microsoft OAuth) → a session row is created; the cookie holds only a random value whose hash is stored
3. Admin changes the user's role/permissions → `PATCH /api/app/users/:id` updates the row
4. **The server applies the change on the user's next request** — every request re-reads the row through the session
5. `UserStore` reads role and permissions from `GET /api/auth/me` on app init, so the UI (sidebar, guards, buttons) reflects a change after the next reload

---

## Who Can Manage Users

Writing a user's `role` and `permissions` grants access. So `USER_MANAGEMENT` alone is not enough to manage every user.

| Caller | May manage |
|---|---|
| `admin` | Any user, including admins and themselves. May grant any role and permission. |
| `custom` with `USER_MANAGEMENT` | Only users they fully outrank: not themselves, not an admin, and not anyone holding a permission they lack. They may set the role only to `custom` or none, grant only permissions they hold, and change only `role`, `permissions` and `lock`. |

Two managers holding the same permissions can manage each other. A manager can never make anyone, including themselves, an admin. Only admins can.

These limits are enforced in two places:

- **Server** (`apps/server/src/auth/users/users.controller.ts`, `@RequirePermission(USER_MANAGEMENT)`): `POST /api/app/users` (invite) requires `canGrant()`; `PATCH /api/app/users/:id` requires `canManageUser()` and `canGrant()`; `DELETE /api/app/users/:id` and `POST /api/app/users/:id/password-reset-link` require `canManageUser()`. Both helpers are in `packages/shared/src/permissions.ts`; the UI calls the same functions through `user-management.ts`.
- **UI**: `features/admin/users/user-management.ts` mirrors the server rule. The users list disables actions on users the caller can't manage. The edit and invite dialogs hide the Admin role and disable permissions the caller can't grant.

## Implementation Files

- `packages/shared/src/models/user.model.ts` — `User`, `UserRole`, `UserPermission` types
- `apps/web/src/app/shared/stores/user.store.ts` — loads `GET /api/auth/me`, exposes `isRoleAdmin`, `isLocked`, `loaded`
- `apps/web/src/app/features/admin/users/user-management.ts` — who may manage which user (mirrors `canManageUser`/`canGrant`)
- `apps/web/src/app/shared/guards/permission.guard.ts` — `permissionGuard(...permissions)`
- `packages/shared/src/permissions.ts` — `canPerform`, `canGrant`, `canManageUser` (server and UI)
- `apps/server/src/auth/decorators.ts` / `auth.guard.ts` — `@Public`, `@RequireAnyRole`, `@RequirePermission`, `@RequireAllPermissions`, global guard + CSRF check
- `apps/server/src/auth/users/users.controller.ts` — user management API
- `apps/web/src/app/shared/pipes/can-user-perform.pipe.ts` — `canUserPerform` template pipe
- `apps/web/src/app/features/features-routing.module.ts` — all route guards (`permissionGuard`)
- `apps/web/src/app/app-routing.ts` — root `authGuard` (authentication only, not authorization)
- `apps/web/src/app/shared/services/user.service.ts` — HttpClient user CRUD (`/api/app/users`, admin operations)

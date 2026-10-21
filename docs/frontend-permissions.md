# User Roles

> Related: [Frontend Architecture](frontend-architecture.md) · [Frontend State](frontend-state.md) · [Auth Tokens](auth-tokens.md)

## Two Access Systems

Localess has **two separate access systems** that should not be confused:

| System | Used by | Stored in | Enforced by |
|--------|---------|-----------|-------------|
| **User roles** | CMS users (editors, admins) | `users.role` | Server guard on `/api/app/**` (`@RequireRole`) + route guards + UI |
| **API token types** | Programmatic API consumers | `tokens` table | `TokenAuthService` on `/api/v1/**` |

This document covers **user roles**. See [Auth Tokens](auth-tokens.md) for API tokens.

---

## The Roles

Every user has **one role**, stored in `users.role`; there is no permission list. `null` is no role: signed up or invited,
no access yet (the user can sign in and sees "Please contact your administrator").

| Role | Who it is for | Can do |
|---|---|---|
| `ADMIN` | runs the installation | Invites and manages users, creates and deletes spaces (Admin → Spaces, the Firebase import), regenerates asset metadata, and does everything a developer does in every space |
| `DEVELOPER` | builds the site that reads Localess | Everything an editor does, plus schemas (edit, import, export), Space Settings (general, locales, environments, API tokens), webhooks, Open API, and deleting all translations |
| `EDITOR` | writes and publishes content | Contents, assets and translations (create, edit, delete, publish), translation keys (add, rename, labels), import and export tasks, Unsplash |
| `TRANSLATOR` | translates | Edits translation values, Translate Locale, machine translation; reads contents, assets and schemas. Can't add, rename or delete keys, nor publish |
| `VIEWER` | reviews, follows along | Reads contents, assets, translations and schemas; changes nothing |

Permissions are global: a role applies to every space. The role is read from the `users` row on **every request** (the
session resolves to the current row), so a change applies at once on the server.

Blocking sign-in is the separate `users.disabled` flag: a disabled user can't log in, and their sessions stop resolving.

### The role lists

A route or a screen names the roles it lets in by one of the lists of `packages/shared/src/roles.ts`, the same on the
server and in the web. The lists nest (each one is the next with one role more); `ADMIN` is in every list and never let
in implicitly:

| List | Roles | Guards |
|---|---|---|
| `ANY_ROLE` | all five | a space and what is in it: reading contents, assets, schemas, translations; the Dashboard |
| `TRANSLATORS` | Admin, Developer, Editor, Translator | translation values, Translate Locale, machine translation |
| `CONTENT_WRITERS` | Admin, Developer, Editor | contents, assets, translation keys (add, rename, labels, delete), publishing, import/export tasks, Unsplash |
| `DEVELOPERS` | Admin, Developer | schemas (write, import/export), Space Settings, tokens, webhooks, Open API, delete all translations |
| `ADMINS` | Admin | users, Admin → Spaces (list, create, delete), the Firebase import, regenerating asset metadata |

---

## How Guards Work

### Server (the real enforcement)

Every `/api/app/**` and `/api/auth/**` route goes through the global `AuthGuard` (`apps/server/src/auth/auth.guard.ts`):
it requires a valid session unless the route is `@Public()`, then checks the route's `@RequireRole` against the user's
current role:

| Decorator | Passes when |
|---|---|
| `@Public()` | always (login, OAuth, `/api/config`, the public `/api/v1` API, health) |
| `@RequireRole('ADMIN')` | the role is the one named |
| `@RequireRole(CONTENT_WRITERS)` | the role is in the list (one of `roles.ts`, or an inline `['ADMIN', 'EDITOR']`) |
| *(none)* | any signed-in session, even without a role (e.g. `/api/app/me`, sign-out) |

On a method `@RequireRole` replaces the controller's. No session → `401`; a role outside the list → `403`. Checks that
depend on the body live in the service: creating or deleting a task needs the roles its `kind` names
(`modules/tasks/utils/task-roles.ts`: schema tasks `DEVELOPERS`, metadata regeneration `ADMINS`, the rest
`CONTENT_WRITERS`). The change stream (`/api/app/events`) sends each entity's events to the roles that may read it
(`shared/http/event-access.ts`). CSRF: every non-GET request authenticated by the session cookie must carry
`X-Requested-With` (added by the Angular `apiInterceptor`).

### Frontend (navigation only)

`authGuard()` in `apps/web/src/app/app-routing.ts` sends signed-out users to `/auth/login`; `guestGuard`
(`core/guards/guest.guard.ts`) sends signed-in users away from it. Feature routes in `features-routing.module.ts` use
`roleGuard(list)` (`apps/web/src/app/core/guards/role.guard.ts`):

```typescript
{ path: 'settings', canActivate: [roleGuard(DEVELOPERS)] }
```

The guard waits until `UserStore.loaded()` (the `GET /api/auth/me` check has answered), so a deep link opened in a new
tab is decided on the real role; a role outside the list is redirected to `/features`. Every section has its guard:
Translations, Contents, Assets, Schemas (`ANY_ROLE`), Tasks (`CONTENT_WRITERS`), Developers and Settings
(`DEVELOPERS`), Admin → Users and Admin → Spaces (`ADMINS`).

---

## How UI Conditionally Renders

### `hasRole` pipe (templates)

`HasRolePipe` (`apps/web/src/app/shared/pipes/has-role.pipe.ts`) takes a list's name and returns an
`Observable<boolean>`, so pair it with `async`:

```html
@if ('CONTENT_WRITERS' | hasRole | async) { <button>Publish</button> }
@if (item.role | hasRole | async) { ... }   <!-- a RoleListName, or undefined: shown to everyone signed in -->
```

### Component code

`hasRole(user, roles)` from `@localess/shared` (one role or a list), with the role from `UserStore`:

```typescript
hasRole({ role: this.userStore.role() }, DEVELOPERS);
this.userStore.isRoleAdmin();   // boolean signal
```

---

## Access Lifecycle

1. An admin invites a user → `POST /api/app/users` creates the `users` row with its `role` (or none)
2. The user signs in (password, or Google/Microsoft OAuth) → a session row is created; the cookie holds only a random
   value whose hash is stored
3. An admin changes the role → `PATCH /api/app/users/:id { role }`
4. **The server applies it on the user's next request** — every request re-reads the row through the session
5. `UserStore` reads the role from `GET /api/auth/me` on app init; a `users` change event about the user's own account
   reaches their UI too

## Who Can Manage Users

Admins only (`@RequireRole(ADMINS)` on `UserController`, `roleGuard(ADMINS)` on the route). An admin may give any role
to anyone. Two rules remain: at least one active admin always remains (a change that would remove the last one is a
409, checked under row locks in `UserRepository`), and nobody disables themselves.

## Implementation Files

- `packages/shared/src/models/user.model.ts` — `User`, `UserRole`, `USER_ROLES`
- `packages/shared/src/roles.ts` — the role lists, `ROLE_LISTS`, `hasRole` (server and web)
- `apps/server/src/auth/decorators.ts` / `auth.guard.ts` — `@Public`, `@RequireRole`, global guard + CSRF check
- `apps/server/src/shared/http/event-access.ts` — who receives which change event
- `apps/server/src/modules/tasks/utils/task-roles.ts` — the roles of each task kind
- `apps/server/src/modules/users/` — user management API (admins only)
- `apps/web/src/app/core/stores/user.store.ts` — loads `GET /api/auth/me`, exposes `role`, `isRoleAdmin`, `loaded`
- `apps/web/src/app/core/guards/role.guard.ts` — `roleGuard(roles)`
- `apps/web/src/app/shared/pipes/has-role.pipe.ts` — `hasRole` template pipe
- `apps/web/src/app/features/features-routing.module.ts` — all route guards (`roleGuard`)
- `apps/web/src/app/shared/models/user-role.model.ts` — the roles as Admin → Users (`user-role-choice`, a card per role) and Me show them; keep its descriptions and the table above the same (label, description)
- `apps/server/test/roles.test.ts`, `apps/e2e/tests/api/role-matrix.spec.ts` — every role against the routes

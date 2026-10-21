# Admin — Users Module

> Parent: [Admin Overview](overview.md) · Related: [User Roles](../../frontend-permissions.md)

## Purpose

Manage all platform users — invite new users, give each one role (Admin, Developer, Editor, Translator, Viewer, or none), disable or enable sign-in, delete users, and hand out password reset links. For admins only.

## Route

```
/features/admin/users             [ADMINS]
```

## Key Files

```
apps/web/src/app/features/admin/users/
  users.component.ts/html/scss       ← main user list
  user-dialog/                       ← edit the role
  user-role-choice/                  ← the role as choice cards (both dialogs)
  user-invite-dialog/                ← invite new user
apps/web/src/app/shared/models/user-role.model.ts
                                     ← USER_ROLE_OPTIONS (the roles with a label, an icon and what each may do), roleLabel()
```

## UsersComponent

Displays one page of users (`ll-table`, `ll-paginator`), paged, sorted and searched on the server: `GET /api/app/users` answers a `Page<User>` (`?page=&size=&sort=&direction=`, `?search=` on email or display name, `?active=active|inactive`; sorts: `email` (default), `name`, `role`, `createdAt`, `updatedAt`). A `PagedList` (`core/utils/paged-list.ts`) holds the query.

**Injected services:** `HlmDialogService`, `ChangeDetectorRef`, `NotificationService`, `UserService`, `Injector`

The **Sign-in** column shows how each user signs in: a mail icon when they have a password (`hasPassword`), a shield per linked OAuth login (`identities`: Google, Microsoft).

**Key behaviour:**
- `loadData()` — fetches all users via `UserService`
- `onFilterChange(value: FilterToolbarValue)` — sends the toolbar's search and the Active filter to the server, from the first page; `onSortChange()` sends the sorted column and direction
- `inviteDialog()` — opens `UserInviteDialogComponent`
- `openEditDialog(user)` — opens `UserDialogComponent` to change the role
- `openDeleteDialog(user)` — opens `ConfirmationDialogComponent`, then deletes
- `toggleDisabled(user)` — **Disable** (after a confirmation) or **Enable** via `UserService.setDisabled()` (`PATCH /api/app/users/:id/status` `{ disabled }`). Disabling deletes the user's sessions, so they are signed out at once; password and OAuth sign-in are refused while `users.disabled` is set, and the list shows them as *inactive*. Offered on every user but the caller's own account (`canChangeStatus()`); the server refuses that too (403). Replaces the Firebase Authentication console's "Disable account"
- `copyPasswordResetLink(user)` — calls `UserService.passwordResetLink()` (`POST /api/app/users/:id/password-reset-link`) and copies the returned one-hour reset link to the clipboard. This is how passwords get reset when the server has no SMTP configured. Admins only, as every route of the page

The list is live: `UserService.findPage(params)` is a `liveQuery` that reads the current page again on `users` change events from the SSE stream. There is no "Sync" action any more — the role lives only in the `users` table, so there is nothing to sync.

## Dialogs

### UserInviteDialogComponent
Creates a new user (row in `users`, argon2id password in `user_credentials`) with its role (or none) via `POST /api/app/users`.

Form fields: `email`, `password`, `displayName`, `role` (None or one of the five)

### UserDialogComponent
Changes an existing user's role.

Form field: `role`

Both dialogs show the role as choice cards (`UserRoleChoiceComponent`, as Create Space shows its templates): None first, then the five roles, each card with its icon and what the role may do (`USER_ROLE_OPTIONS`, the same text as the table in [User Roles](../../frontend-permissions.md)). None is the form's `''` and is answered as `null`.

**The last active admin stays.** At least one user with the Admin role who is not disabled always remains: removing the role from the last one (their own included), disabling them or deleting them is refused with 409 *At least one active admin must remain*, which the list shows under the error toast. Disabled admins don't count. The server checks this with the active admins' rows locked (`UserRepository`), so two admins removing each other at once can't both succeed.

**Admins only.** The route (`roleGuard(ADMINS)`) and every server route (`@RequireRole(ADMINS)`): there are no partial user managers. See [User Roles](../../frontend-permissions.md) for what each role may do.

# Admin — Users Module

> Parent: [Admin Overview](overview.md) · Related: [User Roles & Permissions](../../frontend-permissions.md)

## Purpose

Manage all platform users — invite new users, edit their roles and granular permissions, lock accounts, delete users, and hand out password reset links.

## Route

```
/features/admin/users             [USER_MANAGEMENT permission]
```

## Key Files

```
apps/web/src/app/features/admin/users/
  users.component.ts/html/scss       ← main user list
  user-permissions.ts                ← USER_PERMISSION_GROUPS (permission categories for the dialogs)
  user-dialog/                       ← edit role + permissions
  user-invite-dialog/                ← invite new user
```

## UsersComponent

Displays a searchable, paginated `ll-table` (`LlTableImports`) of all users in the platform.

**Injected services:** `HlmDialogService`, `ChangeDetectorRef`, `NotificationService`, `UserService`, `Injector`

**Key behaviour:**
- `loadData()` — fetches all users via `UserService`
- `onFilterChange(value: FilterToolbarValue)` — updates the table filter from the `LlFilterToolbarImports` toolbar; the actual predicate is built once in `ngOnInit()` via `FilterPredicateUtils.create()`, searching across email/display name and filtering by active/inactive
- `inviteDialog()` — opens `UserInviteDialogComponent`
- `openEditDialog(user)` — opens `UserDialogComponent` to edit role/permissions/lock
- `openDeleteDialog(user)` — opens `ConfirmationDialogComponent`, then deletes
- `copyPasswordResetLink(user)` — calls `UserService.passwordResetLink()` (`POST /api/app/users/:id/password-reset-link`) and copies the returned one-hour reset link to the clipboard. This is how passwords get reset when the server has no SMTP configured. The server requires that the caller may manage the target user (`canManageUser`)

The list is live: `UserService.findAll()` is a `liveQuery` that refetches on `users` change events from the SSE stream. There is no "Sync" action any more — role and permissions live only in the `users` table, so there is nothing to sync.

## Dialogs

### UserInviteDialogComponent
Creates a new user (row in `users`, argon2id password in `user_credentials`) with initial role and permissions via `POST /api/app/users`.

Form fields: `email`, `password`, `displayName`, `role` (`admin` | `custom`; `admin` offered to admins only), `permissions[]`, `lock`

### UserDialogComponent
Edits an existing user's role, granular permissions, and lock status.

Form fields: `role`, `permissions[]`, `lock`

Both dialogs render `permissions[]` as grouped checkboxes rather than a plain multiselect: permissions are organized into categories via `USER_PERMISSION_GROUPS` (`user-permissions.ts`), with `isPermissionSelected()` / `togglePermission()` toggling individual entries into the underlying `permissions` form control (in both `user-dialog.component.ts` and `user-invite-dialog.component.ts`).

**Limits for non-admin user managers.** The users list shows the actions menu only for users the signed-in user may manage (`canManage()`). Otherwise the actions button is disabled, with the tooltip "Only an admin can manage this user." For non-admin callers, both dialogs hide the **Admin** role and disable permissions the caller doesn't hold (`canGrantAdmin`, `canGrantPermission()`). All three use the helpers in `user-management.ts`, which call the same `canGrant` / `canManageUser` functions the server enforces (`packages/shared/src/permissions.ts`, enforced in `apps/server/src/users/users.controller.ts`). See [Who Can Manage Users](../../frontend-permissions.md#who-can-manage-users).

> See [User Roles & Permissions](../../frontend-permissions.md) for the full `UserPermission` enum and how role and permissions are stored and checked.

## Services Used

| Service | Purpose |
|---------|---------|
| `UserService` | `/api/app/users`: live list/get, `update()` (`PATCH`), `delete()`, `invite()` (`POST`), `passwordResetLink()` (`POST …/:id/password-reset-link`) |
| `NotificationService` | Toast feedback |

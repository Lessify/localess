# Admin — Users Module

> Parent: [Admin Overview](overview.md) · Related: [User Roles & Permissions](../../frontend-permissions.md)

## Purpose

Manage all platform users — invite new users, edit their roles and granular permissions, lock accounts, delete users, and sync Firebase Auth state.

## Route

```
/features/admin/users             [USER_MANAGEMENT permission]
```

## Key Files

```
src/app/features/admin/users/
  users.component.ts/html/scss       ← main user list
  user-dialog/                       ← edit role + permissions
  user-invite-dialog/                ← invite new user
```

## UsersComponent

Displays a searchable, paginated `ll-table` (`LlTableImports`) of all users in the platform.

**Injected services:** `UserService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all users via `UserService`
- `onFilterChange(value: FilterToolbarValue)` (`users.component.ts:128`) — updates the table filter from the `LlFilterToolbarImports` toolbar; the actual predicate is built once in `ngOnInit()` via `FilterPredicateUtils.create()` (`users.component.ts:116`), searching across email/display name and filtering by active/inactive
- `inviteDialog()` — opens `UserInviteDialogComponent`
- `openEditDialog(user)` — opens `UserDialogComponent` to edit role/permissions/lock
- `openDeleteDialog(user)` — opens `ConfirmationDialogComponent`, then deletes
- `sync()` — triggers a Firebase Auth sync to refresh stale user data

## Dialogs

### UserInviteDialogComponent
Creates a new Firebase Auth user with initial role and permissions.

Form fields: `email`, `password`, `displayName`, `role` (`admin` | `custom`), `permissions[]`, `lock`

### UserDialogComponent
Edits an existing user's role, granular permissions, and lock status.

Form fields: `role`, `permissions[]`, `lock`

Both dialogs render `permissions[]` as grouped checkboxes rather than a plain multiselect: permissions are organized into categories via `USER_PERMISSION_GROUPS` (`user-permissions.ts`), with `isPermissionSelected()` / `togglePermission()` toggling individual entries into the underlying `permissions` form control (`user-dialog.component.ts:55-70`, `user-invite-dialog.component.ts:52-67`).

> See [User Roles & Permissions](../../frontend-permissions.md) for the full `UserPermission` enum and how claims work.

## Services Used

| Service | Purpose |
|---------|---------|
| `UserService` | CRUD, sync — calls Firebase Functions |
| `NotificationService` | Snackbar feedback |

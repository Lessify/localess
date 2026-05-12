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

Displays a searchable, paginated `MatTable` of all users in the platform.

**Injected services:** `UserService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all users via `UserService`
- `applyFilter()` + `userFilterPredicate()` — client-side search across name/email/role
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

> See [User Roles & Permissions](../../frontend-permissions.md) for the full `UserPermission` enum and how claims work.

## Services Used

| Service | Purpose |
|---------|---------|
| `UserService` | CRUD, sync — calls Firebase Functions |
| `NotificationService` | Snackbar feedback |

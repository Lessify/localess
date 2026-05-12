# Me Module — User Profile

> Related: [Frontend Architecture](../frontend-architecture.md) · [Frontend State](../frontend-state.md)

## Purpose

Allows the currently logged-in user to view and manage their own profile — display name, photo, email address, and password. Not tied to any specific space.

## Route

```
/features/me    [authenticated]
```

## Key Files

```
src/app/features/me/
  me.component.ts/html/scss      ← profile page
  me-dialog/                     ← edit display name + photo
  me-email-dialog/               ← update email address
  me-password-dialog/            ← change password
```

## MeComponent

Displays the current user's profile card — name, email, avatar, auth providers (Email / Google / Microsoft), and verification status. Reads all data from `UserStore`.

**Injected services:** `MatDialog`, `NotificationService`, `MeService`, `UserStore`

**Key behaviour:**
- `openEditDialog()` — opens `MeDialogComponent` to update display name and profile photo
- `openUpdateEmailDialog()` — opens `MeEmailDialogComponent` (only available for email/password provider)
- `openUpdatePasswordDialog()` — opens `MePasswordDialogComponent` (only available for email/password provider)

## Dialogs

### MeDialogComponent
Form: `displayName`, profile photo URL or upload.

### MeEmailDialogComponent
Form: new `email` + current `password` for re-authentication. Sends verification email to new address.

### MePasswordDialogComponent
Form: current `password` + new `password` + confirm. Re-authenticates before updating.

> Email and password changes require re-authentication because they are sensitive operations.

## Services Used

| Service | Purpose |
|---------|---------|
| `MeService` | Update display name, email, password via Firebase Auth |
| `NotificationService` | Snackbar feedback |
| `UserStore` | Read current user state (email, providers, displayName) |

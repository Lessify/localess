# Me Module — User Profile

> Related: [Frontend Architecture](../frontend-architecture.md) · [Frontend State](../frontend-state.md)

## Purpose

Allows the currently logged-in user to view and manage their own profile — display name, photo, email address, and password. Not tied to any specific space.

## Route

```
/features/me    [authenticated — no own guard; covered by the parent `features` route's `authGuard` (app-routing.ts)]
```

## Key Files

```
src/app/features/me/
  me.component.ts/html/scss      ← profile page
  me-dialog/                     ← edit display name + photo URL
  me-email-dialog/               ← update email address
  me-password-dialog/            ← change password
```

## MeComponent

Displays the current user's profile card — avatar, name, email, email-verified status, role, and (for `custom` role) the permission list. Reads all data from `UserStore`.

**Injected services:** `HlmDialogService`, `NotificationService`, `MeService`, `UserStore`

**Key behaviour:**
- `openEditDialog()` — opens `MeDialogComponent` to update display name and profile photo URL
- `openUpdateEmailDialog()` — opens `MeEmailDialogComponent` (only available for email/password provider)
- `openUpdatePasswordDialog()` — opens `MePasswordDialogComponent` (only available for email/password provider)

**Visibility rules (`me.component.html`):**
- Locked account (`isLocked()`) — all action buttons are hidden and a "your account is locked" message is shown instead
- Google / Microsoft provider — only "Update Profile" is shown; a message explains email and password are managed by the external provider

## Dialogs

### MeDialogComponent
Form: `displayName`, `photoURL` (plain URL text field — no upload).

### MeEmailDialogComponent
Form: `newEmail` only. Calls `MeService.updateEmail()` (Firebase Auth `updateEmail`), then reloads the current user.

### MePasswordDialogComponent
Form: `newPassword` only (min length 6). Calls `MeService.updatePassword()` (Firebase Auth `updatePassword`).

> There is no current-password field, confirm field, or explicit re-authentication step, and no verification email is sent. Firebase Auth may reject these calls with `auth/requires-recent-login` if the session is old.

## Services Used

| Service | Purpose |
|---------|---------|
| `MeService` | Update display name, email, password via Firebase Auth |
| `NotificationService` | Toast feedback |
| `UserStore` | Read current user state (email, providers, displayName) |

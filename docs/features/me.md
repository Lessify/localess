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
apps/web/src/app/features/me/
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
Form: `newEmail`, plus `currentPassword` for accounts that have a password (`UserStore.isPasswordProvider()`). Calls `MeService.updateEmail()` (`PUT /api/app/me/email`), then reloads the current user. The server checks the current password, rejects an address another user already has (409), and marks the new address unverified.

### MePasswordDialogComponent
Form: `newPassword` (min length 6), plus `currentPassword` for accounts that have a password. Calls `MeService.updatePassword()` (`PUT /api/app/me/password`). Changing the password signs out every other session of the user.

> There is no confirm field and no verification email is sent. A wrong current password is answered with 403 (not 401, which would sign the user out); `MeComponent` shows the server's message in the error toast.

## Services Used

| Service | Purpose |
|---------|---------|
| `MeService` | Update display name / photo (`PATCH /api/app/me`), email (`PUT /api/app/me/email`), password (`PUT /api/app/me/password`); reloads `UserStore` afterwards |
| `NotificationService` | Toast feedback |
| `UserStore` | Read current user state (email, providers, displayName) |

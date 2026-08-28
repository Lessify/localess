# Admin Features — Overview

> Related: [User Roles & Permissions](../../frontend-permissions.md) · [Frontend Architecture](../../frontend-architecture.md)

## Purpose

The `admin/` umbrella contains all features for administering the Localess platform itself — across all spaces and users. These are **platform-level** operations, not space-level.

All admin routes are guarded by Firebase `customClaims`. Only users with `role: 'admin'` or a `custom` role with the relevant permission can access them.

---

## Modules

| Module | Route | Guard | Doc |
|--------|-------|-------|-----|
| Users | `/features/admin/users` | `USER_MANAGEMENT` | [admin-users.md](admin-users.md) |
| Spaces | `/features/admin/spaces` | `SPACE_MANAGEMENT` | [admin-spaces.md](admin-spaces.md) |
| Settings | `/features/admin/settings` | `SETTINGS_MANAGEMENT` | [admin-settings.md](admin-settings.md) |

---

## Common Patterns

- All modules use `ll-table` (`LlTableImports` from `@shared/components/table/table.imports`) with sorting and pagination — the Material-free replacement for `MatTable` (see [MatTable → ll-table Migration](../../table-migration.md))
- CRUD operations are performed via `MatDialog` overlays
- Destructive actions always open a `ConfirmationDialogComponent`
- `NotificationService` is used in every module for user feedback (snackbars)

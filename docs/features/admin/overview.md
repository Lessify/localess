# Admin Features — Overview

> Related: [User Roles](../../frontend-permissions.md) · [Frontend Architecture](../../frontend-architecture.md)

## Purpose

The `admin/` umbrella contains all features for administering the Localess platform itself — across all spaces and users. These are **platform-level** operations, not space-level.

All admin routes are guarded by `roleGuard(ADMINS)`, which reads the role `UserStore` loads from `GET /api/auth/me`: only admins can access them. The server enforces the same rule on every `/api/app/**` request (`@RequireRole(ADMINS)`), reading the role from the `users` table, so a change applies immediately.

---

## Modules

| Module | Route | Guard | Doc |
|--------|-------|-------|-----|
| Users | `/features/admin/users` | `ADMINS` | [admin-users.md](admin-users.md) |
| Spaces | `/features/admin/spaces` | `ADMINS` | [admin-spaces.md](admin-spaces.md) |

---

## Common Patterns

- Users and Spaces use `ll-table` (`LlTableImports` from `@shared/components/table/table.imports`) with sorting and pagination — the Material-free replacement for `MatTable` (see [ll-table](../../components/table.md)); Settings is a Spartan `hlm-tabs` shell around a form
- CRUD operations are performed via `HlmDialogService` overlays
- Destructive actions always open a `ConfirmationDialogComponent`
- `NotificationService` is used for user feedback (Sonner toasts) — in Users and Spaces, and in Settings' `UiComponent` (the `SettingsComponent` tab shell does not inject it)

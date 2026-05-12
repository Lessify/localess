# Admin — Spaces Module

> Parent: [Admin Overview](overview.md) · Related: [Concepts — Space](../../concepts.md)

## Purpose

Platform-level management of Spaces — create new spaces, edit space names, delete spaces, and copy space IDs for use in API integrations.

## Route

```
/features/admin/spaces            [SPACE_MANAGEMENT permission]
```

## Key Files

```
src/app/features/admin/spaces/
  spaces.component.ts/html/scss      ← space list
  space-dialog/                      ← create / edit dialog
```

## SpacesComponent

Displays a paginated `MatTable` of all spaces in the platform.

**Injected services:** `SpaceService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all spaces via `SpaceService`
- `openAddDialog()` — opens `SpaceDialogComponent` in create mode
- `openEditDialog(space)` — opens `SpaceDialogComponent` in edit mode
- `openDeleteDialog(space)` — confirmation dialog then deletes space and all its content
- `copied()` — shows snackbar when space ID is copied to clipboard

## Dialogs

### SpaceDialogComponent
Single-field form for the space `name`. Used for both create and edit operations. Validates with `SpaceValidator`.

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Fetch, create, update, delete spaces |
| `NotificationService` | Snackbar feedback |

> **Warning:** Deleting a space is irreversible and removes all content, translations, schemas, assets, and tokens under it.

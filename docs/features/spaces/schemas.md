# Spaces — Schemas Module

> Parent: [Spaces Overview](overview.md) · Related: [Contents](contents.md) · [Concepts — Schema](../../concepts.md)

## Purpose

Define and manage content type schemas that structure `ContentDocument` data. Schemas consist of typed fields and can be composed — a `ROOT` schema embeds `NODE` schemas. `ENUM` schemas define fixed option sets used in dropdown fields.

## Routes

```
/features/spaces/:spaceId/schemas              [SCHEMA_READ] → SchemasComponent
/features/spaces/:spaceId/schemas/comp/:schemaId             → EditCompComponent
  (canDeactivate: isFormDirtyGuard)
/features/spaces/:spaceId/schemas/enum/:schemaId             → EditEnumComponent
  (canDeactivate: isFormDirtyGuard)
```

## Key Files

```
src/app/features/spaces/schemas/
  schemas.component.ts/html/scss     ← schema list
  edit-comp/                         ← component/root schema field editor (routed)
  edit-enum/                         ← enum values editor (routed)
  add-dialog/                        ← create new schema
  edit-id-dialog/                    ← rename schema ID
  export-dialog/
  import-dialog/
  shared/                            ← shared field-editor sub-components
```

## SchemasComponent

Displays all schemas in a table, filterable by **type** (`ROOT`, `NODE`, `ENUM`), **labels**, and free-text search.

**Injected services:** `SchemaService`, `TaskService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all schemas for the space
- `schemaFilterPredicate()` — multi-criteria filter (search text + label chips)
- `onRowClick(schema)` — navigates to `edit-comp` or `edit-enum` based on schema type
- `openAddDialog()` — create a new schema (pick type: ROOT / NODE / ENUM)
- `openEditIdDialog(schema)` — rename schema ID (propagates to content that uses it)
- `openDeleteDialog(schema)` — delete schema (with content impact warning)
- `openExportDialog()` / `openImportDialog()` — creates Tasks

## EditCompComponent (routed)

Full field editor for `ROOT` and `NODE` schemas. Fields can be added, reordered, and configured. Protected by `isFormDirtyGuard`.

Supported field kinds:
`TEXT`, `TEXTAREA`, `RICH_TEXT`, `MARKDOWN`, `NUMBER`, `COLOR`, `DATE`, `DATETIME`, `BOOLEAN`, `OPTION`, `OPTIONS`, `SCHEMA` (embed node), `SCHEMAS` (array of nodes), `LINK`, `REFERENCE`, `REFERENCES`, `ASSET`, `ASSETS`

## EditEnumComponent (routed)

Editor for `ENUM` schemas. Each entry has a `name` (display) and `value` (stored). Protected by `isFormDirtyGuard`.

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddDialogComponent` | Pick type (ROOT / NODE / ENUM), enter ID and display name |
| `EditIdDialogComponent` | Rename schema ID |
| `ExportDialogComponent` | Export schema definitions to file |
| `ImportDialogComponent` | Import schemas → creates a Task |
| `ConfirmationDialogComponent` | Delete confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `SchemaService` | CRUD for schemas |
| `TaskService` | Create import/export tasks |
| `NotificationService` | Snackbar feedback |

# Spaces — Schemas Module

> Parent: [Spaces Overview](overview.md) · Related: [Contents](contents.md) · [Concepts — Schema](../../concepts.md) · [Filter Toolbar](../../components/filter-toolbar.md) · [Table](../../components/table.md)

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
apps/web/src/app/features/spaces/schemas/
  schemas.component.ts/html/scss     ← schema list
  edit-comp/                         ← component/root schema field editor (routed)
  edit-enum/                         ← enum values editor (routed)
  add-dialog/                        ← create new schema
  edit-id-dialog/                    ← rename schema ID
  export-dialog/
  import-dialog/
  shared/
    edit-field/                      ← EditFieldComponent (`ll-schema-field-edit`), one field of a ROOT/NODE schema, used by edit-comp
    edit-value/                      ← EditValueComponent (`ll-schema-value-edit`), one enum value, used by edit-enum
```

## SchemasComponent

Displays all schemas in an `ll-table` (see [Table](../../components/table.md)), filterable by **labels** (multi-select) and free-text search via an `<ll-filter-toolbar>` (see [Filter Toolbar](../../components/filter-toolbar.md)) — no page-owned `FormGroup` or hand-written predicate anymore.

**Injected services:** `SchemaService`, `TaskService`, `HlmDialogService`, `NotificationService`, `Router`

**Key behaviour:**
- `loadData()` — fetches all schemas for the space
- `labelOptions` / `filters` — computed `FilterOption[]`/`FilterDef[]` fed to `<ll-filter-toolbar [filters]="filters()">`
- `onFilterChange(value)` — receives the toolbar's debounced `FilterToolbarValue`, updates `selectedLabels` (used to highlight matched label badges in the table) and `dataSource.filter`
- `dataSource.filterPredicate` — set once in `ngOnInit` via `FilterPredicateUtils.create()` (search across id/displayName/description + array-overlap on `labels`)
- `onRowSelect(schema)` — navigates to `edit-comp` or `edit-enum` based on schema type
- `openAddDialog()` — create a new schema (pick type: ROOT / NODE / ENUM)
- `openEditIdDialog(event, schema)` — takes the row-action `MouseEvent` (default prevented, propagation stopped so the row click doesn't fire); rename schema ID (propagates to content that uses it)
- `openDeleteDialog(event, schema)` — same `MouseEvent` handling; delete schema (with content impact warning)
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

## Schemas as Code

Schemas can also be managed code-first with `@localess/schema` + `@localess/cli`:

- `localess schema pull` — generates TypeScript definition files from the space (`GET /api/v1/spaces/:spaceId/schemas`).
- `localess schema push` — writes code-defined schemas back (`POST /api/v1/spaces/:spaceId/schemas`, `DEV_TOOLS` token). Upsert by default; `--delete` enables full sync.

See [V1 API](../../v1-api.md) for the endpoint contract.

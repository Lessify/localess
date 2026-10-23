# Spaces — Schemas Module

> Parent: [Spaces Overview](overview.md) · Related: [Contents](contents.md) · [Concepts — Schema](../../concepts.md) · [Filter Toolbar](../../components/filter-toolbar.md) · [Table](../../components/table.md)

## Purpose

Define and manage content type schemas that structure `ContentDocument` data. Schemas consist of typed fields and can be composed — a `ROOT` schema embeds `NODE` schemas. `ENUM` schemas define fixed option sets used in dropdown fields.

## Routes

```
/features/spaces/:spaceId/schemas              [ANY_ROLE] → SchemasComponent
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
  edit-id-dialog/                    ← rename schema ID (its `name`)
  export-dialog/
  import-dialog/
  shared/
    edit-field/                      ← EditFieldComponent (`ll-schema-field-edit`), one field of a ROOT/NODE schema, used by edit-comp
    edit-value/                      ← EditValueComponent (`ll-schema-value-edit`), one enum value, used by edit-enum
```

## SchemasComponent

Displays all schemas in an `ll-table` (see [Table](../../components/table.md)), filterable by **labels** (multi-select) and free-text search via an `<ll-filter-toolbar>` (see [Filter Toolbar](../../components/filter-toolbar.md)) — no page-owned `FormGroup` or hand-written predicate anymore.

**Injected services:** `SchemaService`, `TaskService`, `HlmDialogService`, `NotificationService`, `Router`, `SpaceStore`

**Key behaviour:**
- `schemas` — every schema of the space from `SpaceStore.schemas()` (live; the store loads them for the editors anyway), sorted; `isLoading` until the store has them (`schemasLoaded`). Not paged on the server: see [Pagination](../../server/pagination.md#not-paged-and-why)
- `labelOptions` / `filters` — computed `FilterOption[]`/`FilterDef[]` fed to `<ll-filter-toolbar [filters]="filters()">`
- `onFilterChange(value)` — receives the toolbar's `FilterToolbarValue` (search on Enter or the Search button), updates `selectedLabels` (used to highlight matched label badges in the table) and `dataSource.filter`
- `dataSource.filterPredicate` — set once in `ngOnInit` via `FilterPredicateUtils.create()` (search across id/displayName/description + array-overlap on `labels`)
- `onRowSelect(schema)` — navigates to `edit-comp` or `edit-enum` based on schema type
- `openAddDialog()` — create a new schema (pick type: ROOT / NODE / ENUM)
- `openEditIdDialog(event, schema)` — takes the row-action `MouseEvent` (default prevented, propagation stopped so the row click doesn't fire); rename schema ID: changes the schema's `name` (shown as its ID), addressed by its UUID `id`. Before opening the dialog it reads `GET …/schemas/:schemaId/usage` (`{ fields, contents }`, see [Schemas](../../roadmap/database-structure.md#schemas)); while the schema is in use the dialog lists where (`describeSchemaUsage`, `shared/schema-usage.ts`) and Save stays disabled. A failed read opens the dialog without it; the server refuses a rename of a schema in use with a 409, whose message the error toast shows
- `openDeleteDialog(event, schema)` — same `MouseEvent` handling; reads the usage first: in use → a `ConfirmationDialog` with `confirmable: false` (only Close) listing where; unused → the usual destructive confirmation. A 409 from the server shows its message in the error toast
- `openExportDialog()` / `openImportDialog()` — developers only: create a `SCHEMA_EXPORT` / `SCHEMA_IMPORT` task, followed in the progress dialog ([Tasks](tasks.md)). The file is a `.localess.zip` of every schema by name, without database ids (relations between schemas are names, so they hold in any space); the import adds missing schemas and updates the others, checking the whole set first (all or nothing), and still reads an old `.lls.zip`

## EditCompComponent (routed)

Full field editor for `ROOT` and `NODE` schemas. Fields can be added, reordered, and configured. Protected by `isFormDirtyGuard`. Field names are unique (the new-field and name inputs refuse a taken one); the Preview Field select offers the fields of a previewable kind (`SCHEMA_PREVIEW_FIELD_KINDS`), and removing that field clears it; block pickers list NODE schemas, option sources ENUM schemas. The server checks the same rules on save (see [Schemas](../../roadmap/database-structure.md#schemas)) and a refusal (400/409) shows its reason in the error toast.

Both editors read their schema live (`SchemaService.findOne`) and the space's other schemas from `SpaceStore.schemas()` (what a block picker or an option source offers); a change elsewhere keeps unsaved edits. Save sends `SchemaUpdate` built from the form (only the settings: the server refuses other keys) and shows the schema the server answers, unless the form changed while it saved.

Supported field kinds:
`TEXT`, `TEXTAREA`, `RICH_TEXT`, `MARKDOWN`, `NUMBER`, `COLOR`, `DATE`, `DATETIME`, `BOOLEAN`, `OPTION`, `OPTIONS`, `SCHEMA` (embed node), `SCHEMAS` (array of nodes), `LINK`, `REFERENCE`, `REFERENCES`, `ASSET`, `ASSETS`

## EditEnumComponent (routed)

Editor for `ENUM` schemas. Each entry has a `name` (display) and `value` (stored). Protected by `isFormDirtyGuard`.

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddDialogComponent` | Pick type (ROOT / NODE / ENUM), enter ID and display name |
| `EditIdDialogComponent` | Rename schema ID |
| `ExportDialogComponent` | Confirm the export of every schema |
| `ImportDialogComponent` | Pick a `.localess.zip` / `.lls.zip` → an import task |
| `ConfirmationDialogComponent` | Delete confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `SchemaService` | `findAll` (every schema, for `SpaceStore`), `findOne` (live), `findUsage`, `create`, `update` (a component's or an enum's settings: `SchemaUpdate`), `rename`, `remove` |
| `TaskService` | Create the export and import tasks |
| `NotificationService` | Snackbar feedback |

## Schemas as Code

Schemas can also be managed code-first with `@localess/schema` + `@localess/cli`:

- `localess schema pull` — generates TypeScript definition files from the space (`GET /api/v1/spaces/:spaceId/schemas`).
- `localess schema push` — writes code-defined schemas back (`POST /api/manage/v1/spaces/:spaceId/schemas`, management token in `Authorization: Bearer`). Upsert by default; `--delete` enables full sync.

See [V1 API](../../v1-api.md) for the endpoint contract.

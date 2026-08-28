# Spaces — Tasks Module

> Parent: [Spaces Overview](overview.md) · Related: [Translations](translations.md) · [Contents](contents.md) · [Assets](assets.md) · [Schemas](schemas.md)

## Purpose

Monitor and manage background jobs (Tasks) triggered by import and export operations across all other space modules. Tasks are asynchronous — they run server-side and the user polls for completion here.

## Route

```
/features/spaces/:spaceId/tasks             [TRANSLATION_READ] → TasksComponent
/features/spaces/:spaceId/tasks/:taskId                        → TaskDetailComponent
```

## Key Files

```
src/app/features/spaces/tasks/
  tasks.component.ts/html/scss
  task-detail/                       ← per-task detail view: status, file info, and paginated/filterable logs (routed)
```

## TasksComponent

A paginated `ll-table` (see the [`MatTable` → `ll-table` Migration Guide](../../table-migration.md)) of all Tasks for the current space — the first component migrated off `MatTable`/`MatPaginator`. Each row shows the task type, status, file info, description, and creation date; the `id` column hides below the `@5xl` container-query breakpoint. Rows are clickable and navigate to `TaskDetailComponent` via `navigateToDetail(task)`.

**Injected services:** `TaskService`, `MatDialog` (still used for the delete confirmation dialog frame), `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all tasks for the space, sorted client-side via `TableDataSource`/`TableSort` (newest first by default)
- `dataSource` (`TableDataSource<Task>`) is wired to the `TableSort` and `Paginator` view children in `ngAfterViewInit()`
- `<ll-filter-toolbar>` with multi-select **Kind** and **Status** filters, wired via `onFilterChange()` and `FilterPredicateUtils.create()` (search across id/file name/message)
- `navigateToDetail(task)` — navigates to `TaskDetailComponent` for the row
- `onDownload(task)` — downloads the output file of a completed export task from Firebase Storage
- `openDeleteDialog(task)` — confirms then deletes the task record

## TaskDetailComponent (routed)

Shows a single task's status/file info plus its paginated log entries (`TaskLog`), filterable by log **Level** (INFO/WARN/ERROR) via `<ll-filter-toolbar>`. Supports downloading the task's output file and expanding individual log rows for detail.

## Task Types

Most tasks are created by other modules' import/export actions and processed by Firebase Functions:

| Created by | Task type |
|-----------|-----------|
| Translations → Export | `TRANSLATION_EXPORT` |
| Translations → Import | `TRANSLATION_IMPORT` |
| Contents → Export | `CONTENT_EXPORT` |
| Contents → Import | `CONTENT_IMPORT` |
| Schemas → Export | `SCHEMA_EXPORT` |
| Schemas → Import | `SCHEMA_IMPORT` |
| Assets → Export | `ASSET_EXPORT` |
| Assets → Import | `ASSET_IMPORT` |
| Assets → Regenerate Metadata | `ASSET_REGEN_METADATA` |

## Task Status Flow

```
INITIATED → IN_PROGRESS → FINISHED
                        → ERROR
```

## Services Used

| Service | Purpose |
|---------|---------|
| `TaskService` | Fetch tasks, delete, download result files |
| `NotificationService` | Snackbar feedback |

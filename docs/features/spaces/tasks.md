# Spaces — Tasks Module

> Parent: [Spaces Overview](overview.md) · Related: [Translations](translations.md) · [Contents](contents.md) · [Assets](assets.md) · [Schemas](schemas.md)

> **Hidden for now:** the Tasks page and every Import/Export entry point are switched off in the UI (`FEATURE_FLAGS.importExport`) until the issues in [Import / Export](../../roadmap/import-export.md) are fixed. The server API is unchanged.

## Purpose

Monitor and manage background jobs (Tasks) triggered by import and export operations across all other space modules. Tasks are asynchronous — they run server-side in the task worker, and the list and detail views update live (SSE change events) as status and logs change.

## Route

```
/features/spaces/:spaceId/tasks             [CONTENT_WRITERS] → TasksComponent
/features/spaces/:spaceId/tasks/:taskId                        → TaskDetailComponent
```

## Key Files

```
apps/web/src/app/features/spaces/tasks/
  tasks.component.ts/html/scss
  task-detail/                       ← per-task detail view: status, file info, and paginated/filterable logs (routed)
```

## TasksComponent

A paginated `ll-table` (see the [Table](../../components/table.md)) of all Tasks for the current space. Each row shows the task type, status, file info, description, and creation date; the `id` column hides below the `@5xl` container-query breakpoint. Rows are clickable and navigate to `TaskDetailComponent` via `navigateToDetail(task)`.

**Injected services:** `TaskService`, `HlmDialogService`, `NotificationService`, `Router`

**Key behaviour:**
- `loadData()` — one page of the space's tasks at a time (`TaskService.findAll()`, a live query on `GET …/tasks`, which answers `Page<Task>`); `list` (`PagedList`, 20 per page) holds the query, and the paginator, the sort header and the filters change it. A failed load is told ("Tasks can not be loaded.") and ends only that request
- Sorting: only **Created At**, newest first by default (`sort=createdAt`, `direction` `desc` on the server); the header switches between newest and oldest first, never off. ID, Kind and Status have no sort header
- `<ll-filter-toolbar>`: the search box (id, file name or message, case-insensitive, anywhere in them) and the multi-select **Kind** and **Status** filters go to the server (`search`, `kind`, `status`; several values repeat the parameter: `kind=ASSET_EXPORT&kind=CONTENT_EXPORT`) and start again from the first page
- `navigateToDetail(task)` — navigates to `TaskDetailComponent` for the row
- `onDownload(task)` — downloads the output file of a completed export task from `GET /api/app/spaces/:spaceId/tasks/:id/download` (same-origin and cookie-authenticated, so the URL is handed straight to `saveAs`)
- `openDeleteDialog(task)` — confirms then deletes the task record

## TaskDetailComponent (routed)

Shows a single task's status/file info plus its paginated log entries (`TaskLog`), filterable by log **Level** (INFO/WARN/ERROR) via `<ll-filter-toolbar>`. Supports downloading the task's output file and expanding individual log rows for detail.

**Key behaviour:**
- `dataSource.filterPredicate` — set in the constructor via `FilterPredicateUtils.create<TaskLog>()`; `onFilterChange()` applies the toolbar value
- `onDownload()` — downloads the task's output file
- `isLogExpanded(id)` / `toggleLogExpanded(id)` — track which log rows are expanded

## Task Types

Most tasks are created by other modules' import/export actions and processed by the server's task worker (`apps/server/src/modules/tasks/`). Exports are created with `POST /api/app/spaces/:s/tasks` (`{ kind, path? | locale? }`); imports upload the file in the same request as `multipart/form-data` to `POST /api/app/spaces/:s/tasks/import` (the `kind`/`locale` fields must precede the file). The `tasks` row is the queue: the worker claims the oldest `INITIATED` task with `FOR UPDATE SKIP LOCKED`, and task files live in storage at `spaces/{spaceId}/tasks/{taskId}/original`:

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

### Who can create a task

The server (`assertCanManage` in `apps/server/src/modules/tasks/utils/task-roles.ts`) checks the roles the task kind names before creating or deleting it: schema imports and exports need `DEVELOPERS`, `ASSET_REGEN_METADATA` needs `ADMINS`, every other kind `CONTENT_WRITERS`. Request bodies are validated per kind (zod), and the server always creates the task as `INITIATED`. There is no update endpoint; only the task worker writes status, results and errors. A task still `IN_PROGRESS` after an hour is treated as interrupted and marked `ERROR` (not re-run, because an import may be half applied).

Reading tasks, their logs and their files requires `CONTENT_WRITERS`. The task list is not filtered per kind.

## Task Status Flow

```
INITIATED → IN_PROGRESS → FINISHED
                        → ERROR
```

## Services Used

| Service | Purpose |
|---------|---------|
| `TaskService` | Fetch tasks (live), create export/import tasks, remove, build the download URL (`/api/app/spaces/:s/tasks/...`, `TaskController`) |
| `TaskLogService` | Fetch a task's logs (live; `/api/app/spaces/:s/tasks/:id/logs`, `TaskLogController`) |
| `NotificationService` | Snackbar feedback |

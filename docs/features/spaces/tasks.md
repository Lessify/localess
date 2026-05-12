# Spaces — Tasks Module

> Parent: [Spaces Overview](overview.md) · Related: [Translations](translations.md) · [Contents](contents.md) · [Assets](assets.md) · [Schemas](schemas.md)

## Purpose

Monitor and manage background jobs (Tasks) triggered by import and export operations across all other space modules. Tasks are asynchronous — they run server-side and the user polls for completion here.

## Route

```
/features/spaces/:spaceId/tasks    [TRANSLATION_READ]
```

## Key Files

```
src/app/features/spaces/tasks/
  tasks.component.ts/html/scss
```

## TasksComponent

A paginated `MatTable` of all Tasks for the current space. Each row shows the task type, status, progress, file info, and creation date.

**Injected services:** `TaskService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all tasks for the space, sorted by creation date (newest first)
- Polls / refreshes status for tasks in `IN_PROGRESS` state
- `onDownload(task)` — downloads the output file of a completed export task from Firebase Storage
- `openDeleteDialog(task)` — confirms then deletes the task record

## Task Types

Tasks are created by other modules and processed by Firebase Functions:

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

## Task Status Flow

```
CREATED → IN_PROGRESS → COMPLETED
                      → FAILED
```

## Services Used

| Service | Purpose |
|---------|---------|
| `TaskService` | Fetch tasks, delete, download result files |
| `NotificationService` | Snackbar feedback |

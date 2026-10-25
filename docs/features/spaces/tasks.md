# Spaces — Tasks Module

> Parent: [Spaces Overview](overview.md) · Related: [Translations](translations.md) · [Schemas](schemas.md) · [Assets](assets.md) · [Import / Export](../../roadmap/import-export.md) · Design: [2026-10-23 tasks, import and export](../../superpowers/specs/2026-10-23-tasks-import-export-design.md)

## Purpose

The long jobs of a space, run in the background by the server's task worker, and their history: Translations and Schemas import and export, Translate Locale (machine translation of a whole locale), and Regenerate Asset Metadata. The rule for what is a task: **read-only and small → a direct download; anything that writes, or uses the Localess file format → a task.** So exporting one locale as key-value JSON is not a task (Translations downloads it at once).

Whoever starts a task follows it in a **progress dialog** (`shared/components/task-progress-dialog`) and never has to visit this page: queued, running (its step and a bar), then done (an export downloads) or failed (the reason and the problems, read from the task's logs). **Continue in background** closes the dialog; when the task ends, a notification (`TaskNotifierService`) tells the user who started it, wherever they are in the app, with **Download** or **View**. This page is the history and the place to download again.

## Route

```
/features/spaces/:spaceId/tasks             [TRANSLATORS] → TasksComponent
/features/spaces/:spaceId/tasks/:taskId                    → TaskDetailComponent
```

## Key Files

```
apps/web/src/app/features/spaces/tasks/
  tasks.component.ts/html/scss
  task-kinds.ts                      ← the kinds each role may start (the web's copy of the server's task-roles.ts)
  task-detail/                       ← per-task detail: status, who started it, input, file, waited / ran, logs
apps/web/src/app/shared/components/task-progress-dialog/   ← the dialog that follows a task; openTaskProgressDialog()
apps/web/src/app/core/services/task-notifier.service.ts    ← "<kind> finished / failed" for the user who started it
apps/web/src/app/shared/models/task.model.ts                ← kind labels, formatTaskResult, formatTaskProgress
```

## TasksComponent

A paginated `ll-table` (see the [Table](../../components/table.md)) of the space's tasks **of the kinds the user's role may start** (the server filters; see Roles). Each row shows the kind, the status (with the step and count while running, from the progress events), the file, a description (its input: "Locale de (key-value JSON)", "en → de"; "Waited 40 s · ran 2 min 10 s"), who started it and when; the `id` and **Started by** columns hide below the `@5xl` container-query breakpoint. Rows navigate to `TaskDetailComponent`.

- `page` (`pagedResource`) — one page at a time (`TaskService.findAll()`, a live query on `GET …/tasks`, `Page<Task>`); `list` (`PagedList`, 20 per page) holds the query
- Sorting: only **Created At**, newest first by default
- `<ll-filter-toolbar>`: search (id or file name), **Kind** (only the user's kinds) and **Status**, on the server
- `canDownload(task)` / `onDownload(task)` — **Download export** (a finished export) or **Download uploaded file** (an import, whatever its status), from `GET …/tasks/:id/download`
- `openDeleteDialog(task)` — confirms then deletes the task; a queued or running task can't be deleted (the server answers 409), so its space never runs two

## TaskDetailComponent (routed)

The task's status, who started it, its input, its file, how long it waited and ran, and its logs (filterable by level): what it did ("12 created · 40 updated · 1,200 unchanged · 3 skipped"), why it failed (an `ERROR` line) and each problem (`WARN` lines, `translations[42].key: invalid key`, at most 100).

## Task Kinds

| Started from | Kind | Runs | Roles |
|---|---|---|---|
| Translations → Export → All translations | `TRANSLATION_EXPORT` | `.localess.zip` (`translations.jsonl`) | `CONTENT_WRITERS` |
| Translations → Import (`.localess.zip`, `.llt.zip`, or a key-value `.json` with its locale) | `TRANSLATION_IMPORT` (`params`: `{ type: 'translation-full' }` or `{ type: 'translation-json-flat', locale }`) | adds missing keys, updates existing ones | `CONTENT_WRITERS` |
| Translations → Translate Locale | `TRANSLATION_TRANSLATE` | machine-translates a locale (`params`: `{ type: 'translation-translate', sourceLocale, targetLocale, overwrite }`) | `TRANSLATORS` |
| Schemas → Export | `SCHEMA_EXPORT` | `.localess.zip` (`schemas.jsonl`, schemas by name) | `DEVELOPERS` |
| Schemas → Import (`.localess.zip`, `.lls.zip`) | `SCHEMA_IMPORT` | adds missing schemas, updates existing ones | `DEVELOPERS` |
| Assets → Regenerate Metadata | `ASSET_REGEN_METADATA` | reads every file's metadata again | `ADMINS` |

Contents and assets are not exported or imported as tasks: they move with the full export ([roadmap](../../roadmap/space-export-backup.md)).

A task's `params` is discriminated by its `type` (`translation-full`, `translation-json-flat`, `translation-translate`), so the app switches on it alone (`formatTaskParams`). Exports are created with `POST /api/app/spaces/:s/tasks` (`{ kind }`, or `{ kind: 'TRANSLATION_TRANSLATE', params: { type: 'translation-translate', … } }`); imports upload the file in the same request as `multipart/form-data` to `POST …/tasks/import` (the `kind`, `type` and `locale` fields must precede the file; the file name's extension must fit the format, a key-value JSON at most 50 MB). A task's file keeps its real name, sanitised (`sanitizeFileName`: the extension kept whole; in the base, letters, digits, `.`, `_`, `-`, the rest one `-`, empty → `file` (`переводы.json` → `file.json`); at most 150 characters): `spaces/{spaceId}/tasks/{taskId}/{name}`, the same name in `file.name` and the download.

## The file format

One container for every export, `.localess.zip`: `manifest.json` (`format: "localess"`, `version: 1`, `kind`, `exportedAt`, `source` space and locales, `count`) and the entities as JSON Lines (`translations.jsonl`: `{ key, locales, description?, labels? }`; `schemas.jsonl`: the schema with `name`, no database id). Both directions stream: an import reads the file line by line, twice (check, then write), so memory does not grow with the file. Old `.llt.zip` / `.lls.zip` archives still import.

## How a task runs

- **The queue** is the `tasks` table: the worker claims the oldest `QUEUED` task of a space with **no task in progress** (`FOR UPDATE SKIP LOCKED`; a partial unique index on `tasks (space_id) WHERE status = 'IN_PROGRESS'` stops two instances racing). So a space never runs two tasks at once (an export never reads half an import); other spaces go ahead. An instance runs `LOCALESS_TASK_CONCURRENCY` tasks at once (default 1: imports hold their entries in memory).
- **Progress** (`{ step, done, total? }`) is **published, not stored**: a `tasks` change event with `op: 'progress'`, at most once a second (imports `Reading file` → `Checking` → `Writing`, exports `Writing`, `Regenerating`, `Translating`). Live queries do not read again on it; the dialog and the list show it.
- **Everything else a task has to say is in its logs:** its counts (`INFO`), why it failed (`ERROR`), its problems (`WARN`, at most 100, the summary giving the total). The task itself only says `FINISHED` or `ERROR`.
- **All or nothing:** an import checks every line first; any problem (an invalid line, a new key outside the key rule, a schema breaking a cross-schema rule) fails it, writing nothing. It then writes in one transaction. Translate Locale writes its values in one transaction at the end. Nothing is ever deleted.
- **Who started it** (`createdBy`), kept as long as that user exists.
- **Timing:** `started_at` (claimed), `finished_at` (ended); a running instance refreshes `heartbeat_at` every minute. A task `IN_PROGRESS` with no heartbeat for 5 minutes was interrupted (its instance stopped): `ERROR`, an `ERROR` log line "Interrupted: the server running it stopped", not re-run, which frees its space.

## Roles

Each role sees **the kinds it can start** (`apps/server/src/modules/tasks/utils/task-roles.ts`, the table above): the list answers only those kinds (a filter on another kind gives an empty page), and another kind's task, logs or file answer 404. A translator sees only Translate Locale tasks; an editor the translation tasks; a developer also the schema tasks; an admin every kind. The Tasks page and its sidebar entry are open to `TRANSLATORS`. Every `tasks` and `task_logs` change event carries the task's `kind`, and reaches only the roles that may start that kind (`modules/events/utils/event-access.ts`).

## Task Status Flow

```
QUEUED → IN_PROGRESS → FINISHED
                     → ERROR
```

## Services Used

| Service | Purpose |
|---------|---------|
| `TaskService` | Tasks (live), `create` / `createImport` and the `create<Kind>` helpers, `remove`, the download URL (`TaskController`) |
| `TaskLogService` | A task's logs (live; `TaskLogController`) |
| `TaskNotifierService` | The end of a task the user started, as a notification |
| `NotificationService` | Toasts |

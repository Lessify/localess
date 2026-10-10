# Import / Export: hidden until fixed

**Status:** hidden in the UI (`FEATURE_FLAGS.importExport = false` in `apps/web/src/app/core/feature-flags.ts`). The server API (`/api/app/spaces/:spaceId/tasks`) and the task runner stay as they are.

## What is hidden

- Import and Export in the ⋮ menus of Contents, Schemas, Assets and Translations.
- The **Tasks** side menu entry and the `spaces/:spaceId/tasks` route (an old link lands on `/features`). Tasks only report on those imports and exports.
- Not hidden: *Regenerate Metadata* in Assets (an asset task, admins only). Its progress shows only as the notification, since the Tasks page is hidden.

To turn it back on, set `importExport: true` once the items below are fixed.

## To be fixed

### 1. Re-importing a Firebase-era content export duplicates every entry (High)

`TaskRunnerService.contentsImport()` (`apps/server/src/modules/tasks/task-runner.service.ts`) gives every entry whose id is not a UUID (every Firestore id) a new UUIDv7, so nothing matches the space's existing rows:

- every folder and document is inserted again at the same `full_slug` (no unique index stops it), and the v1 slug lookup then returns either copy;
- every re-run adds another full copy. On Firebase the import matched by id, so re-running a file changed nothing;
- references inside `data` (content links, asset ids) keep Firestore ids and resolve to nothing.

Proposed fix (not yet approved):

1. Match by id, then by `full_slug`: a UUID found in the space updates that row; otherwise an entry with an existing `full_slug` updates that row and keeps its UUID; only unmatched entries get a new UUID.
2. Rewrite references in `data` with `rewriteData` (`apps/server/src/modules/firebase-import/rewrite-references.ts`): content ids from the file → the UUIDs chosen in step 1; asset Firestore ids → UUIDs via `assets.legacy_id`. Unresolved references are kept and counted.
3. Log `matched by slug`, `created`, rewritten and unresolved reference counts in the task log.
4. Open question: when a slug matches but the id differs, overwrite (what an import implies) or skip.

### 2. Review the other import kinds for the same id problem

Check schemas (matched by `name`, likely fine), translations (by `key`, likely fine) and assets (Firestore ids in the export, files, folders) for duplicates on re-import and for references that keep Firestore ids.

### 3. Related

- A unique index on `contents (space_id, full_slug)` would make duplicates impossible, but existing data may already hold some. It needs its own migration decision.
- Tasks in `ERROR` keep their Download button enabled.

Spaces moving from Firebase use **Admin → Spaces → Import from Firebase** ([firebase-space-import.md](firebase-space-import.md)), which does not depend on this feature.

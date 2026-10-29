# Space export and backups (TODO)

> Status: to decide later (2026-10-23), from the Tasks / Import-Export redesign. Related:
> [Import / Export](import-export.md) · [Tasks](../features/spaces/tasks.md) ·
> [Import from Firebase](firebase-space-import.md) · [Updates & Backups](../deployment/updates.md#backups)

Two features that look alike and are kept apart on purpose: a **space export** moves a whole space somewhere else, a
**backup** gets a space back to how it was. Neither exists today; the per-module imports and exports (Translations,
Schemas, Contents, Assets) are designed separately.

## Decided

- **Contents and Assets move only with the full export** (the user's decision, 2026-10-23): they are referenced by
  generated ids (contents from other contents, assets from contents and from external sites through CDN URLs), so a
  per-module import into another space cannot keep its references. The per-module Import/Export covers Translations and
  Schemas only, whose identity is a name (`key`, `name`)
  ([design](../superpowers/specs/2026-10-23-tasks-import-export-design.md)). If syncing contents between environments
  (staging → production) becomes a need, the option to trust is "keep the ids, remap only on a collision, remember the
  map per target space".
- **A space export holds the current state of every entity as stored in the database** (the user's decision,
  2026-10-23): no published versions, no history. After an import the space is published like any new one.
- **The same file format as the per-module exports:** one `.localess.zip` container with a `manifest.json` (format,
  version, kinds, source space, locales, counts) and the entities as JSON Lines, streamed both ways; a space export is
  that container holding several kinds.
- **Same job engine as the Tasks:** the same queue and slot (`LOCALESS_TASK_CONCURRENCY`, default 1) and the same
  rule of one task at a time per space, so a backup or an export never runs in the middle of an import.
- **Backups are their own feature, not a Task in the UI** (proposed, to confirm): their own page, table and actions,
  on the shared engine.

## Export vs backup

| | Space export | Backup |
|---|---|---|
| For | Moving or copying a space (another install, a new site) | Getting back to how it was |
| Ids | Remapped on import | Kept |
| Contains | Entity state only | Everything a restore needs (to decide: published versions) |
| Started by | A user | A schedule, and "back up now" |
| Lifecycle | Download, then expires | Restore points with retention |
| Ends with | A file | A restore that replaces the space |

## To decide

### Space export

1. **Where it imports to.** Proposed: only as a new space, Admin → Spaces → Import with a second source next to
   *From Firebase* (*From a Localess file*), reusing the Firebase import's stages, cancel and recovery after a restart;
   every id remapped and references in content rewritten with the id map (`rewriteData`). Merging into an existing
   space stays the per-module imports' job.
2. **What it holds.** Proposed: locales and the default locale, schemas, translations, contents, assets with their
   files. Left out: API tokens and webhook secrets (credentials never travel in a file), webhooks and environments
   (their URLs belong to the old install), users and access, task history.
3. **Who may export and import.** Import creates a space, so admins; export: admins or developers.
4. **Size.** With assets an export can be gigabytes: zip64, streamed, never held in memory.
5. **Retention.** Export files pile up in storage; proposed: expire after 7 days, the task stays in the history as
   *Expired*.

### Backups

1. **What a backup is for.** "This space was broken by an import or by mistake, give me yesterday's" (one space, in the
   app), or also a replacement for the install-level backups (`pg_dump` + storage, [updates.md](../deployment/updates.md#backups)),
   which stay the answer for disaster recovery either way.
2. **Scope.** Per space, or the whole install.
3. **What it holds.** Ids kept; published versions, content history, tokens, webhooks?
4. **Schedule and retention.** Daily? How many restore points? Where they are stored (same storage as the space, or
   elsewhere so a lost disk does not take the backups with it).
5. **Restore.** Replaces the space in one job holding the space's lock; what happens to changes made since, and to
   tokens and caches (the CDN `cv`).
6. **Where it lives in the UI.** Space Settings → Backups, or Admin → Backups.

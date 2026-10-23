# Import / Export

**Status (2026-10-23):** Translations and Schemas import and export are on, reworked
([design](../superpowers/specs/2026-10-23-tasks-import-export-design.md), [Tasks](../features/spaces/tasks.md)).
Contents and Assets import and export are removed; they move with the full export
([Space export and backups](space-export-backup.md)).

## What shipped

- **The rule:** read-only and small → a direct download; anything that writes, or uses the Localess file format → a task.
- **Translations:** one locale as key-value JSON downloads at once (`GET …/translations/export/:locale`, the draft
  values); all translations export as a `.localess.zip` (a task); import a `.localess.zip` (or an old `.llt.zip`), or a
  key-value JSON into a chosen locale (a task). Missing keys are added in both imports; nothing is deleted.
- **Schemas:** export and import a `.localess.zip` (or an old `.lls.zip`), schemas identified by name (no database ids:
  the relations between schemas are names, so they hold in any space).
- **One file format:** `.localess.zip` with a `manifest.json` and the entities as JSON Lines, streamed both ways.
- **Translate Locale** is a task too (`TRANSLATION_TRANSLATE`).
- **The engine:** one task at a time per space, `LOCALESS_TASK_CONCURRENCY` per instance (default 1), progress, a
  structured result, all-or-nothing imports, who started each task; a progress dialog follows a task, a notification
  tells its end; each role sees the kinds it may start.
- `FEATURE_FLAGS.importExport` is gone.

## Why Contents and Assets are not here

They are referenced by generated ids: contents from other contents (links, references), assets from contents and from
external sites (CDN asset URLs). Imported into another space, their ids are taken or meaningless, and every reference
would have to be rewritten through an id map; a re-import would duplicate them unless the import remembered that map.
The Firebase-era content import did exactly that wrong (every entry inserted again on a re-import), which is why this
feature was hidden. Translations and Schemas have names a person chose (`key`, `name`) that mean the same in any space.

Contents and Assets move with the full export instead, imported as a new space (everything remapped in one go). If
syncing contents between environments becomes a need, see the options in
[space-export-backup.md](space-export-backup.md).

## Related

- A unique index on `contents (space_id, full_slug)` (would make duplicate slugs impossible) is still an open migration
  decision ([content and asset trees](content-asset-tree.md)).

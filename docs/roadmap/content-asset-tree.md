# Content and asset trees by `parent_id`

Status: **implemented** — phase 1 (contents, plan: [content-tree-plan.md](content-tree-plan.md)) and phase 2 (assets).

## Goal

The content and asset trees are linked by text today: `contents.parent_slug` / `full_slug` (paths of slugs) and
`assets.parent_path` (slash-joined ancestor ids). Nothing in the database ties a child to its parent, so writes that
run at the same moment leave orphans (a child created in a folder being deleted or renamed), folder moves can form
cycles, a content folder rename rewrites every descendant, and asset folders can not be moved at all.

Both trees move to a parent reference the database enforces:

- a child always has a parent (or is at the root), and deleting a folder deletes everything under it, by the database;
- renaming or moving anything changes **one row**;
- paths are **computed**, never stored, so nothing can drift.

## Decisions

| # | Decision |
|---|---|
| 1 | `parent_id uuid null` (null = root), foreign key `(space_id, parent_id) → (space_id, id) on delete cascade`, in `contents` and in `assets`. |
| 2 | Contents: **slugs unique per parent**, `unique (space_id, parent_id, slug) nulls not distinct` (Postgres 15+; we ship 18). It replaces the unique `full_slug`. |
| 3 | `contents.parent_slug`, `contents.full_slug` and `assets.parent_path` are **dropped**. `fullSlug` / `parentSlug` stay in API responses and snapshots, computed. |
| 4 | Assets keep allowing duplicate names in a folder (roadmap). |
| 5 | The editor navigates by folder id. It loads **every folder of the space once** (assets: `GET …/folders`; contents: `GET …/contents/folders`; both in `SpaceStore`, live) into a map `id → folder`, and builds breadcrumbs, paths and the move dialog's tree from it. |
| 6 | Folder moves check for cycles under a per-space lock (`lockContents`, and `lockAssets` for assets). Nothing else needs a lock: the foreign key and the unique index do the work. |
| 7 | Export and import tasks are redesigned later, once these decisions are stable; until then the content and asset transfer tasks are switched off (see [Export and import tasks](#export-and-import-tasks)). The Firebase import is the migration path that must work. |
| 8 | Firebase import: an item whose parent folder is missing is imported at the root, with a warning. |

Measured on Postgres 18 with 100k rows (5k per space, depth 4): a path lookup by segments costs about 0.07 ms more
than the unique `full_slug` index; renaming a folder with 510 items under it drops from 7.9 ms to 1.2 ms; building
`/links` with computed paths takes 8 ms instead of 4 (once per content write, then stored).

## Phase 1: contents

### Table

```
contents PK (space_id, id)
  parent_id  uuid null           FK (space_id, parent_id) → contents (space_id, id) ON DELETE CASCADE
  kind       FOLDER | DOCUMENT
  name, slug
  schema, data, assets[], links[], references[], published_at, created_at, updated_at

  unique  contents_slug_idx    (space_id, parent_id, slug) NULLS NOT DISTINCT
  index   contents_parent_idx  (space_id, parent_id, kind desc, name)       the children list, in its order
```

`contents_full_slug_idx`, `contents_parent_slug_prefix_idx` and the old `contents_parent_idx` go. `contents_kind_idx`
is reviewed with the queries that remain.

**The parent is a FOLDER:** checked by the code on create and move. `kind` never changes, so the check has no race.

### Paths

- **The folder map (server):** `folderPaths(spaceId)` reads every folder of the space (`id, parent_id, slug`) and
  answers `Map<folderId, fullSlug>`. Any item's `fullSlug` is `path(parent_id) + '/' + slug` (or `slug` at the
  root), its `parentSlug` is `path(parent_id)` (or `''`). Folders are few compared to documents, so this is one small
  query. It is used wherever a list of items needs paths: the children list, `/links`, the publish of a folder, the
  schema usage (first five contents by path), webhook payloads.
- **One item:** a recursive query up to the root, when only one path is needed.
- **By path** (public API `/contents/slugs/a/b/c`): one query walking the segments down from the root, one index probe
  per segment (`contents_slug_idx`).
- **Snapshots** (`content_snapshots`, `content_link_snapshots`) store the computed `fullSlug` / `parentSlug` when they
  are built, as today. A rename or move drops the drafts of the item and of everything under it, and both `/links`
  lists; published snapshots keep the old path until the next publish, as today.

### Operations

| Operation | How |
|---|---|
| Create | Insert with `parent_id` (the foreign key checks the parent exists, and locks it against a delete). A slug taken under that parent is a 409 (the unique index; no pre-check race). The parent must be a folder (400). |
| Rename | Update `slug` (and `name`) of one row. 409 when the slug is taken under the same parent. Drops the drafts of the item and of its subtree (their `fullSlug` changed), and the `/links` lists. |
| Move a document | Update `parent_id` of one row. Same checks as create. |
| Move a folder | Under `lockContents`: the target (and its ancestors) must not be the folder itself or under it (400 "A folder cannot be moved into itself"); then update `parent_id` of one row. |
| Delete | Collect the subtree (recursive query on `parent_id`) for the change events and webhooks, then `delete where id = X`: the foreign key cascade removes the subtree and their snapshots. |
| Publish a folder | The documents under it by a recursive query on `parent_id`, then as today. |
| Clone | A copy next to the original (same `parent_id`), with the suffixed slug, as today. |

### App API

| Today | Becomes |
|---|---|
| `GET …/contents?parentSlug=` | `GET …/contents?parentId=` (absent or empty: root). Responses carry `parentId` and the computed `fullSlug`, `parentSlug`. |
| — | **`GET …/contents/folders`**: every folder of the space, `{ id, parentId, name, slug }`, ordered by name; no limit. |
| `POST …/contents` `{ parentSlug, … }` | `{ parentId, … }` (`parentId` null or absent: root). |
| `PATCH …/contents/:id` `{ name, slug, parentSlug }` | `{ name, slug, parentId }`. |

`?name=`, `?kind=`, `?ids=` and `?limit=` stay. The shared models (`ContentBase`, `ContentCreate`, `ContentUpdate`)
gain `parentId`; `parentSlug` / `fullSlug` remain as read-only computed fields.

### Public v1 API

Unchanged URLs, parameters and bodies. `contents/slugs/*` resolves the path by segments; `/links?parentSlug=` is
filtered on the stored list as today (its entries carry the computed `parentSlug`).

### Editor

- `SpaceStore`: the current content folder is an id (`null`: root) instead of the `contentPath` stack.
- A live folder map (`liveQueryWith` on the `contents` events, refetching `…/contents/folders`): breadcrumbs walk it
  from the current folder up; paths shown in the UI (preview URL, copy full slug) come from it or from the response.
- Add document / folder, edit and move dialogs send `parentId`. The move dialog picks a folder from the map (a tree),
  excluding the moved folder and everything under it.
- The references and links select dialogs navigate by folder id the same way.

### Firebase import

Firestore stores paths (`parentSlug`, `fullSlug`), in no particular page order, and never checked them. The contents
stage keeps a single pass over the Firebase pages:

1. Each page is inserted at the root with a placeholder slug (the new id, unique by construction), and the item's
   Firebase path data is kept in memory (`id, kind, slug, parentSlug, fullSlug`; not its data).
2. After the last page, one transaction links the tree: each item's parent is the folder whose Firebase `fullSlug` is
   its `parentSlug`; the real slug is set. All rows exist already, so the order of the updates does not matter for the
   foreign key.
   - A slug used twice under one parent: the first item keeps it, a later one gets the suffixed slug with a warning
     (`"<path>: path used twice, imported as <new path>"`), as today.
   - A parent that is not a folder of the space: the item stays at the root, with a warning
     (`"<path>: parent folder '<parentSlug>' not found, imported at the root"`).

### Export and import tasks

Hidden behind `FEATURE_FLAGS.importExport` and redesigned later, once these decisions are stable
([Import / Export](import-export.md)). Until then `CONTENT_EXPORT` and `CONTENT_IMPORT` (and in phase 2 `ASSET_EXPORT`
and `ASSET_IMPORT`) end at once as `ERROR` ("Content import and export are being redesigned"), writing nothing; their
tests go with them and come back with the redesign.

### Tests

- Schema: the foreign key refuses a missing parent; deleting a folder cascades to its subtree and their snapshots;
  `(parent, slug)` unique with root as one parent.
- Races: a create in a folder that a concurrent transaction deletes leaves no orphan (it fails, or the delete takes
  it); a rename of a folder while a child is created in it gives the child the new path.
- Folder moves: into itself or under itself is refused; two crossing moves at the same moment end with one refused.
- Paths: children list, `/contents/folders`, `/links`, document snapshots and webhooks carry the computed paths;
  `/contents/slugs/a/b/c` finds by segments; rename and move change one row and drop the right drafts.
- Firebase import: tree linked by paths, duplicates suffixed, a missing parent at the root, each with its warning.
- Editor specs: breadcrumbs from the folder map, navigation by id, move dialog excludes the moved subtree.

## Phase 2: assets

Same pattern, smaller:

```
assets PK (space_id, id)
  parent_id  uuid null           FK (space_id, parent_id) → assets (space_id, id) ON DELETE CASCADE
  index   assets_parent_idx  (space_id, parent_id, kind desc, name)
```

- `parent_path` and `assets_parent_path_prefix_idx` go; names stay non-unique.
- **Move** (files and folders) becomes possible: one row, with the cycle check under `lockAssets` for folders. This
  resolves the roadmap item "Assets — moving folders".
- **Delete**: collect the subtree's FILE ids (recursive query) and queue their stored files (`storage_deletions`) in
  the same transaction, then delete the folder; the cascade removes the rows.
- **App API**: `?parentId=`, `GET …/assets/folders` (the same folder map for breadcrumbs and the move dialog),
  create/upload/move with `parentId`.
- **Firebase import**: the parent is the mapped id of the last `parentPath` segment (simpler than contents); a missing
  one is a warning and the root.
- Export and import tasks: switched off as for contents, redesigned later.

## Impact summary

- **Database:** `contents` and `assets` change shape; `0000_init.sql` regenerated (recreate local `.data`).
- **Server:** contents and assets repositories, services and App API controllers; content delivery (path lookup,
  snapshots, `/links`); schema usage; webhooks payloads; publish; the Firebase import stages; the content and asset
  transfer tasks switched off.
- **Shared:** content and asset models gain `parentId`; `parentSlug` / `fullSlug` / `parentPath` become computed or
  go.
- **Web:** contents and assets pages, `SpaceStore`, the folder maps, breadcrumbs, add/edit/move dialogs, the
  references/links/assets select dialogs.
- **Public v1 API:** no change.
- **Docs:** concepts, contents and assets feature pages, `database-structure.md`, `v1-api.md`, Firebase import.

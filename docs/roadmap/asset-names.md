# Asset names: validation and duplicates (TODO)

> Status: to do, found by the e2e suite (`apps/e2e/tests/assets`). Related: [Assets](../features/spaces/assets.md) ·
> [Content and asset trees](content-asset-tree.md) · [E2E test plan](../../apps/e2e/TEST-PLAN.md)

The rules for an asset's name differ between upload, the dialogs and the server. Kept as they are for now; each item
below says what happens today, where, and which e2e test pins it, so a fix updates that test too.

| | Upload (file picker, drop, paste, link), Move | Create Folder / Edit File / Edit Folder | Server (`assets.controller.ts`) |
|---|---|---|---|
| Length | any (from the file name) | 3–250 (`AssetValidator.NAME`); the Edit Folder input stops at 100 | 1–500 (`name`, trimmed) |
| Spaces around | kept as uploaded | refused (`noSpaceAround`) | trimmed |
| Name already in the folder | allowed, even the exact same name and extension | refused if **any** asset in the folder has it, file or folder, whatever the extension | allowed: "Names may repeat in a folder" (`schema.ts`, `assets_parent_idx`) |

## N1. A file with a short name can't be edited without renaming it

`ab.png` uploads fine (name `ab`). Edit File checks the name with `AssetValidator.NAME` (at least 3 characters), so
Save stays disabled until the file is renamed, even to change only its alt text.

- Where: `apps/web/src/app/features/spaces/assets/edit-file-dialog/edit-file-dialog.component.ts` (`name` control).
- Test: `assets/rename.spec.ts` › "roadmap check: a file with a short name can only be edited by renaming it".
- Options: validate the name only when it changes (keep the uploaded name as is), or apply the same rule on upload.

## N2. Duplicate names: upload allows them, the dialogs refuse more than duplicates

- Uploading `logo.png` into a folder that has `logo.png` gives two `logo.png`
  (`assets/upload.spec.ts` › "a name that exists in the folder can be uploaded again").
- Moving a file or folder into a folder that has the same name is allowed too: the Move dialog checks nothing and
  the server neither, so moving `hero.png` into a folder with `hero.png` gives two (`assets/move.spec.ts` ›
  "roadmap check: moving into a folder with the same name gives two").
- Creating a folder, or renaming a file or folder, is refused when any asset in the folder has that name, compared
  without the extension: `logo.png` can't be renamed to `photo` while `photo.jpg` exists, and a folder can't be named
  like a file (`assets/rename.spec.ts` › "refuses a name another asset in the folder has", `assets/folders.spec.ts` ›
  "refuses a name the folder already has"). The check is client-side only (`reservedNames` from the folder's list in
  `assets.component.ts`); the server accepts all of these.
- **Decided for now (2026-10-19, the user, with [pagination round 2](../superpowers/specs/2026-10-19-pagination-round-2-design.md)):
  duplicates are allowed everywhere.** Once the folder list is paged, the dialogs only hold one page, so their
  `reservedNames` check is dropped: Create Folder, Edit File and Edit Folder accept a name the folder has, as upload and
  Move do. The two e2e tests above that pin the refusal change to pin the duplicate being accepted.
- **Later: a duplicate check**, on the server so it holds whatever the folder size, in every place at once (upload,
  Move, the dialogs). Decide one rule for all three places, e.g. unique per folder by name **and** extension for files and by name for
  folders, enforced by the server (a unique index, 409) and mirrored in the dialogs and on upload (rename or refuse).
  Existing duplicates would need a migration or must stay allowed.

## N3. Edit Folder limits the name to 100 characters

The Edit Folder input has `maxlength="100"`, while Create Folder and `AssetValidator.NAME` allow 250 (and Edit File
250), so a folder created with a long name can't be saved unchanged in Edit Folder.

- Where: `apps/web/src/app/features/spaces/assets/edit-folder-dialog/edit-folder-dialog.component.html`.
- Test: `assets/rename.spec.ts` › "roadmap check: Edit Folder allows 100 characters, Create Folder 250".
- Fix: `maxlength="250"`, the same as Create Folder.

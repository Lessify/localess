# Spaces — Assets Module

> Parent: [Spaces Overview](overview.md) · Related: [Tasks](tasks.md) · [Concepts — Asset](../../concepts.md) · [CDN & Caching](../../cdn-caching.md)

## Purpose

Browse, upload, organise, and manage binary assets (images, videos, documents, fonts) stored in Firebase Storage. Supports folder hierarchy, drag-and-drop upload, clipboard paste upload, image resizing preview, and Unsplash integration.

## Route

```
/features/spaces/:spaceId/assets    [ASSET_READ]
```

## Key Files

```
src/app/features/spaces/assets/
  assets.component.ts/html/scss      ← browser + uploader
  add-folder-dialog/
  edit-file-dialog/                  ← edit file metadata (name, alt text)
  edit-folder-dialog/
  export-dialog/
  import-dialog/
  move-dialog/
```

## AssetsComponent

File/folder browser driven by `SpaceStore.assetPath`. Supports two layout modes (**list** and **grid**) persisted in `LocalSettingsStore.assetLayout`.

**Injected services:** `AssetService`, `MatDialog`, `TaskService`, `UnsplashPluginService`, `NotificationService`, `SpaceStore`

**Key behaviour:**
- `loadData()` — loads assets at the current `assetPath` level
- `onPaste(event)` — intercepts clipboard paste to upload image from clipboard
- `onDrop(event)` — intercepts drag-and-drop to upload one or more files
- Upload flow: file → `AssetService.createFile()` → Firebase Storage upload
- `openAddFolderDialog()` — creates a new folder
- `openEditFileDialog(asset)` — edit metadata: display name, alt text
- `openEditFolderDialog(asset)` — rename folder
- `openDeleteDialog(asset)` — delete file or folder (with cascade for folders)
- `openMoveDialog(asset)` — move to a different folder path
- `openImportDialog()` / `openExportDialog()` — creates Tasks for background processing
- Unsplash integration (if `unsplash_ui_enable` Remote Config flag is `true`) — opens `UnsplashAssetsSelectDialogComponent`

## Image Preview

Assets of type `image/*` render previews using `NgOptimizedImage` with the custom `IMAGE_LOADER`. The loader appends `?w=<width>` to the CDN URL for responsive resizing and `&thumbnail=true` for animated files.

## Dialogs

| Dialog | Purpose |
|--------|---------|
| `AddFolderDialogComponent` | Create new folder |
| `EditFileDialogComponent` | Edit name and alt text |
| `EditFolderDialogComponent` | Rename folder |
| `ExportDialogComponent` | Export assets to archive |
| `ImportDialogComponent` | Upload asset archive → creates a Task |
| `MoveDialogComponent` | Move asset to a new folder |
| `UnsplashAssetsSelectDialogComponent` | Browse and import from Unsplash |
| `ImagePreviewDialogComponent` | Full-size image preview |
| `ConfirmationDialogComponent` | Delete confirmation |

## Services Used

| Service | Purpose |
|---------|---------|
| `AssetService` | CRUD, upload to Firebase Storage |
| `TaskService` | Create import/export tasks |
| `UnsplashPluginService` | Unsplash API integration |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Current space + `assetPath` breadcrumb |

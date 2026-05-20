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

## CDN Asset Endpoint

```
GET /api/v1/spaces/:spaceId/assets/:assetId
```

No auth required (public). Responses are cached for 365 days (`Cache-Control: public, max-age=31536000`).

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `w` | integer > 0 | Target width in pixels |
| `h` | integer > 0 | Target height in pixels |
| `q` | integer 1–100 | Output quality (default: `85`). Applies to JPEG, WebP, AVIF. Ignored for PNG. |
| `f` | string | Output format: `webp`, `jpeg`, `png`, or `avif`. Converts the image to this format. |
| `download` | (flag) | Changes `Content-Disposition` from `inline` to `form-data`, forcing a browser download. |
| `thumbnail` | (flag) | For animated WebP/GIF: extracts the first frame before resizing. For video: extracts a frame with FFmpeg, then resizes with Sharp. |

### Resize Behaviour (`w` / `h`)

Sharp is called as `resize(width ?? null, height ?? null)` with its default `cover` fit:

| `w` | `h` | Behaviour |
|-----|-----|-----------|
| ✓ | — | Scale to width, height auto — aspect ratio preserved, no crop |
| — | ✓ | Scale to height, width auto — aspect ratio preserved, no crop |
| ✓ | ✓ | **`cover` crop** — resizes to fill the exact box, excess edges are cropped |
| — | — | No resize — only format/quality re-encoding if `f`/`q` provided |

### Special Cases

- **`image/svg+xml`** — always passed through; `w`/`h`/`f` are ignored.
- **Animated WebP or GIF without `thumbnail`** — passed through unchanged (Sharp cannot resize animated files).
- **Animated WebP or GIF with `thumbnail`** — first frame extracted, then `w`/`h`/`f` apply normally.
- **Video with `w` + `thumbnail`** — frame extracted via FFmpeg, then resized with Sharp; output defaults to `image/webp`.

> See [V1 Functions API — Asset resize combinations](../../v1-functions-api.md) for the full implementation detail.

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

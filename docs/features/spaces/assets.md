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
- Drag-and-drop is handled by the `FileDragAndDropDirective` (`@shared/directives/file-drag-and-drop.directive`), which calls `filesUpload(event)` with the dropped files — there is no `onDrop()` method on `AssetsComponent` itself
- Upload flow: file → `filesUpload()` queues it → `AssetService.createFile()` → Firebase Storage upload
- `openUrlPrompt()` — prompts for a URL and uploads the remote file as an asset
- `openAddFolderDialog()` — creates a new folder
- `openEditFileDialog(asset)` — edit metadata: display name, alt text
- `openEditFolderDialog(asset)` — rename folder
- `openDeleteDialog(asset)` — delete file or folder (with cascade for folders)
- `openMoveDialog(asset)` — move to a different folder path
- `openImportDialog()` / `openExportDialog()` — creates Tasks for background processing
- `openRegenerateMetadataDialog()` — confirms then creates an `ASSET_REGEN_METADATA` Task (via `TaskService.createAssetRegenerateMetadataTask()`) to regenerate metadata for all assets in the space
- `onDownload(asset)` — opens the CDN asset URL with `?download` to force a browser download
- Unsplash integration (if `unsplash_ui_enable` Remote Config flag is `true`) — opens `UnsplashAssetsSelectDialogComponent`

## CDN Asset Endpoint

```
GET /api/v1/spaces/:spaceId/assets/:assetId
```

No auth required (public). Responses are cached for 365 days (`Cache-Control: public, max-age=31536000`).

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `w` | integer > 0 | Target width in pixels. Clamped to the source width and to 4096 px — never upscales. |
| `h` | integer > 0 | Target height in pixels. Clamped to the source height and to 4096 px — never upscales. |
| `q` | integer 1–100 | Output quality (default: `80`). Applies to JPEG, WebP, AVIF. Ignored for PNG. |
| `f` | string | Output format: `webp`, `jpeg`, `png`, `avif`, or `original`. **Defaults to `webp` for `image/jpeg` sources**; all other source types keep their original format. Pass `f=original` for the stored bytes untouched. Ignored when `download` is set. |
| `download` | (flag) | Changes `Content-Disposition` from `inline` to `form-data`, forcing a browser download. |
| `thumbnail` | (flag) | For animated WebP/GIF: extracts the first frame before resizing. For video: extracts a frame with FFmpeg, then resizes with Sharp. |

### Default Output Format

`image/jpeg` sources are re-encoded to **WebP** by default — including requests carrying no query
parameters at all, which is what pulls a bare `<img src=".../assets/{id}">` onto the transform path.
WebP is typically 25–35% smaller than JPEG at equivalent perceptual quality.

All other source types are unaffected: PNG (lossy WebP degrades screenshots and line art), GIF and
animated WebP (passed through untransformed — Sharp cannot resize animations), SVG, and video.

Three ways to opt out, each meaning something different:

| Request | Returns | Use when |
|---------|---------|----------|
| `?f=jpeg` | JPEG **re-encoded** at `q=80` | The client cannot render WebP — Outlook and some email clients, Safari below 14, a few link/OG crawlers. Still compressed, so the escape hatch stays cheap. |
| `?f=original` | The stored bytes, **byte-for-byte**, `inline` | You need the untouched source without forcing a download — full-quality lightbox, print, downstream processing. |
| `?download` | The stored bytes, **byte-for-byte**, as an attachment | A save-file action. |

`f=original` composes with a resize: `?f=original&w=200` scales to 200 px while keeping the source
format, i.e. "resize but don't convert me".

### Lossless no-op collapse

Requesting a **lossless** format that the source already is — only `?f=png` on an `image/png` today
— is served as a passthrough rather than re-encoded, since the encoder would spend CPU producing
equivalent bytes.

**Lossy formats deliberately do not collapse.** `?f=jpeg` on a JPEG re-encodes at `q=80`, because
that is a real size reduction (116 KB → 64 KB on a test asset) and the whole purpose of this
endpoint. Collapsing it would serve the full uncompressed original to precisely the clients least
able to afford it. `f=original` is the passthrough; `f=<format>` means encode.

### Resize Behaviour (`w` / `h`)

Sharp is called as `resize(width ?? null, height ?? null)` with its default `cover` fit and
`withoutEnlargement: true`:

| `w` | `h` | Behaviour |
|-----|-----|-----------|
| ✓ | — | Scale to width, height auto — aspect ratio preserved, no crop |
| — | ✓ | Scale to height, width auto — aspect ratio preserved, no crop |
| ✓ | ✓ | **`cover` crop** — resizes to fill the exact box, excess edges are cropped |
| — | — | No resize — only format/quality re-encoding if `f`/`q` provided, or if the source is `image/jpeg` and the WebP default applies |

Both dimensions are clamped before any resize runs: first to the stored original's
`metadata.width`/`metadata.height`, then to `MAX_OUTPUT_DIMENSION` (4096 px, defined in
`functions/src/utils/image-transform.ts`). Requests above either bound are clamped rather than
rejected, and the `Content-Disposition` filename reflects the clamped size. Omit `w`/`h` entirely to
receive the untouched original (subject to the WebP default above).

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
| `UnsplashAssetsSelectDialogComponent`* | Browse and import from Unsplash |
| `ImagePreviewDialogComponent`* | Full-size image preview |
| `ConfirmationDialogComponent` | Delete / regenerate-metadata confirmation |

\* Shared/global components (`src/app/shared/components/unsplash-assets-select-dialog/`, `src/app/shared/components/image-preview-dialog/`) — not local to `assets/`.

## Services Used

| Service | Purpose |
|---------|---------|
| `AssetService` | CRUD, upload to Firebase Storage |
| `TaskService` | Create import/export tasks |
| `UnsplashPluginService` | Unsplash API integration |
| `NotificationService` | Snackbar feedback |
| `SpaceStore` | Current space + `assetPath` breadcrumb |

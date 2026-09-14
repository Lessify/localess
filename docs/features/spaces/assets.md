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
- `onDownload(asset)` — opens the asset `/download` route to force a browser download
- Unsplash integration (if `unsplash_ui_enable` Remote Config flag is `true`) — opens `UnsplashAssetsSelectDialogComponent`

## CDN Asset Endpoint

### Routes

| Route | Serves |
|---|---|
| `GET /api/v1/spaces/{spaceId}/assets/{assetId}` | A transformed image. Accepts `w`, `h`, `q`, `f`, `fit`, `thumbnail`. |
| `GET /api/v1/spaces/{spaceId}/assets/{assetId}/download` | The stored bytes, as an attachment. No parameters. |

No auth required (public). Responses are cached for 365 days (`Cache-Control: public, max-age=31536000`).

`/download` never enters the image pipeline, which is why it takes no parameters: a transform
parameter on it is rejected with `400` rather than ignored.

**There is no `/original` route.** The transform route already returns the stored bytes when given
no parameters — nothing is converted implicitly — so an inline passthrough route would be a second
URL for byte-identical output. `attachment` is the only thing the transform route cannot express,
which is why `/download` exists and its sibling does not.

**Removed in v4:** `?download` and `?f=original`. Both return `400`, the first naming `/download`
and the second saying to omit `f`. Responses already cached under the old spellings keep serving
for the remainder of their 365-day TTL — only new requests are rejected.

### Query Parameters

These apply to the transform route only.

| Param | Type | Description |
|-------|------|-------------|
| `w` | integer 1–8192 | Target width in pixels. Above the source width, **redirects** to the source width. Outside 1–8192 is rejected with `400`. |
| `h` | integer 1–8192 | Target height in pixels. Above the source height, **redirects** to the source height. Outside 1–8192 is rejected with `400`. |
| `q` | integer 1–100 | Output quality. When omitted, each encoder applies its own default (JPEG/WebP 80, AVIF 50) and PNG stays lossless. On PNG an explicit `q` enables palette quantisation — lossy, roughly a third of the lossless size on screenshots. Outside 1–100 is rejected with `400`. |
| `f` | string | Output format: `webp`, `jpeg`, `png`, or `avif`. **No implicit conversion** — omit it and the stored format is kept. Passing it is the recommended way to cut transfer size. `f=original` was removed in v4 — omit `f` instead. |
| `fit` | string | How the image is fitted when **both** `w` and `h` are given: `cover` (default), `contain`, `inside`, `outside`, `fill`. Ignored with a single dimension. An unrecognised value is rejected with `400`. |
| `thumbnail` | (flag) | For animated WebP/GIF: extracts the first frame before resizing. For video: extracts a frame with FFmpeg, then resizes with Sharp. |

### Animated images

**Animated GIF and WebP are resized like any other image**, with every frame preserved. Passing
`?f=webp` converts an animated GIF to animated WebP, which is where the large savings are — on a
test clip, `?w=240&f=webp` produced **4% of the source GIF size**.

Resizing an animation decodes *every* frame at once, so the memory cost is
`width x pageHeight x frames` rather than the single-frame cost `w`/`h` are bounded by. An
animation above **12 megapixels in total** is rejected with `400`; ask for `?thumbnail` to get a
still first frame instead. The API runs at 1 GiB with concurrency 20, so an unbounded animation
would not merely fail its own request — it would exhaust the container for every other request
sharing it.

### Colour profiles and orientation

- **EXIF orientation is applied.** Sharp strips the orientation tag on re-encode, so a rotated
  source is baked into the pixels instead. Without this a portrait phone photo came back
  landscape, with its **aspect ratio transposed** — breaking layout, not just rotation.
- **An embedded colour profile is carried through.** Sources without one gain nothing: tagging
  every response as sRGB would add ~506 bytes each to declare a colour space renderers already
  assume.

### Parameter Validation

Every parameter is validated before any work happens. A rejection returns `400` with the offending
parameter and value, and is **cached for an hour** (`CACHE_BAD_REQUEST_MAX_AGE`) — so a malformed
URL fails consistently rather than re-entering the function on every request.

`w`, `h` and `q` accept only a **canonical decimal integer** — no fractions, no leading zeros, no
exponent or hex notation, no surrounding whitespace, no `+` sign.

| Input | Result |
|-------|--------|
| `w=abc`, `w=undefined`, `w=NaN`, `q=abc` | `400` — not a number |
| `w=400.9`, `q=50.5`, `q=50.0`, `w=0.5` | `400` — not a whole number |
| `w=0400`, `w=4e2`, `w=0x190`, `w=%20400`, `w=+400` | `400` — not canonical |
| `w=0`, `w=-5`, `w=8193`, `w=50000` | `400` — outside 1–8192 |
| `q=0`, `q=101`, `q=150` | `400` — outside 1–100 |
| `f=bogus`, `fit=squish` | `400` — not a recognised value |
| `w=` (empty) | treated as **omitted**, not invalid |
| `w=400`, `q=50` | accepted |

### Why fractions and aliases are rejected rather than normalised

This is a caching rule more than a validation one. `q=50`, `q=50.1` and `q=50.5` all encode at
quality 50 and return **byte-identical** responses — but they are three different URLs, so three CDN
cache entries, and three runs of Sharp to produce the same bytes. `w=400`, `w=0400` and `w=4e2` do
the same for resizing.

Normalising them server-side would not help: the CDN keys on the URL it was given, so the duplicate
entries exist whether or not the function collapses them. Only refusing the alias keeps one value to
one URL.

**Nothing is silently adjusted.** Every value that would have been rewritten is either rejected
(`w=9000`, `q=150`, `w=400.9`) or redirected to its canonical form (`w=5000` on a 400 px source).
Both keep the invariant that one URL maps to exactly one response — a clamp would have broken it by
serving several URLs the same bytes.

`@localess/client` applies the identical validation in `buildAssetQueryString`, throwing a
`TypeError` before the URL is built — the same rule enforced one layer earlier, where the failure is
a stack trace at the call site rather than a cached `400` in production.

### Output Format — nothing is converted implicitly

**`f` is the only thing that changes an image's format.** A request that does not ask for one gets
back the format that was uploaded. A bare `<img src=".../assets/{id}">` never enters Sharp at all:
no download, no decode, no re-encode, just the stored bytes.

> An earlier revision defaulted `image/jpeg` to WebP. It was removed before release. A format
> change is the developer's call, and the default put every bare `<img>` through a decode and
> re-encode on each CDN miss to produce bytes nobody asked for.

**Passing `f` is the recommended way to cut transfer size**, and it is worth doing:

| Request | Returns |
|---------|---------|
| `?f=webp` | WebP — typically 25–35% smaller than the equivalent JPEG |
| `?f=avif` | AVIF — usually smaller again, at some encode cost |
| `?f=jpeg` | JPEG, for clients that cannot render WebP — Outlook and some email clients, Safari below 14, a few link/OG crawlers |
| *(no `f`)* | The stored bytes, **byte-for-byte**, `inline` |
| `/download` | The stored bytes, **byte-for-byte**, as an attachment |

A resize without `f` re-encodes in the **source** format — `?w=200` on a JPEG returns a 200 px
JPEG. The size changes; the format does not.

### Quality (`q`) — the encoder's default, not ours

When `q` is omitted the endpoint **passes nothing to the encoder**, so each format applies its own
calibrated default:

| Format | Default when `q` is absent |
|---|---|
| JPEG, WebP | 80 |
| AVIF | 50 |
| PNG | lossless — `q` has no effect at all |

This is deliberate, because **a quality number is not portable between codecs**. AVIF is
quantizer-based and sits on a different perceptual curve from JPEG and WebP: 50 there is roughly
what 80 is here. An earlier revision forced 80 onto every encoder, which made AVIF several times
larger than its own default and larger than the equivalent WebP — turning the best format on offer
into the worst one to request.

An explicit `?q=` always wins, for every format.

### Lossless no-op collapse

Requesting a **lossless** format that the source already is — only `?f=png` on an `image/png` today
— is served as a passthrough rather than re-encoded, since the encoder would spend CPU producing
equivalent bytes.

**Lossy formats deliberately do not collapse.** `?f=jpeg` on a JPEG re-encodes, because
that is a real size reduction (116 KB → 64 KB on a test asset) and the whole purpose of this
endpoint. Collapsing it would serve the full uncompressed original to precisely the clients least
able to afford it. Omitting `f` is the passthrough; `f=<format>` means encode.

### Resize Behaviour (`w` / `h`)

Sharp is called as `resize(width ?? null, height ?? null)` with its default `cover` fit:

| `w` | `h` | Behaviour |
|-----|-----|-----------|
| ✓ | — | Scale to width, height auto — aspect ratio preserved, no crop |
| — | ✓ | Scale to height, width auto — aspect ratio preserved, no crop |
| ✓ | ✓ | **`cover` crop** — resizes to fill the exact box, excess edges are cropped |
| — | — | No resize — only format/quality re-encoding if `f`/`q` provided, or if the source is `image/jpeg` and the WebP default applies |

### Oversized requests redirect, they do not upscale

A request larger than the stored original returns a **`302` to the size the source can actually
produce** — `?w=5000` on a 400×300 asset redirects to `?w=400`. No upscaling, and no duplicate
content in the CDN: every oversized spelling collapses onto one canonical URL rather than returning
identical bytes under many. It is the same pattern the `cv` parameter uses for content.

| Request (400×300 source) | Redirects to |
|--------------------------|--------------|
| `?w=5000` | `?w=400` |
| `?h=5000` | `?h=300` |
| `?w=5000&h=5000&fit=cover` | `?w=300&h=300&fit=cover` |
| `?w=4000&h=1000` | `?w=400&h=100` |
| `?w=5000&q=60&f=png` | `?w=400&q=60&f=png` |

**With both dimensions, the box shrinks proportionally rather than per-axis.** `fit` is defined
against the box's aspect ratio, so capping each axis independently would silently change the
result: a 5000×5000 request is a square box that crops, while a per-axis cap to 400×300 is a 4:3
box that does not crop at all.

The redirect target is built by `buildAssetQuery` in a fixed parameter order with valueless flags,
so it is *the* canonical spelling rather than merely a valid one — otherwise the redirect would
point at yet another URL for the same bytes. An explicit `q` is preserved; an absent one is not
back-filled with the default, for the same reason.

**Assets with no recorded dimensions are served as requested.** `metadata.width`/`height` is
optional, and when absent the function cannot know the source size, so it honours the request
rather than guessing — older assets keep their previous behaviour until metadata is regenerated.

Separately, `MAX_OUTPUT_DIMENSION` (8192 px) bounds the request itself and is a **rejection**:
`?w=9000` returns `400` before any redirect is considered. That ceiling exists for memory rather
than bandwidth — Sharp holds the full decoded bitmap, so an 8192 px edge is roughly 200 MB of raw
pixels. Raising it means revisiting `memory` and `concurrency` in `functions/src/v1.ts` too.

Omit `w`/`h` entirely to receive the untouched original (subject to the WebP default above).

### Special Cases

- **`image/svg+xml`** — always passed through; `w`/`h`/`f` are ignored.
- **Animated WebP or GIF without `thumbnail`** — resized with every frame preserved. Above 12 megapixels total (width x pageHeight x frames) the request is rejected with `400`.
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

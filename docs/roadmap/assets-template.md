# Test template "Assets (large)" (design)

> Status: built (2026-10-17): [plan](../superpowers/plans/2026-10-17-assets-template.md). Builds on [Space templates](space-templates.md) and
> [Contents (all fields)](contents-template.md) (template files stored before the create transaction, keyed items).
> Related: [Assets](../features/spaces/assets.md) · [E2E test plan](../../apps/e2e/TEST-PLAN.md)

## Why

The Assets page and the asset picker load the whole open folder in one request and page and sort it in the browser
(`assets.component.ts`, `assets-select-dialog`; 20 per page by default, 10/20/50/100 to choose). Every asset test today
works with a handful of files, so nothing checks paging, sorting or the picker's file-type filter with a folder of real
size, or that the page stays usable with 1,000 files.

## Goals

1. A test template `ASSETS_LARGE` ("Assets (large)"), same rule as the other test templates (only with
   `LOCALESS_TEST_TEMPLATES`, never in production; nothing published).
2. **1,000 files in one folder**, with names, sizes and types a test can compute, plus a few folders for navigation.
3. **Fast enough to create per test**: the files are tiny, generated once per create, metadata known without reading
   them back.
4. **Stable output**: names, bytes, sizes, types and dimensions identical on every run.
5. **E2E tests** on paging, sorting, the grid view and the picker's filter at that size.

## Non-goals

- Server-side paging or search for assets (not in the product today; see "Seen while designing").
- Video files (they need ffmpeg for thumbnails; a later template if wanted).
- Changing the existing templates.

## Anti-goals

- A slow create: it runs once per test that uses it. Target: well under 3 seconds.
- Stray files after a failed create (as for the contents template).
- A test that depends on upload time (`updatedAt` is the same for all; sorting by it proves nothing).

## Decided

### Content of the space

- **Locales:** English only (assets are not localised).
- **Folders** at the root: `Bulk` (the 1,000 files), `Nested` with `Nested/Deep` (one image in each, for navigation),
  and `Empty` (no files).
- **`Bulk`: 1,000 files `file-0001` … `file-1000`**, by a fixed rule:
  - every 10th file (`file-0010`, `file-0020`, …, 100 files) is a PNG image (`.png`, image/png), 16 × 16, the same bytes;
  - the others (900) are text files (`.txt`, text/plain) of exactly N bytes (a fixed pattern cut to length), so every
    text file has its own size: `file-0001` is the smallest file (1 byte), `file-0999` the largest (999 bytes); the
    PNGs share one size between them;
  - names zero-padded so that name order equals number order.
- **A schema and a document for the picker**: `gallery` (ROOT) with `images` (ASSETS, images only) and `files` (ASSETS,
  any file); one document `Gallery` (draft, no values).

### How it is created

- As the contents template: the files are stored before the transaction under upload guards, the rows written in it,
  deleted on failure.
- **Metadata without reading back**: the PNG's width and height are known from the generator (`{ type: 'image',
  width: 16, height: 16 }`), so the create does not run the metadata reader 100 times (my call, for speed); text files
  get none, as an upload does. A server test reads one of the stored PNGs with the real reader and compares: the declared metadata must equal an upload's (`orientation` and `hasAlpha` included, *added 2026-10-18*).
- **One image's bytes reused** for the 100 PNGs; each still gets its own stored file (a file per asset, as uploads do).
- Rows inserted in chunks (as translations are).

### E2E tests on it (first set)

- **Paging**: `Bulk` shows 20 of 1,000 (50 pages); first, next, last page show the expected names; page size 100 →
  10 pages; the choice of page size works after a reload as the app keeps it (or not: the test pins today's behaviour).
- **Sorting** (list view): by name ascending / descending (first and last names), by size (smallest and largest text
  file first), by type (the images grouped).
- **Grid view**: pages the same way (20 cards, last page).
- **Navigation**: into `Nested/Deep` and back by the breadcrumb; `Empty` shows the empty state.
- **The picker at scale**: in the `Gallery` document, the image-only field's picker in `Bulk` offers only the 100
  images (5 pages of 20); the any-file field's picker offers all 1,000; picking two images saves them.
- **A new file in a big folder**: uploading `file-0000.txt` puts it first by name.

The expectations are restated in an e2e helper from the rule, not imported from the server.

## Seen while designing (not in scope)

- The Assets page has no search and no type filter; finding a file in a folder of 1,000 means paging. A candidate for
  the roadmap if wanted.
- The list loads a whole folder without a limit; at much larger sizes this will matter (server paging).

## Calls made in writing this (check these)

- 1,000 files in one folder; 1 in 10 an image; a text file `file-NNNN` is N bytes (unique sizes, so a size sort names
  its first file).
- PNG metadata set from the generator instead of read back (speed).
- English only.
- A `gallery` schema and document in the template, for the picker tests.

## Left to the builder

- File and helper names in the spaces module; how the generator shares the image bytes.
- Server tests: counts, sizes and types follow the rule; a failure leaves nothing; rows and upload guards written in chunks (counted statements, not a time limit: *changed 2026-10-18*, a wall-clock limit is flaky on CI).

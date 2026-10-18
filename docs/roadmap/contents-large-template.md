# Test template "Contents (large)" (design)

> Status: built (2026-10-17): [plan](../superpowers/plans/2026-10-17-contents-large-template.md). Builds on [Space templates](space-templates.md),
> [Contents (all fields)](contents-template.md) and [Assets (large)](assets-template.md). Related:
> [Contents](../features/spaces/contents.md) · [Publish flow](../publish-flow.md) · [CDN caching](../cdn-caching.md)

## Why

Content tests work with a handful of documents. With a few thousand, several places behave differently, and nothing
tests them:

- the Contents page and the references picker load one folder at a time and page and sort it in the browser (20 per
  page; no search);
- the Link field's document list loads **every document of the space** (`spaceStore.documents()`) and renders them all
  at once (no virtual scroll);
- publishing a folder publishes everything under it in one transaction under the space's contents lock;
- the CDN `/links` index is one snapshot of every folder and document, filtered in memory.

## Goals

1. A test template `CONTENTS_LARGE` ("Contents (large)"), same rule as the other test templates; nothing published.
2. **2,000 documents and 67 folders** in a known tree (below), each document with a little data.
3. Fast enough to create per test (under 3 s), stable output.
4. **E2E tests** at that size: paging and sorting a folder of 1,000, deep navigation, publishing and unpublishing a
   folder of 192 documents, `/links` and its filters, the references picker and the Link field's document list.

## Non-goals

- Server-side paging or search for contents, or virtual scroll in the Link field (not in the product today; see "Seen
  while designing").
- Performance budgets as assertions in e2e (timings are recorded in the test plan, not asserted; one server test pins
  the create time).

## Anti-goals

- A slow create (it runs per test), stray rows after a failed create, values that change between runs.

## Decided

### Content of the space

- **Locale:** English only (my call: the scale is in the number of documents; locales multiply publish cost without
  testing anything new here).
- **Schema** `article` (ROOT): `title` TEXT, `body` TEXTAREA, `related` REFERENCE, `link` LINK.
- **Tree** (slugs; names in brackets):
  - `archive` [Archive]: 1,000 documents `doc-0001` … `doc-1000` [Doc 0001 …], flat — for paging and sorting.
  - `blog` [Blog] → `2022` … `2026` [2022 …] → `01` … `12` [01 …] → 16 documents each, `post-01` … `post-16`
    [Post 2024-06-01 …]: 5 + 60 folders (67 with `archive` and `blog`), 960 documents — for depth, folder publish and `/links` filters.
  - 40 documents at the root, `page-01` … `page-40` [Page 01 …].
  - Totals: 2,000 documents, 67 folders (`archive`, `blog`, 5 years, 60 months = 67).
- **Data** of every document: `title` = its name, `body` = `Body of <name>`; `related` → the document before it in its
  folder (none for the first); `link` → `https://example.com/<full slug>`. Id lists filled as for the contents template.

### How it is created

- Same mechanism as the other templates; no files. Content rows inserted in chunks (as asset rows and translations).

### E2E tests on it (first set)

- **Paging `archive`**: 1,000 documents, 50 pages of 20; next, last (`Doc 0981` … `Doc 1000`), 100 per page.
- **Sorting**: by name both ways (`Doc 0001` / `Doc 1000` first).
- **Depth**: `Blog/2024/06` holds 16 posts; the breadcrumb leads back to each level.
- **Publish a folder**: publish `Blog/2024` from the list → the published `/links?parentSlug=blog/2024` lists its 192
  documents (its 12 month folders are listed before and after: the published index always lists every folder), a post
  is delivered; unpublish it → none of the 192 published, the drafts stay. Time recorded.
- **`/links` at size**: the draft index has 2,067 entries; `parentSlug=blog` with `excludeChildren=true` gives the 5
  years; `kind=DOCUMENT` gives 2,000.
- **References picker**: in `Page 01`, pick `Doc 0999` from `Archive` (page 50) → saved, delivered.
- **Link field at 2,000 documents**: in `Page 01`, the document list opens and finds `Doc 1000` by typing; picking it
  saves a content link. The time to open the list is recorded (it renders every document).

## Seen while designing (not in scope)

- No search on the Contents page or in the references picker.
- The Link field renders all documents of the space as options, and the space loads all documents with their data when
  it opens (`findAllDocuments`); at much larger sizes both will need paging or search on the server.
- Publishing a large folder holds the space's contents lock for the whole transaction.

## Calls made in writing this (check these)

- English only.
- The tree and counts above (1,000 flat; 5 × 12 × 16 deep; 40 at the root).
- Timings recorded, not asserted, in e2e.

## Left to the builder

- Names of files and helpers; how the generator builds the tree; server tests (counts, a sample document's data and
  references, stability, rows written in chunks (counted statements, not a time limit: *changed 2026-10-18*), a failed create leaves nothing).

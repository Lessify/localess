# Test template "Contents (all fields)" (design)

> Status: built (2026-10-17): [plan](../superpowers/plans/2026-10-17-contents-template.md). Builds on [Space templates](space-templates.md) (server templates,
> `LOCALESS_TEST_TEMPLATES`, the `spaceTemplate` e2e fixture option). Related: [Concepts](../concepts.md) (how
> localised values are stored) · [Publish flow](../publish-flow.md) · [Contents](../features/spaces/contents.md) ·
> [E2E test plan](../../apps/e2e/TEST-PLAN.md)

## Why

Content tests spend most of their code building a world: a schema, documents to point at, uploaded files, saved data
(the contents specs make about 140 setup calls). Each test builds only the slice it needs, so no test sees every field
kind together, in every locale, in both versions. A prepared space answers that: every field kind filled in, in three
locales, translatable and not, nested five levels deep, with files and documents to refer to. Tests start from it and
change one thing.

## Goals

1. A test template `CONTENTS_FIELDS` ("Contents (all fields)"), offered and accepted under the same rule as
   "Translations (large)" (only with `LOCALESS_TEST_TEMPLATES`, never in production).
2. It creates **schemas covering all 18 field kinds**, **assets with real generated files**, **reference target
   documents** and **three prefilled documents** (below), in English (default), German and French.
3. **Nothing is published.** Publishing stays the user's action; a test that needs a published version presses Publish.
4. **Stable output.** Names, slugs, values, files (bytes, sizes, dimensions) are the same on every run. Ids (UUIDv7) and
   timestamps differ; values that hold an id (reference, link to a document, asset) point to the same named item.
5. **A first set of e2e tests** on it (below).

## Non-goals

- Changes to the "Translations (large)" template or the space template mechanism, beyond what assets need.
- A published starting state, or documents that differ between draft and published at creation.
- Permissions (tests run as the seeded admin; the permissions rework comes later).
- Large content volumes (a "Contents at scale" template is a later round).

## Anti-goals

- **A test template reachable in production** (same rule as before).
- **Stray files**: a failed create must not leave stored files behind.
- **Values that differ between runs** (random, clock-based).
- **A slow create**: well under a second or two; it runs once per test.

## Decided

### Content of the space

**Locales:** English (default), German, French.

**Assets** (folder `Media`), generated on the server, same bytes every run:

| File | Kind | Content |
|---|---|---|
| `red.png` | image/png | 64 × 48, solid red |
| `blue.jpg` | image/jpeg | 32 × 32, solid blue |
| `readme.txt` | text/plain | a fixed line of text (a non-image, for the file-type filter) |

**Schemas:**

- `colour` (ENUM): `red`, `green`, `blue` (for OPTION / OPTIONS).
- `cardplain` (NODE): `title` (TEXT, **not** translatable) — the block of the plain fields, so nothing in the plain
  document is translatable, inside blocks either.
- `card` (NODE): `title` (TEXT, translatable) — the block of the translatable fields.
- `fieldsplain` (ROOT): one field of each of the 18 kinds, **translatable off** everywhere. Field names are the
  kind in lower case: `text`, `textarea`, `richtext`, `markdown`, `number`, `color`, `date`, `datetime`, `boolean`,
  `option`, `options`, `link`, `reference`, `references`, `asset` (**images only**), `assets` (any file), `block`
  (SCHEMA → `cardplain`), `blocks` (SCHEMAS → `cardplain`).
- `fieldsi18n` (ROOT): the same 18 fields, **translatable on** for every kind that allows it (all but `reference`,
  `references`, `block`, `blocks`, which can never be translatable); `asset` and `assets` take any file; `block` /
  `blocks` → `card`, whose title is translatable.
- `level1` … `level5` (NODE): each has `title` (TEXT, translatable); `level1`–`level4` also `child` (SCHEMA → the next
  level). `nestedpage` (ROOT): `title` and `child` (SCHEMA → `level1`).
- `target` (ROOT): `title` (TEXT, translatable) — the documents references and links point to.

**Contents** (all drafts):

| Path | Name | Schema | Values |
|---|---|---|---|
| `targets/` | Targets | folder | |
| `targets/alpha`, `targets/beta`, `targets/gamma` | Alpha, Beta, Gamma | `target` | `title` per locale, e.g. `Alpha (de)` |
| `fields/` | Fields | folder | |
| `fields/plain` | All fields (plain) | `fieldsplain` | one value per field, the same in every locale (stored once) |
| `fields/translated` | All fields (translated) | `fieldsi18n` | a **different** value per locale for every translatable field |
| `nested` | Nested page | `nestedpage` | a title per locale at every level, `Level 5 (de)` at the bottom |

Values follow a rule a test can compute, written down next to the template (as for the large translations template):
text-like fields say what they are and where (`Text (de)`); numbers, dates, colours, booleans and options differ per
locale in `fields/translated`; `reference` → Alpha, `references` → Alpha and Beta; `link` → a URL in English and a
document (Beta) in German and French; `asset` → `red.png` in English, `blue.jpg` in German and French; `assets` →
both images; `block` / `blocks` → one / two blocks: `cardplain` with one title in the plain document, `card` with a title per locale
in the translated one. The document's `assets`, `links` and
`references` id lists are filled from the values (the server stores them as given; the CDN resolves from them).

Stored as the app stores them ([Concepts](../concepts.md)): the default locale under the bare key, others under
`{field}_i18n_{locale}`; non-translatable fields under the bare key only; blocks as `{ _id, _schema, … }`.

### How it is created

- **Database rows in the create transaction**, as today (`SpaceTemplateRepository`): locales, schemas, asset rows,
  contents with their data.
- **Files before the transaction**, the way uploads already work (`shared/data-rules/storage-deletions.ts`): guard
  each asset's storage prefix (`guardUpload`), store the generated file, read its metadata (`AssetMetadataService`),
  then insert the row and release the guard (`releaseUploadGuards`) in the transaction. If anything fails, the guard
  lets the storage sweeper delete the files; nothing stray stays.
- A template refers to its items by key (`alpha`, `red.png`); the create maps keys to the new ids when it writes
  values and id lists.
- The spaces module writes these tables with its own queries ("tables are shared, queries are not",
  [server architecture](../server/architecture.md)); storage and asset metadata come from `infra` and `shared`.

### E2E tests on it (first set)

- **A new space:** the draft of every document in every locale is what the rule says (plain: the same value in all
  three; translated: each locale its own); the published version answers 404 (nothing published).
- **Not translatable:** in German and French, every field of "All fields (plain)" is read-only in the editor, the
  block titles included; in English, editable.
- **Translatable:** change the German value of a few kinds (text, number, option, asset, link) in the editor → the
  German draft changes, English and French don't (UI after reload, API, CDN).
- **Nested:** open level 5 in the editor, change its German title, save → the API and the German draft have it at the
  end of the path; the other levels and locales are unchanged.
- **Publish and unpublish:** Publish → the published version equals the draft in every locale; Unpublish → the
  published version answers 404 again and the document leaves the published `/links`; the draft stays.
- **Create a document from scratch:** in the UI, a new document of `fieldsplain` in `fields/`, every field filled
  (the `asset` picker, images only, offers the two images and not `readme.txt`; the `assets` picker offers all three;
  the reference picker offers the targets), saved → the editor after a reload, the API, the CDN draft.

The tests' expectations are written separately from the server's values (a small e2e helper restating the rule), not
imported from the server.

## Calls made in writing this (check these)

- Template id and name: `CONTENTS_FIELDS`, "Contents (all fields)".
- The three files (PNG, JPEG, text) and their sizes; a text file rather than a PDF as the non-image.
- One ENUM `colour` shared by both field schemas; two block schemas, `cardplain` (title not translatable) and `card`
  (translatable), so the plain document has nothing translatable anywhere.
- Nesting with SCHEMA (one block per level), not SCHEMAS.
- Field names = the kind in lower case.
- `fieldsplain.asset` accepts images only (the file-type filter is checked through it); every other asset field
  accepts any file.

## Left to the builder

- The exact values per kind and locale (as long as they follow the rule above and are written down).
- Where the file generator and the value rule live in the spaces module.
- How the template's keyed items are declared in the template model (keeping the existing templates unchanged).
- Server tests: the template's schemas and data validate (`zSchemaExportArraySchema`, `zContentData`); creating it
  writes the expected rows and files; a failure mid-create leaves no rows and, after a sweep, no files; the output is
  stable (pinned values).

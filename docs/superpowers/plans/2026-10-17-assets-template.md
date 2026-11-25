# Test Template "Assets (large)" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A test-only space template `ASSETS_LARGE` with 1,000 generated files in one folder, folders for navigation and
a picker document, plus e2e tests of paging, sorting, the grid view and the picker at that size.

**Architecture:** Same mechanism as `CONTENTS_FIELDS` (templates in `apps/server/src/modules/spaces/templates/`, files
stored before the create transaction by `SpacesService.createFromTemplate`, rows in `SpaceTemplatesRepository.createSpace`).
Scale changes: guards, asset rows and stores go in batches; a file may declare its metadata so it isn't read back.

**Spec:** [docs/roadmap/assets-template.md](../../roadmap/assets-template.md)

## Global Constraints

- Id `ASSETS_LARGE`, name `Assets (large)`, description `1,000 files in one folder, with folders to navigate and a document to pick them into. For testing.`, icon `lucideImages`, `test: true`, no extra locales.
- Folders (root): `Bulk`, `Nested` → `Deep`, `Empty`. `Nested` and `Deep` hold one image each: `nested-image`, `deep-image` (`.png`).
- `Bulk`: `file-0001` … `file-1000`. N % 10 === 0 → `.png`, image/png, 16×16 (one generated buffer, reused), metadata `{ type: 'image', format: 'png', width: 16, height: 16 }`. Otherwise `.txt`, text/plain, exactly N bytes: `'Localess test file. '` repeated and cut to N; no metadata.
- Schema `gallery` (ROOT): `images` ASSETS displayName `Images`, `fileType: IMAGE`; `files` ASSETS displayName `Files`. Document `Gallery` (`gallery`, root, no data).
- Create time for this template under 3 s (server test). Stable output. A failed create leaves no rows and no files.
- No commits unless the user asks; commit as `alexcibotari <alexandru.cibotari@gmail.com>`, no `Co-Authored-By`. One build or test run at a time. Never prettier on `.md`.

## Review Focus

1. 1,000 guards / rows / files: no per-row round trips that make the create slow — Task 2 timing test.
2. The picker's image filter at 1,000 files: only PNGs offered, folders still shown — Task 3.
3. Name order = number order (zero padding) — Task 1 test.
4. A failure after storing 1,002 files cleans all of them — Task 2 test.
5. Paginator reaching the last page shows the right 20 — Task 3.

---

### Task 1: The template data
**Files:** `templates/space-template.model.ts` (file `metadata?`), `templates/assets-large.template.ts` (+ `.test.ts`), `templates/index.ts`, `templates/templates.test.ts`.
- [ ] Tests: ids now end `…, 'CONTENTS_FIELDS', 'ASSETS_LARGE'`; `ASSETS_LARGE`: 1,000 `Bulk` files in name order; 100 PNGs (every 10th) with the declared metadata and decodable 16×16 bytes; text file N has N bytes; `file-0001` smallest, `file-0999` largest; the gallery schema validates; output stable.
- [ ] Run → FAIL; implement; run → PASS.

### Task 2: Creating it at scale
**Files:** `shared/data-rules/storage-deletions.ts` (`guardUpload` gains a bulk form or the repository batches), `repositories/space-templates.repository.ts` (asset rows in chunks), `services/spaces.service.ts` (stores in batches of 50 in parallel; skips `metadata.extract` when the file declares metadata), `apps/server/test/app-assets-template.test.ts` (own file: exiftool).
- [ ] Tests: create `ASSETS_LARGE` → 201 under 3 s; `Bulk` lists 1,000 with types; 1,002 stored file dirs; a PNG's metadata 16×16; `orphansOf` empty. A broken copy (a content whose parent key is unknown) rejects and leaves no rows, no files after a sweep, no guards.
- [ ] Run → FAIL; implement; run → PASS; `pnpm server:test`, `pnpm server:build`.

### Task 3: E2E tests
**Files:** `apps/e2e/tests/support/assets-large.ts`, `apps/e2e/tests/assets/template-large.spec.ts`, page object helpers as needed.
- [ ] Paging (20/page, next, last page = `file-0981`…`file-1000`, size 100 → 10 pages); sorting by name both ways, size (asc first `file-0001`, desc first `file-0999`), type (images grouped); grid paging; navigation `Nested/Deep` and back; `Empty` empty state; picker: `Images` offers 100 (5 pages), `Files` 1,000, picking two images saves them (API); upload `file-0000.txt` → first by name.
- [ ] Build (`pnpm build:prod`, `pnpm server:build`), run, stress `--repeat-each 5`.

### Task 4: Docs, icon, full run
**Files:** dialog `provideIcons` (`lucideImages`), `apps/e2e/tests/api/space-templates.spec.ts` (list), `TEST-PLAN.md`, `apps/e2e/README.md`, `docs/features/admin/admin-spaces.md`, design status, `CLAUDE.md` row.
- [ ] `pnpm test`, `pnpm lint:fix`, `CI=1 pnpm e2e:run` green; final review; report.

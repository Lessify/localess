# Test Template "Contents (large)" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A test-only template `CONTENTS_LARGE` with 2,000 documents and 67 folders, plus e2e tests of the Contents page,
folder publishing, `/links`, the references picker and the Link field at that size.

**Spec:** [docs/roadmap/contents-large-template.md](../../roadmap/contents-large-template.md)

## Global Constraints

- Id `CONTENTS_LARGE`, name `Contents (large)`, description `2,000 documents in a deep folder tree. For testing.`, icon `lucideFolderTree`, `test: true`, English only.
- Schema `article` (ROOT, previewField `title`): `title` TEXT Title, `body` TEXTAREA Body, `related` REFERENCE Related, `link` LINK Link.
- Keys = full slugs. `archive` [Archive] → `doc-0001`…`doc-1000` [Doc 0001…]; `blog` [Blog] → `2022`…`2026` [same] → `01`…`12` [same] → `post-01`…`post-16` [Post YYYY-MM-NN]; root `page-01`…`page-40` [Page 01…]. Declared parents first.
- Data: `title` = name, `body` = `Body of <name>`, `related` → previous document in the same folder (none for the first), `link` → `{ kind:'LINK', type:'url', target:'_blank', uri:'https://example.com/<full slug>' }`.
- Create under 3 s (server test). Content rows inserted in chunks.
- No commits unless asked; commit as alexcibotari; one build/test run at a time; no prettier on `.md`.

## Review Focus

1. 2,067 content rows in chunks: one multi-row insert holds parents and children (FK checked at statement end) — Task 2 test.
2. `related` never points across folders or to a missing key — Task 1 test.
3. Folder publish of 192 documents completes within the test timeout — Task 3.
4. Stable output — Task 1 test.

---

### Task 1: Template data
`templates/contents-large.template.ts` (+ test), `index.ts`, `templates.test.ts`. Tests: counts (2,000 documents, 67 folders); keys unique, parents declared first; sample data (`blog/2024/06/post-03`: title `Post 2024-06-03`, related → `blog/2024/06/post-02`, link uri `https://example.com/blog/2024/06/post-03`); first of a folder has no `related`; data valid (`zContentData`); stable.

### Task 2: Creating it
`repositories/space-templates.repository.ts` (content rows in chunks), `apps/server/test/app-contents-large-template.test.ts`, list test in `app-space-templates.test.ts`. Tests: create < 3 s; counts by kind; a sample row's `references` list; draft `/links` 2,067 entries; a broken copy leaves no rows.

### Task 3: E2E
`apps/e2e/tests/support/contents-large.ts`, `apps/e2e/tests/contents/template-large.spec.ts`; page object helpers as needed (reference picker paging). Tests per spec; timings attached as test annotations.

### Task 4: Docs, icon, full run, review
Dialog icon `lucideFolderTree`; `api/space-templates.spec.ts` list; TEST-PLAN (rows + recorded timings); README; admin-spaces; design status; CLAUDE.md row. `pnpm test`, `lint:fix`, `CI=1 pnpm e2e:run`, final review.

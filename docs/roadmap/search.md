# Search for contents and assets (TODO)

> Status: to do (2026-10-18), from the PR #74 review. Related: [Contents](../features/spaces/contents.md) ·
> [Assets](../features/spaces/assets.md) · [Contents (large) template](contents-large-template.md) ("Seen while
> designing") · [Shared components: filter toolbar](../components/README.md)

Contents and Assets have no search. Their pages and the pickers (references, assets) load one folder at a time and page
and sort it in the browser; finding a document or a file means knowing its folder. The other list pages (Schemas,
Webhooks, Tokens, Locales, Tasks, Admin) filter what they already loaded, in the browser, with `ll-filter-toolbar`;
Translations has its own filter. None of that scales to thousands of documents or files in many folders.

## What exists on the server

The App API lists (`GET /api/app/spaces/:spaceId/contents`, `…/assets`) take `?name=`: a **name prefix**,
case-insensitive (`file-00` matches `file-0001` … `file-0099`). Used by the Export dialogs' autocomplete (hidden behind
the import/export flag) and by e2e tests to look up ids. It stays as it is: one field, a prefix, exact and predictable,
and it can use an index.

## Decided

- **Search is its own parameter** (`?search=` or `?q=`), not a new meaning of `?name=`: a parameter named `search`
  promises "find what I mean" (contains, several fields, maybe ranked), and callers of `?name=` rely on its exact match.

## To decide when it is designed

- **Where:** the Contents page, the Assets page, the references and assets pickers, the Link field's document list
  (today it renders every document of the space).
- **Which fields:** contents by name, slug, full slug, maybe field values (titles); assets by name, alt text, maybe type.
- **How it matches:** contains or word start; case and accents (`unaccent`); ranking (Postgres full text or trigram
  similarity, `pg_trgm`), and the index it needs.
- **Scope:** the whole space, or the open folder and below; how results show their folder (the path).
- **Paging:** search results paged on the server, unlike today's folder lists.

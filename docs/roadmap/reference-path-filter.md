# Reference field: the Path setting has no effect (TODO)

> Status: to do, found by the e2e suite (a probe while covering field settings). Related:
> [Schemas](../features/spaces/schemas.md) · [Contents](../features/spaces/contents.md) ·
> [E2E test plan](../../apps/e2e/TEST-PLAN.md) (Open findings)

A Reference or References field has a **Path** setting in the schema editor ("Path to be filtered by"). It is
validated (no spaces around) and stored on the field as `path`, but nothing reads it: the content editor's picker
offers every document of the space, whatever the Path.

## What happens today

- Schema editor: `apps/web/src/app/features/spaces/schemas/shared/edit-field/edit-field.component.html` (the Path
  input), `edit-comp.component.ts` (the `path` control, `SchemaValidator.FIELD_REFERENCE_PATH`).
- Stored: `SchemaFieldReference.path` / `SchemaFieldReferences.path` (`packages/shared/src/models/schema.model.ts`,
  `schema.zod.ts`).
- Not used: `reference-select` and `references-select` open `ReferencesSelectDialogComponent` with the space id only
  (`ReferencesSelectDialogContext` has no path); the dialog lists the folders and documents from the root. The server
  does not use it either.
- Seen: a Reference field with `path: "blog"` offers `Blog`, `About` and `Home` from the root.

## How it worked before

Until June 2024 the picker kept only the documents whose parent slug starts with the Path
(`it.parentSlug.startsWith(path)`) and said so ("Your content will be filtered by path: **blog**"). The filter was
dropped when the picker became a dialog (`99ac8b35`, "Improve Reference Sector"); the setting stayed.

## Options

1. **Filter again**: pass the Path to the dialog and offer only documents under it (full slug starts with
   `<path>/`), with the hint back. Decide whether the dialog may still browse outside it.
2. **Open in that folder**: start the dialog in the folder at that path, browsing elsewhere allowed (a convenience,
   not a rule).
3. **Remove the setting**: drop the Path input and stop storing it (existing schemas keep a harmless `path`).

Whichever is chosen: an e2e test in `apps/e2e/tests/contents/fields-relations.spec.ts` (Reference picker with a
Path), and the TEST-PLAN rows (section 8, "Reference / References Path filter", and the open finding) updated.

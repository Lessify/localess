# Test Template "Contents (all fields)" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A test-only space template `CONTENTS_FIELDS` that creates schemas with all 18 field kinds, three generated
asset files, reference targets and three prefilled draft documents in en/de/fr, plus the first e2e tests on it.

**Architecture:** The template is data in `apps/server/src/modules/spaces/templates/` extended with keyed assets and
contents. `SpacesService` stores the generated files first (upload guard → storage → metadata), then
`SpaceTemplatesRepository.createSpace` writes every row in one transaction and releases the guards; a failure deletes
the stored files. E2E tests use `test.use({ spaceTemplate: 'CONTENTS_FIELDS' })`.

**Tech Stack:** NestJS + Drizzle/Postgres, sharp, vitest (server); Playwright (e2e).

**Spec:** [docs/roadmap/contents-template.md](../../roadmap/contents-template.md)

## Global Constraints

- Template id `CONTENTS_FIELDS`, name `Contents (all fields)`, description `Every field kind in English, German and French, with files and documents to point to. For testing.`, icon `lucideFileStack`, `test: true`, locales `['de', 'fr']`.
- Nothing is published; no tokens beyond the Auto Generated Preview Token.
- Stable output: names, slugs, values, file bytes are identical on every run; only ids and timestamps differ.
- Stored as the app stores it: default locale under the bare key, other locales under `{field}_i18n_{locale}`; non-translatable fields bare only; blocks `{ _id, _schema, … }` with a fresh UUID `_id`; a document's `_id` is its content id.
- A failed create leaves no rows and no stored files.
- No commits unless the user asks; commit as `alexcibotari <alexandru.cibotari@gmail.com>`, no `Co-Authored-By`.
- Builds, server tests and e2e runs one at a time, in this checkout. Never run prettier on `.md`.

### Fixed content (the rule tests compute from)

**Assets** (folder `Media` at the root):

| Key | Name | Ext | Type | Bytes |
|---|---|---|---|---|
| `red` | `red` | `.png` | image/png | sharp 64×48, `#ff0000`, PNG |
| `blue` | `blue` | `.jpg` | image/jpeg | sharp 32×32, `#0000ff`, JPEG quality 90 |
| `readme` | `readme` | `.txt` | text/plain | `Localess test file.\n` (UTF-8) |

**Schemas:** `colour` (ENUM: `red`/Red, `green`/Green, `blue`/Blue); `cardplain` (NODE: `title` TEXT, displayName `Title`, not translatable); `card` (NODE: `title` TEXT, displayName `Title`, translatable); `fieldsplain` and `fieldsi18n` (ROOT, previewField `text`) with these 18 fields in this order — name / displayName / kind:
`text` Text TEXT · `textarea` Textarea TEXTAREA · `richtext` Rich Text RICH_TEXT · `markdown` Markdown MARKDOWN · `number` Number NUMBER · `color` Color COLOR · `date` Date DATE · `datetime` Datetime DATETIME · `boolean` Boolean BOOLEAN · `option` Option OPTION (source `colour`) · `options` Options OPTIONS (source `colour`) · `link` Link LINK · `reference` Reference REFERENCE · `references` References REFERENCES · `asset` Asset ASSET · `assets` Assets ASSETS · `block` Block SCHEMA · `blocks` Blocks SCHEMAS.
In `fieldsplain`: no field translatable; `asset` has `fileType: IMAGE`; `block`/`blocks` → `['cardplain']`. In `fieldsi18n`: the 14 kinds that allow it are `translatable: true`; `block`/`blocks` → `['card']`.
`level1`…`level5` (NODE): `title` TEXT translatable; `level1`–`level4` also `child` SCHEMA → next level. `nestedpage` (ROOT): `title` TEXT translatable, `child` SCHEMA → `level1`. `target` (ROOT): `title` TEXT translatable.

**Contents** (key · kind · name · slug · parent · schema): `targets` FOLDER Targets `targets`; `alpha`/`beta`/`gamma` DOCUMENT Alpha/Beta/Gamma `alpha`/`beta`/`gamma` in `targets`, schema `target`; `fields` FOLDER Fields `fields`; `plain` DOCUMENT `All fields (plain)` `plain` in `fields`, `fieldsplain`; `translated` DOCUMENT `All fields (translated)` `translated` in `fields`, `fieldsi18n`; `nested` DOCUMENT `Nested page` `nested` at the root, `nestedpage`.

**Values.** L ∈ en, de, fr; i = 1, 2, 3 respectively.
- Targets: `title` = `Alpha (L)` (Beta, Gamma likewise).
- Plain (bare keys only): text `Plain text` · textarea `Plain textarea` · richtext `{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Plain rich text'}]}]}` · markdown `**Plain** markdown` · number `7` · color `#336699` · date `2026-01-15` · datetime `2026-01-15T09:30` · boolean `true` · option `green` · options `['red','blue']` · link `{kind:'LINK',type:'url',target:'_blank',uri:'https://example.com/plain'}` · reference → alpha · references → alpha, beta · asset → red · assets → red, readme · block `cardplain` title `Plain block` · blocks two `cardplain`: `Plain block 1`, `Plain block 2`.
- Translated, per L: text `Text (L)` · textarea `Textarea (L)` · richtext paragraph `Rich text (L)` · markdown `**Markdown** (L)` · number `10·i` · color en `#ff0000` de `#00ff00` fr `#0000ff` · date `2026-0i-01` · datetime `2026-0i-01T12:00` · boolean en `true` de `false` fr `true` · option en `red` de `green` fr `blue` · options en `['red']` de `['red','green']` fr `['green','blue']` · link en `{type:'url',target:'_blank',uri:'https://example.com/en'}`, de → beta, fr → gamma (`{type:'content',target:'_self',uri:<id>}`) · asset en → red, de → blue, fr → blue · assets en → red, blue; de → blue; fr → readme · (not translatable) reference → alpha · references → alpha, beta · block `card` title `Block (L)` · blocks two `card`: `Block 1 (L)`, `Block 2 (L)`.
- Nested: page `title` `Nested page (L)`; level n `title` `Level n (L)`, each level's `child` the next block, level 5 has no `child`.
- Id lists per document: `assets` = asset ids used anywhere in its data (all locales), `references` = reference ids, `links` = ids of LINK values of type `content`; each sorted, without duplicates.

## Review Focus

1. **A failure after the files are stored** (bad template, database error) leaves no rows and no files — Task 2 test.
2. **Blocks' `_id` values** must be valid and unique per block (the editor addresses blocks by `_id`) — Task 1 test.
3. **The `assets`/`references`/`links` lists must match the data**, or the CDN resolves nothing and asset usage is wrong — Task 1 test (`contentRefs`) and Task 2 (`resolveAsset` on the CDN).
4. **Metadata of the generated images** (width/height) must be stored, as for an upload — Task 2 test.
5. **The create stays fast** (it runs per test): files are three and tiny; Task 2 test asserts under 3 s.

---

### Task 1: The template data

**Files:**
- Modify: `apps/server/src/modules/spaces/templates/space-template.model.ts`, `templates/index.ts`, `templates/templates.test.ts`
- Create: `apps/server/src/modules/spaces/templates/contents-fields.template.ts`, `contents-fields.template.test.ts`, `content-refs.ts`, `content-refs.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TemplateAsset { key: string; kind: 'FOLDER' | 'FILE'; name: string; parent?: string; // key of a FOLDER
    file?: { extension: string; type: string; bytes: () => Promise<Buffer> } }
  export interface TemplateContent { key: string; kind: 'FOLDER' | 'DOCUMENT'; name: string; slug: string; parent?: string;
    schema?: string; data?: (id: (key: string) => string) => Record<string, ContentValue> } // without _id/_schema
  // SpaceTemplate gains: assets?: TemplateAsset[]; contents?: TemplateContent[]
  export function contentRefs(data: ContentData): { assets: string[]; links: string[]; references: string[] }
  export const CONTENTS_FIELDS_TEMPLATE: SpaceTemplate
  ```
  (`ContentValue`/`ContentData` from `@localess/shared`; `id(key)` throws `Unknown template key: <key>` for an unknown key; block `_id`s are created inside `data` with `newUuid()`.)

- [ ] **Step 1: Tests.**
  - `templates.test.ts`: ids `['EMPTY','BLOG','ECOMMERCE','MARKETING','TRANSLATIONS_LARGE','CONTENTS_FIELDS']`; test ids `['TRANSLATIONS_LARGE','CONTENTS_FIELDS']`; the "ships schemas" check unchanged (non-test only).
  - `content-refs.test.ts`: `contentRefs` of data with an asset at top level, an ASSETS array inside a block, a REFERENCE, a REFERENCES array, a LINK `type:'content'` and a LINK `type:'url'`, values under `_i18n_de` too → `{ assets: [a1,a2] sorted, references: [...], links: [content id only] }`, duplicates removed.
  - `contents-fields.template.test.ts`:
    - `fieldsplain` and `fieldsi18n` each have the 18 kinds in the order of Global Constraints, with the displayNames; `isFieldTranslatable` is false for every `fieldsplain` field and true for the 14 allowed kinds in `fieldsi18n`; `fieldsplain.asset.fileType === 'IMAGE'`.
    - the nesting chain `nestedpage.child → level1 … level4.child → level5`, `level5` has no `child`.
    - with `id = key => \`id-${key}\``: every document's data, with `_id`/`_schema` added, passes `zContentData`; plain `number === 7`, `reference` `{kind:'REFERENCE',uri:'id-alpha'}`; translated `text === 'Text (en)'`, `text_i18n_de === 'Text (de)'`, `number_i18n_fr === 30`, `link_i18n_de` `{kind:'LINK',type:'content',target:'_self',uri:'id-beta'}`, no `reference_i18n_de`; nested level 5 reached by `child.child.child.child.child.title_i18n_de === 'Level 5 (de)'`; every block `_id` is a UUID and all are distinct.
    - `contentRefs` of the translated document = assets `[id-blue, id-readme, id-red]`, references `[id-alpha, id-beta]`, links `[id-beta, id-gamma]`.
    - the three files: `red` decodes (sharp metadata) to 64×48 png, `blue` 32×32 jpeg, `readme` bytes `Localess test file.\n`; calling `bytes()` twice gives equal buffers.
    - stable: two calls of each document's `data(id)` equal after replacing block `_id`s.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run src/modules/spaces/templates` — FAIL (modules missing).
- [ ] **Step 3: Implement** per Global Constraints; add `CONTENTS_FIELDS_TEMPLATE` last in `SPACE_TEMPLATES`. A comment above the values restates the rule. Existing templates unchanged.
- [ ] **Step 4: Run** the same — PASS.

### Task 2: Creating it (files, rows, one transaction)

**Files:**
- Modify: `apps/server/src/modules/spaces/repositories/spaces.repository.ts` (`create` takes an optional `id`), `repositories/space-templates.repository.ts`, `services/spaces.service.ts`
- Test: `apps/server/test/app-space-templates.test.ts` (new `describe('the contents template')`), reusing `orphansOf`/`storedAssetDirs` from `test/orphans.ts`

**Interfaces:**
- Consumes: Task 1 types; `guardUpload`, `releaseUploadGuards` (`shared/data-rules/storage-deletions.ts`); `STORAGE_DRIVER`; `AssetMetadataService.extract(key, type, alt)`; `originalKey(spaceId, assetId)`.
- Produces:
  - `SpacesRepository.create(name, defaultLocaleId, tx?, id?: string)`
  - `interface StoredTemplateFile { key: string; id: string; size: number; md5: string; metadata: Record<string, unknown> | null }`
  - `SpaceTemplatesRepository.guardFiles(spaceId: string, assetIds: string[]): Promise<void>`
  - `SpaceTemplatesRepository.createSpace(name, template, tx?, prepared?: { spaceId: string; files: StoredTemplateFile[] })`
  - `SpacesService.createFromTemplate(name: string, template: SpaceTemplate): Promise<Space>` (used by `create`; public for the failure test)

- [ ] **Step 1: Tests** (switch on, admin):
  - `creates the contents template: files, rows, drafts, nothing published`: 201 in under 3 s; locales en/de/fr; asset list at the root `[Media]` and in it `blue.jpg`, `readme.txt`, `red.png`; `red` metadata `{width: 64, height: 48}`; `storedAssetDirs` = the three file ids; contents: Targets, Alpha, Beta, Gamma, Fields, the two field documents, Nested page; every document `publishedAt` null; published CDN of `plain` (preview token) 404; draft `de` of `plain` `text === 'Plain text'` (same as `en`); draft `de` of `translated` `text === 'Text (de)'`, `number === 20`; draft with `resolveAsset=true` of `translated` in `en` has the red asset in its resolved assets; `orphansOf(t, spaceId)` empty.
  - `rolls back a contents template that fails after storing its files`: `createFromTemplate('Broken', { ...CONTENTS_FIELDS_TEMPLATE, contents: [...contents, { key: 'bad', kind: 'DOCUMENT', name: 'Bad', slug: 'bad', parent: 'nope' }] })` rejects (`Unknown template key: nope`); table counts unchanged (spaces, contents, assets, tokens, schemas); after `StorageSweeperService.whenIdle()` no `spaces/<id>/` files of it and no queued deletion for it.
- [ ] **Step 2: Run** `pnpm --filter @localess/server exec vitest run test/app-space-templates.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
  - `SpacesService.createFromTemplate`: no files → `createSpace(name, template)` as today. Files → `spaceId = newUuid()`, an id per file key; `guardFiles`; for each file `storage.put(originalKey, await bytes())`, `metadata.extract(key, type, null)`; then `createSpace(name, template, undefined, { spaceId, files })`. On any error: `storage.deletePrefix(\`spaces/${spaceId}/\`)`, then release the guards (as `AssetsService.upload` does), rethrow.
  - `createSpace` inside its transaction: `spaces.create(name, en, t, prepared?.spaceId)`; locales; schemas; asset folders then files (`kind`, `name`, `parentId` by key, `extension`, `type`, `size`, `md5`, `metadata`, `alt: null`, `source: null`), `releaseUploadGuards(t, spaceId, fileIds)`; contents in declaration order with `id(key)` resolving content and asset keys, `data = { _id, _schema, ...data(id) }`, and `contentRefs(data)` for the three lists; translations as today.
- [ ] **Step 4: Run** the file, then `pnpm server:test` — PASS; `pnpm server:build` OK.

### Task 3: E2E tests on the template

**Files:**
- Create: `apps/e2e/tests/support/contents-fields.ts`, `apps/e2e/tests/contents/template-fields.spec.ts`
- Modify (only if a step needs a missing helper): `apps/e2e/tests/pages/contents.page.ts`

**Interfaces:**
- Consumes: `spaceTemplate` fixture option; `ContentsPage` (`editorLocale`, `field`, `blockField`, `chooseOption`, `pickDocuments`, `pickAssets`, `save`, `publish`, `unpublishRow`); `Cdn` (`support/contents.ts`).
- Produces (`support/contents-fields.ts`, written from the rule, not imported from the server): `FIELDS = { template: 'CONTENTS_FIELDS', locales: ['en','de','fr'], kinds: [...18 displayNames], plain: {...expected bare values}, translated(locale) }`.

- [ ] **Step 1: Write the spec** (`test.use({ spaceTemplate: 'CONTENTS_FIELDS' })`), each test pre-check → UI action → post-check:
  - `a new space: every document's draft follows the rule, nothing is published` — for each locale, draft of `plain` equals `FIELDS.plain` values (text, number, color, date, boolean, option, options; reference uri = Alpha's id) and of `translated` equals `FIELDS.translated(locale)`; published 404 for both.
  - `plain fields are read-only in German and French, editable in English` — open "All fields (plain)"; in English `Text` is editable; switch to German: `Text`, `Number`, `Date`, `Boolean`, `Option` and the block title (open `Block`) are disabled/locked; same in French.
  - `a German change stays in German` — "All fields (translated)" in German: set `Text` to `Geändert`, `Number` to `99`, Option `Blue`; save; reload shows them; API: `text_i18n_de`, `number_i18n_de`, `option_i18n_de` changed, `text` and `text_i18n_fr` unchanged; draft `de` changed, `en`/`fr` unchanged.
  - `edits the fifth nested level` — "Nested page" in German: open `Child` four times to level 5, set its `Title` to `Ebene 5`, save; API data at `child.child.child.child.child.title_i18n_de`; draft `de` path has it; `en` keeps `Level 5 (en)`.
  - `publish, then unpublish` — publish "All fields (translated)" (editor Publish) → published equals draft in every locale and it is in published `/links`; unpublish from the list → published 404, gone from published `/links`, draft still 200.
  - `creates a document with every field filled` — in `Fields`, add document `Fresh` (`fresh`, schema `fieldsplain`), fill all 18 fields (asset picker for `Asset` lists `red.png` and `blue.jpg`, not `readme.txt`; `Assets` picker lists all three; reference picker lists Alpha/Beta/Gamma), save → after reload the editor shows the values; API `data` has all 18 keys; draft `en` has them.
- [ ] **Step 2: Run** `pnpm build:prod && pnpm server:build`, then `pnpm --filter @localess/e2e exec playwright test tests/contents/template-fields.spec.ts --project=ui` — fix test code (not assertions) until green; a failure that is an app bug follows the e2e skill (confirm, then ask).
- [ ] **Step 3: Stress** `--repeat-each 5` — all green; e2e `tsc` and `prettier --check` clean.

### Task 4: Docs and the full run

**Files:** `apps/web/src/app/features/admin/spaces/space-create-dialog/space-create-dialog.component.ts` (register `lucideFileStack` in `provideIcons`, so the dialog shows the template's icon), `apps/e2e/TEST-PLAN.md`, `apps/e2e/README.md` (prepared spaces paragraph), `docs/features/admin/admin-spaces.md` (template table row), `docs/roadmap/contents-template.md` (status → built), `CLAUDE.md` (the space-templates row mentions the contents template)

- [ ] **Step 1:** Update the docs (TEST-PLAN rows ✅ per Task 3 test, under section 8 "With the prepared space").
- [ ] **Step 2:** `CI=1 pnpm e2e:run` in the background — all green, no flakes; `pnpm test`, `pnpm lint:fix` clean.
- [ ] **Step 3:** Report and ask before committing.

# Admin — Spaces Module

> Parent: [Admin Overview](overview.md) · Related: [Concepts — Space](../../concepts.md)

## Purpose

Platform-level management of Spaces — create new spaces, edit space names, delete spaces, and copy space IDs for use in API integrations.

## Route

```
/features/admin/spaces            [SPACE_MANAGEMENT permission]
```

## Key Files

```
apps/web/src/app/features/admin/spaces/
  spaces.component.ts/html/scss      ← space list, and the whole create flow
  space-create-dialog/               ← the form: name + template choice; each template's title, description, icon (space-templates.ts)
  space-edit-dialog/                 ← rename
```

## SpacesComponent

Displays one page of spaces (`ll-table`, `ll-paginator`), paged, sorted and searched on the server: `GET /api/app/spaces` answers a `Page<Space>` (`?page=&size=&sort=&direction=`, `?search=` on the name or any part of the id, `?importing=false` to leave out spaces being imported; sorts: `name` (default, case-insensitive), `id`, `updatedAt`; ties by id), each item with its `firebaseImport` when it has one. `SPACE_MANAGEMENT` only, as the page: the import carries who ran it and from where; every other user reads the sidebar list (`GET /api/app/spaces/names`, any role). A `PagedList` (`core/utils/paged-list.ts`) holds the query.

**Injected services:** `SpaceService`, `HlmDialogService`, `NotificationService`, `Injector`

**Key behaviour:**
- `loadData()` — fetches all spaces via `SpaceService`
- `onFilterChange(value: FilterToolbarValue)` — sends the toolbar's search to the server, from the first page; `onSortChange()` sends the sorted column and direction
- `openEditDialog(space)` — opens `SpaceEditDialogComponent`
- `openDeleteDialog(space)` — confirmation dialog then deletes space and all its content
- `copied()` — shows snackbar when space ID is copied to clipboard

- `openAddDialog()` — opens the create dialog; see [Creating a space](#creating-a-space)

## Importing a space from Firebase

**Import from Firebase** (`firebase-import-dialog/`) connects to a running Firebase-era environment with its URL and
migration token (generated there under Admin → Settings → Migration), lists its spaces (already imported ones are
disabled, "Imported as …"), and imports the one picked into a new space. The dialog then polls the run every 2 s
(`FirebaseImportService.poll`) and shows each stage — space, locales, environments, tokens, webhooks (imported
disabled), translations, schemas, assets, contents, content migration — with its count, warnings and, on failure,
the error (`firebase-import-progress/`). **Imports** (`firebase-imports-dialog/`) lists past runs. A space being
imported or whose import failed shows a badge, is left out of `SpaceStore` (so it cannot be opened), and a failed one
can be deleted to import again. The table reads both from each space's `firebaseImport` (the list loads that
relation): the badge from its `status` (`RUNNING` "Importing", `FAILED` "Import failed"), and, after the name,
"Imported from Firebase: `<sourceSpaceId>`" (the Firestore id; Space Settings no longer shows it). Server side: `apps/server/src/modules/firebase-import/`; design:
[firebase-space-import.md](../../roadmap/firebase-space-import.md).

## Creating a space

**`/features/admin/spaces?action=create` opens the create dialog**, so a page that is not the spaces
list can send a user into it with a link rather than code:

| Where | How | When |
|-------|-----|------|
| Admin → Spaces, the "Add Space" button | `openAddDialog()` directly | always |
| The shell sidebar | link to `?action=create` | `hasNoSpaces()` and `SPACE_MANAGEMENT` |
| The welcome page | link to `?action=create` | `hasNoSpaces()` and `SPACE_MANAGEMENT` |

The in-page button calls the method — it is already on this component, so a navigation would be
ceremony. The param exists for the two entry points that are not.

No new route was added: `admin/spaces` already exists and is already guarded by
`permissionGuard(UserPermission.SPACE_MANAGEMENT)` (`features-routing.module.ts`). That guard is what keeps the flow
honest — the server requires `ADMIN` or `SPACE_MANAGEMENT` to write a space (`@RequirePermission` on
`POST /api/app/spaces`), so an
unpermitted user must not reach the dialog at all. The CTAs carry the same check so they don't link
somewhere the guard will bounce.

Earlier versions had each CTA open the dialog itself. Two of them collected a filled-in form and
discarded the result: the button appeared to work and created nothing. With the URL as the trigger,
a CTA is a link — there is no result for a caller to forget.

### How the param reaches the component

```ts
readonly action = input<string>();                          // bound from ?action=create
currentAction = linkedSignal(() => this.action());          // local, so closing can release it

constructor() {
  effect(() => {
    if (this.currentAction() === CREATE_ACTION) this.openAddDialog();
  });
}
```

`withComponentInputBinding()` is enabled at the root (`app.config.ts`), the same mechanism as
`spaceId = input.required<string>()` in the space features — no `ActivatedRoute` subscription to
own, and nothing to unsubscribe.

Reading the param **once** in `ngOnInit` would not work. Angular's default `shouldReuseRoute`
compares `routeConfig`, so a navigation that changes only query params **reuses the component and
never re-runs `ngOnInit`**. The sidebar CTA links to this very route and is visible while the user
has no spaces — including while they are standing on the empty spaces list. Reading once would make
that button silently do nothing. The router's binder re-sets every declared input on every
navigation (`RoutedComponentInputBinder`), so the input keeps up where a one-shot read would not.

**Why `linkedSignal` and not the input directly.** The effect holds the dialog open for as long as
its condition is true, so something has to say "handled". `linkedSignal` seeds from the input but
stays writable: `clearAction()` sets it to `undefined` when the dialog closes. A plain `input()` is
read-only, which would have forced a URL rewrite purely to reset component state.

That choice keeps the whole flow read-only with respect to the URL. Nothing here navigates, so none
of the hazards of writing back arise — no fighting a Back press mid-close, and no need to tell a
dismissal apart from the CDK disposing the overlay on popstate. Both simply close the dialog, and
`tap(() => this.clearAction())` runs either way.

Signal equality doubles as a re-entrancy guard: re-binding the same `'create'` does not re-run the
effect, so the dialog cannot stack.

**Consequence:** `?action=create` stays in the URL after the dialog closes. Reloading that URL
reopens the dialog, which is what a deep link should do. Navigating away and back re-arms it
normally, because the input passes through `undefined` on the way.

### After creation

No manual refresh. `SpaceService.findPage()` (the admin table, `GET /api/app/spaces`) and `findAllNames()`
(`SpaceStore`, `GET /api/app/spaces/names`) are `liveQuery`s, so the `spaces` change event the create emits over SSE
makes them refetch, and the new space reaches the admin table and `SpaceStore` — and since the store selects the first when
nothing is selected, a user's first space also becomes their current one, filling the sidebar behind
the dialog. The user stays on the spaces list.

## Dialogs

### SpaceCreateDialogComponent
Space `name` plus a [template](#space-templates) choice. Returns `{ name, template? }` (no `template` for
Empty), or `undefined` when dismissed.

### SpaceEditDialogComponent
Space `name` only. Returns `{ name }`.

Both validate with `SpaceValidator`. They are separate components on purpose: a template applies
only to a new space, and a shared component would have put a `template` control in the form group
for the edit case too — which `openEditDialog` pipes straight into `SpaceService.update()`. Two
components make "no template when editing" structurally true rather than a condition that could be
inverted.

## Services Used

| Service | Purpose |
|---------|---------|
| `SpaceService` | Fetch (live), create (with a template), update, delete spaces via `/api/app/spaces`; the templates offered (`GET /api/app/spaces/templates`) |
| `NotificationService` | Snackbar feedback |

> **Warning:** Deleting a space is irreversible and removes all content, translations, schemas, assets, and tokens under it. The `spaces` row delete cascades to every child table, and the server then deletes the space's storage prefix (`spaces/{spaceId}/` under `$LOCALESS_STORAGE_DIR`).

## Space templates

Creating a space offers a template. The ids are one union in `@localess/shared` (`SPACE_TEMPLATE_IDS`,
`SpaceTemplateId`). What a template creates lives on the server (`apps/server/src/modules/spaces/templates/`);
its title, description and icon live in the dialog (`space-create-dialog/space-templates.ts`, a
`Record<SpaceTemplateId, …>`, so a new id does not compile without them). The server lists the ids the user may
choose (`GET /api/app/spaces/templates` → `SpaceTemplateId[]`), and the dialog sends the chosen one with the create
request (`POST /api/app/spaces` `{ name, template? }`; an id outside the union is a 400 from validation). The server writes the space and everything the template holds **in one transaction**
(`SpaceTemplateRepository`): the space is complete or not created at all. Design:
[docs/roadmap/space-templates.md](../../roadmap/space-templates.md).

| Template | Writes |
|----------|--------|
| **Empty** (no `template`) | nothing — the space alone: its default locale and preview token |
| **Blog** | schemas `author`, `category`, `blogtag` (ENUM), `blogpost` |
| **E-Commerce** | schemas `size` (ENUM), `variant` (NODE), `category`, `product` |
| **Marketing Site** | schemas `cta`, `hero`, `feature`, `featuregrid`, `testimonial` (all NODE), `page` |
| **Translations (large)** — test only | locales German and French; 10,000 generated translations (nothing published) |
| **Contents (large)** — test only | 2,000 documents and 67 folders: `Archive` (1,000), `Blog/<year>/<month>` (16 posts each), 40 pages at the root; English only — [design](../../roadmap/contents-large-template.md) |
| **Assets (large)** — test only | 1,000 generated files in `Bulk` (every 10th a PNG, text file N is N bytes), `Nested/Deep`, `Empty`, a `Gallery` document for the picker — [design](../../roadmap/assets-template.md) |
| **Contents (all fields)** — test only | locales German and French; schemas with all 18 field kinds (translatable and not, 5 nested levels); three generated files in `Media`; reference targets and three prefilled documents (nothing published) — [design](../../roadmap/contents-template.md) |

Blog and E-Commerce are both lists of records that reference each other. **Marketing Site is a
composed page**: `page.sections` is a single `SCHEMAS` field accepting *several* node types, so an
editor assembles a page from interchangeable blocks rather than filling a fixed form. `hero.action`
shows the other half of the pair — `SCHEMA`, one nested node rather than many.

**Empty is not a template**: it is the dialog's first card, selected by default, and sends no `template`; the
server then creates the space alone. No template publishes anything or creates tokens (every space gets its Auto Generated
Preview Token).

Schemas are typed as `SpaceTemplateSchema[]` (the export format) so the compiler validates every field
shape; `templates.test.ts` checks what types cannot: that cross-references resolve —
`SCHEMA`/`SCHEMAS` targets, `OPTION`/`OPTIONS` enum sources — and the id rules the import path
enforces.

### Test templates

A template marked `test` (today **Translations (large)**, `translations_large`, **Contents (all fields)**, `contents_fields`, **Assets (large)**, `assets_large`, and **Contents (large)**, `contents_large`) is listed and accepted only
when the server runs with `LOCALESS_TEST_TEMPLATES=true`: `pnpm dev` (`apps/server/dev.env`) and the e2e
server set it; production never does unless someone sets it on purpose. Otherwise it is absent from the list
and a create request naming it gets 400. Its data is generated by a fixed rule (no randomness, no clock), so
e2e tests know what to expect: see `translations-large.template.ts`.

### Permissions

Creating a space needs `SPACE_MANAGEMENT`, and so does choosing a template: a template is part of creating the
space, so it asks for nothing more, even though it writes schemas, documents, files or translations. Both routes
(`GET /api/app/spaces/templates`, `POST /api/app/spaces`) refuse anyone else (403). Permissions are to be reworked
separately.

### Failure

Everything is one transaction: an unknown template (or a test one while they are off) is a 400, and a failure while writing the template
leaves no space behind. The dialog's success toast means the space and its template are both there.

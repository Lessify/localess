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
src/app/features/admin/spaces/
  spaces.component.ts/html/scss      ← space list, and the whole create flow
  space-create-dialog/               ← the form: name + template choice
  space-edit-dialog/                 ← rename
  templates/                         ← Empty / Blog / E-Commerce / Marketing schema sets
```

## SpacesComponent

Displays a paginated `ll-table` (`LlTableImports`) of all spaces in the platform, with a `LlFilterToolbarImports` search toolbar.

**Injected services:** `SpaceService`, `SpaceTemplateService`, `MatDialog`, `NotificationService`, `Router`, `ActivatedRoute`

**Key behaviour:**
- `loadData()` — fetches all spaces via `SpaceService`
- `onFilterChange(value: FilterToolbarValue)` — updates the table filter from the toolbar; the predicate is built in `ngOnInit()` via `FilterPredicateUtils.create()`, searching across space `id` and `name`
- `openEditDialog(space)` — opens `SpaceEditDialogComponent`
- `openDeleteDialog(space)` — confirmation dialog then deletes space and all its content
- `copied()` — shows snackbar when space ID is copied to clipboard

- `openAddDialog()` — opens the create dialog; see [Creating a space](#creating-a-space)

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
`hasPermissionSpaceManagement` (`features-routing.module.ts`). That guard is what keeps the flow
honest — `firestore.rules` requires `admin` or `SPACE_MANAGEMENT` to write a space, so an
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

No manual refresh. `SpaceService.findAll()` is `collectionData`, so the new space reaches the admin
table and `SpaceStore` through the live snapshot — and since the store selects `response[0]` when
nothing is selected, a user's first space also becomes their current one, filling the sidebar behind
the dialog. The user stays on the spaces list.

## Dialogs

### SpaceCreateDialogComponent
Space `name` plus a [template](#space-templates) choice. Returns `{ name, template }`, or
`undefined` when dismissed.

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
| `SpaceService` | Fetch, create, update, delete spaces |
| `SpaceTemplateService` | Batch-write a template's schemas into a newly created space |
| `NotificationService` | Snackbar feedback |

> **Warning:** Deleting a space is irreversible and removes all content, translations, schemas, assets, and tokens under it.

## Space templates

Creating a space offers a template, which seeds a set of schemas:

| Template | Schemas |
|----------|---------|
| **Empty** | none — a blank space |
| **Blog** | `author`, `category`, `blogtag` (ENUM), `blogpost` |
| **E-Commerce** | `size` (ENUM), `variant` (NODE), `category`, `product` |
| **Marketing Site** | `cta`, `hero`, `feature`, `featuregrid`, `testimonial` (all NODE), `page` |

Blog and E-Commerce are both lists of records that reference each other. **Marketing Site is a
composed page**: `page.sections` is a single `SCHEMAS` field accepting *several* node types, so an
editor assembles a page from interchangeable blocks rather than filling a fixed form. `hero.action`
shows the other half of the pair — `SCHEMA`, one nested node rather than many.

**Empty is selected by default and writes nothing**, so creating a space is unchanged unless you
choose otherwise.

Templates seed **schemas only**. Seeding example content is deferred until the schema sets settle —
a content payload is shaped by the schema it references, so authoring it earlier would mean
rewriting it on every revision.

Definitions live in `src/app/features/admin/spaces/templates/`, typed as `SpaceTemplateSchema[]` so
the compiler validates every field shape. Note this is **not** `SchemaCreate`: that type is
`Omit<Schema, …>` over a union, and `Omit` is not distributive — it collapses `SchemaComponent |
SchemaEnum` into their shared keys, dropping `fields`, `values` and `previewField` along with the
discriminated union that makes field shapes checkable.

`templates.spec.ts` additionally checks what types cannot: that cross-references resolve —
`SCHEMA`/`SCHEMAS` targets, `OPTION`/`OPTIONS` enum sources — and the id rules the import path
enforces.

### Permissions

The template choice appears only when **creating** a space, and only for users who may create
schemas — role `admin`, or `custom` with `SCHEMA_CREATE`. The browser performs the writes, so
`firestore.rules` would reject them otherwise. A user without it sees no template control and
creates empty spaces normally.

### Failure

A template is applied in one atomic batch, after the space document is created. If that batch
fails, the space still exists and is usable, and the notification says so rather than reporting a
failed creation. There is no rollback — deleting a space the user just watched appear would be
worse than leaving an empty one.

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
  spaces.component.ts/html/scss      ← space list
  space-create-dialog/               ← create, with template choice
  space-edit-dialog/                 ← rename
  templates/                         ← Empty / Blog / E-Commerce schema sets
```

## SpacesComponent

Displays a paginated `ll-table` (`LlTableImports`) of all spaces in the platform, with a `LlFilterToolbarImports` search toolbar.

**Injected services:** `SpaceService`, `MatDialog`, `NotificationService`

**Key behaviour:**
- `loadData()` — fetches all spaces via `SpaceService`
- `onFilterChange(value: FilterToolbarValue)` (`spaces.component.ts:79-81`) — updates the table filter from the toolbar; the predicate is built in `ngOnInit()` via `FilterPredicateUtils.create()` (`spaces.component.ts:11,68-70`), searching across space `id` and `name`
- `openAddDialog()` — opens `SpaceCreateDialogComponent`, then applies the chosen template
- `openEditDialog(space)` — opens `SpaceEditDialogComponent`
- `openDeleteDialog(space)` — confirmation dialog then deletes space and all its content
- `copied()` — shows snackbar when space ID is copied to clipboard

## Dialogs

### SpaceCreateDialogComponent
Space `name` plus a [template](#space-templates) choice. Returns `{ name, template }`.

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

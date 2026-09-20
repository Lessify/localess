# `ll-table` — Material-free table stack

> Related: [Components index](README.md) · [Paginator](paginator.md) · [Filter Toolbar](filter-toolbar.md) · [Spartan UI Migration](../spartan-ui-migration.md) · [Frontend Architecture](../frontend-architecture.md)

## Overview

A from-scratch, Material-free table stack in `src/app/shared/components/table/`, paired with
[`ll-paginator`](paginator.md). It mirrors the CDK/Material APIs (`MatTable`, `MatTableDataSource`,
`MatSort`) closely enough that migrating a `mat-table` is mostly find-and-replace, but is built on
signals throughout — no `BehaviorSubject`/`Subject` plumbing.

It lives in `src/app/shared/components/` rather than `libs/ui` because that directory is the vendored
Spartan Helm layer (`components.json` `componentsPath`); `ll-table` is project-owned and composes
`Hlm*` directives rather than being one of them.

**The `MatTable` migration is complete.** `LlTableImports`/`ll-table` is used by 13 components —
`locales`, `tokens`, `contents`, `references-select-dialog`, `assets-select-dialog`, `tasks`,
`task-detail`, `schemas`, `assets`, `webhooks`, `webhook-detail`, `admin/spaces` and `admin/users`.
A full-codebase search finds zero remaining `mat-table` or `mat-paginator` usages under `src/app/`.

## Usage

```typescript
imports: [LlTableImports, LlPaginatorImports, /* ... */],
```

```typescript
readonly sort = viewChild.required(TableSort);
readonly paginator = viewChild.required(Paginator);

private readonly injector = inject(Injector);
private readonly items = signal<Task[]>([]);
readonly dataSource = new TableDataSource<Task>(this.items, this.injector);

ngAfterViewInit(): void {
  this.dataSource.sort = this.sort();
  this.dataSource.paginator = this.paginator();
}
```

```html
<div llTableContainer>
  <table ll-table [dataSource]="dataSource" llTableSort>
    <ng-container llColumnDef="id">
      <th llHeaderCell *llHeaderCellDef llTableSortHeader="id">ID</th>
      <td llCell *llCellDef="let element">{{ element.id }}</td>
    </ng-container>
    <tr ll-header-row *llHeaderRowDef="displayedColumns; sticky: true"></tr>
    <tr ll-row *llRowDef="let row; columns: displayedColumns"></tr>
    <tr *llNoDataRow>
      <td [attr.colspan]="displayedColumns.length">No data yet.</td>
    </tr>
  </table>
</div>
<ll-paginator [sticky]="true" [length]="dataSource.filteredData().length" />
```

## API

Directive and selector names are the `mat*` names with `ll` swapped in. Everything is exported from
the `table.imports.ts` barrel as `LlTableImports`.

| Material | `ll-table` equivalent | Notes |
|---|---|---|
| `MatTableModule` (`mat-table`, `matColumnDef`, `matHeaderCellDef`, …) | `LlTableImports` (`ll-table`, `llColumnDef`, `llHeaderCellDef`, …) | Also `llCellDef`, `llHeaderRowDef`, `llRowDef`, `llFooterCellDef`, `llNoDataRow`. |
| — | `llColumnDefClass` | No Material equivalent. Applies a class to the header/data/footer cell of that column in one place. |
| `MatTableDataSource` | `TableDataSource<T>` (`table-data-source.ts`) | Takes a `Signal<T[]>` (or plain array) plus an `Injector` (`inject(Injector)` in the component). Exposes `filteredData` / `sortedData` / `renderedData` signals instead of subjects. |
| `MatSort` / `matSort` | `TableSort` / `llTableSort` (`table-sort.directive.ts`) | `active` / `direction` are `model()` signals instead of `@Input`/`@Output` pairs. |
| `mat-sort-header` | `llTableSortHeader` | Same click/keyboard behaviour and arrow indicator, no Material dependency. |
| `MatPaginator` | `Paginator` / `ll-paginator` | See [Paginator](paginator.md). |

## Behaviour

- **Sorting and filtering are signal-derived.** `TableDataSource` recomputes `filteredData` →
  `sortedData` → `renderedData` as signals, so a change to the source array, the sort, or the filter
  propagates without any manual subscription.
- **Filtering** is driven by `dataSource.filter`; see [Filter Toolbar](filter-toolbar.md) for the
  standard way to produce that value and a matching predicate.
- **Pagination** is wired by assigning `dataSource.paginator` in `ngAfterViewInit`, exactly as with
  Material.

## Working on this component

### Declare shared column classes once, via `llColumnDefClass`

Put a shared class on `llColumnDef` rather than repeating it on both `<th>` and `<td>` (and `<tfoot>`
if the column has a footer cell). `LlColumnDef` folds it into CDK's own `_columnCssClassName` array,
which `BaseCdkCell` already applies to whichever cell it constructs — the same mechanism behind the
existing `ll-column-<name>` classes:

```html
<!-- ❌ Before — repeated on every cell -->
<ng-container llColumnDef="id">
  <th llHeaderCell *llHeaderCellDef class="hidden @5xl/table:table-cell">ID</th>
  <td llCell *llCellDef="let element" class="hidden @5xl/table:table-cell">{{ element.id }}</td>
</ng-container>

<!-- ✅ After — declared once on the column -->
<ng-container llColumnDef="id" llColumnDefClass="hidden @5xl/table:table-cell">
  <th llHeaderCell *llHeaderCellDef>ID</th>
  <td llCell *llCellDef="let element">{{ element.id }}</td>
</ng-container>
```

### Responsive columns use `@container`, not media queries

`div[llTableContainer]` carries `@container/table` (a named container-query root), so a column can
hide on narrow layouts by reacting to the *table's* width rather than the window's. Combine it with
`llColumnDefClass` as above.

### Sticky header/paginator depends on a height-bounded scroll ancestor

Both `*llHeaderRowDef="…; sticky: true"` and `<ll-paginator [sticky]="true">` are plain CSS
`position: sticky`, which only works against the **nearest ancestor that is an actual,
height-bounded scroll container**.

`div[llTableContainer]` deliberately does *not* set `overflow-auto` on itself — it only sets
`@container/table`. With no bounded height of its own, an `overflow-auto` there would still register
as a CSS scroll container and silently swallow the sticky calculation without ever scrolling.

The real scrolling ancestor for every feature page is `<main hlmSidebarInset>` in
`src/app/features/features.component.html`, which must carry both a **definite height** (`h-svh`)
*and* `overflow-auto`. `min-h-svh` on the sidebar wrapper is only a floor, not a fixed height, so
`main` needs its own explicit height for `overflow-auto` to bound and scroll its content. **If sticky
rows or paginators stop sticking anywhere in the app, check that pair of classes on `main` first**,
before touching individual table pages.

For a `<ll-paginator>` inside a dialog, see
[Spartan UI Migration → Sticky Paginator in Dialogs](../spartan-ui-migration.md#sticky-paginator-in-dialogs)
— same `sticky` input, different scrollable ancestor (`mat-dialog-content`).

## Reference consumer

`src/app/features/spaces/tasks/tasks.component.*` — the first component migrated off `MatTable`, and
still the clearest end-to-end example: sorting, pagination, a responsive `id` column, and clickable
rows that navigate to a detail page.

# `MatTable` → `ll-table` Migration Guide

> Related: [Spartan UI Migration](spartan-ui-migration.md) · [Frontend Architecture](frontend-architecture.md)

A from-scratch, Material-free table stack lives in `src/app/shared/components/table/` and `src/app/shared/components/paginator/`. It mirrors the CDK Material APIs (`MatTable`, `MatTableDataSource`, `MatSort`, `MatPaginator`) closely enough that migrating a `mat-table` is mostly a find-and-replace, but is built on signals throughout (no `BehaviorSubject`/`Subject` plumbing).

**First migrated consumer:** `src/app/features/spaces/tasks/tasks.component.*` — use it as the reference implementation.

---

## Building blocks

| Material | `ll-table` equivalent | Notes |
|---|---|---|
| `MatTableModule` (`mat-table`, `matColumnDef`, `matHeaderCellDef`, ...) | `LlTableImports` (`ll-table`, `llColumnDef`, `llHeaderCellDef`, ...) | `table.imports.ts` barrel — directive/selector names are the `mat*` names with `ll` swapped in (`llCellDef`, `llHeaderRowDef`, `llRowDef`, `llFooterCellDef`, etc.). `llColumnDef` also takes `llColumnDefClass` — no Material equivalent — to apply a class to the header/data/footer cell for that column in one place instead of repeating it on each `<th>`/`<td>`. |
| `MatTableDataSource` | `TableDataSource<T>` (`table-data-source.ts`) | Takes a `Signal<T[]>` (or plain array) + an `Injector` (`inject(Injector)` in the component). Exposes `filteredData` / `sortedData` / `renderedData` signals instead of subjects. |
| `MatSort` / `matSort` | `TableSort` / `llTableSort` (`table-sort.directive.ts`) | `active`/`direction` are `model()` signals instead of `@Input`/`@Output` pairs. |
| `mat-sort-header` | `llTableSortHeader` | Same click/keyboard behavior and arrow indicator, no Material dependency. |
| `MatPaginator` | `Paginator` / `ll-paginator` (`paginator.component.ts`) | `LlPaginatorImports`. Same `pageIndex`/`pageSize` (as `model()` signals), `page` output, `sticky` input (see below). |

---

## Wiring it up (mirrors `TasksComponent`)

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

---

## Column classes — `llColumnDefClass`

Put a shared class on `llColumnDef` via `llColumnDefClass` rather than repeating it on both `<th>` and `<td>` (and `<tfoot>` if the column has a footer cell). `LlColumnDef` folds it into CDK's own `_columnCssClassName` array, which `BaseCdkCell` already applies to whichever cell (header, data, or footer) it constructs — the same mechanism behind the existing `ll-column-<name>` classes:

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

## Responsive columns via `@container`

`div[llTableContainer]` carries `@container/table` (a named container-query root), so individual columns can hide on narrow viewports without a media query — this reacts to the table's own width, not the window's. Combine with `llColumnDefClass` above:

```html
<ng-container llColumnDef="id" llColumnDefClass="hidden @5xl/table:table-cell">
  <th llHeaderCell *llHeaderCellDef>ID</th>
  <td llCell *llCellDef="let element">{{ element.id }}</td>
</ng-container>
```

---

## Sticky header row / paginator — the scroll-ancestor gotcha

Both `*llHeaderRowDef="...; sticky: true"` and `<ll-paginator [sticky]="true">` are plain CSS `position: sticky`, which only works against the **nearest ancestor that is an actual, height-bounded scroll container**. `div[llTableContainer]` intentionally does *not* set `overflow-auto` on itself (it only sets `@container/table` for the responsive columns above) — with no bounded height of its own, an `overflow-auto` there would still register as a CSS scroll container and silently swallow the sticky calculation without ever actually scrolling.

The real scrolling ancestor for every feature page is `<main hlmSidebarInset>` in `src/app/features/features.component.html`, which must carry both a **definite height** (`h-svh`) and `overflow-auto` — `min-h-svh` on the sidebar wrapper is only a floor, not a fixed height, so `main` needs its own explicit height for its `overflow-auto` to actually bound and scroll its content. If sticky rows/paginator stop sticking anywhere in the app, check this pair of classes on `main` first before touching individual table pages.

For a `<ll-paginator>` used inside a dialog instead of a full page, see [Spartan UI Migration → Sticky Paginator in Dialogs](spartan-ui-migration.md#sticky-paginator-in-dialogs) — same `sticky` input, different scrollable ancestor (`mat-dialog-content`).

# `ll-paginator` — Material-free paginator

> Related: [Components index](README.md) · [Table](table.md) · [Spartan UI Migration](../spartan-ui-migration.md)

## Overview

`src/app/shared/components/paginator/` — a signal-based replacement for `MatPaginator`, built from
Spartan Helm primitives (`HlmButton`, `HlmSelect`, `HlmIcon`, `HlmTooltip`). It deliberately mirrors
`MatPaginator`'s public surface and its subtler behaviours, so migrating a page was find-and-replace
and so existing expectations still hold.

Usually paired with [`ll-table`](table.md), but it has no dependency on it — it only needs a
`length`.

## Usage

```typescript
imports: [LlPaginatorImports],
```

```html
<ll-paginator [sticky]="true" [length]="dataSource.filteredData().length" />
```

Wired to a table's data source in `ngAfterViewInit` (see [Table](table.md)):

```typescript
readonly paginator = viewChild.required(Paginator);

ngAfterViewInit(): void {
  this.dataSource.paginator = this.paginator();
}
```

## API

### `Paginator` — `<ll-paginator>`

| Member | Type | Default | Notes |
|---|---|---|---|
| `length` | `input.required<number>` | — | Total number of items. |
| `pageSizeOptions` | `input<number[]>` | `[10, 25, 50]` | Choices in the page-size picker. |
| `hidePageSize` | `input<boolean>` | `false` | Hides the "Rows per page" picker. |
| `showFirstLastButtons` | `input<boolean>` | `false` | Shows first/last jump buttons. |
| `disabled` | `input<boolean>` | `false` | Ignores navigation and page-size changes. |
| `sticky` | `input<boolean>` | `false` | Adds `ll-paginator-sticky` (see gotcha below). |
| `pageIndex` | `model<number>` | `0` | Two-way. |
| `pageSize` | `model<number>` | `10` | Two-way. |
| `page` | `output<PageEvent>` | — | Emitted on any *effective* change. |

Read-only signals: `pageCount`, `isFirstPage`, `isLastPage`.
Methods: `firstPage()`, `previousPage()`, `nextPage()`, `lastPage()`, `onPageSizeChange(size)`.

### `PageEvent`

```typescript
interface PageEvent {
  pageIndex: number;
  previousPageIndex?: number;
  pageSize: number;
  length: number;
}
```

### Defaults via DI

```typescript
{ provide: PAGINATOR_DEFAULT_OPTIONS, useValue: { pageSize: 25, pageSizeOptions: [25, 50] } }
```

`PaginatorDefaultOptions` accepts `pageSize`, `pageSizeOptions`, `hidePageSize` and
`showFirstLastButtons` — mirroring `MAT_PAGINATOR_DEFAULT_OPTIONS`. Inputs still win over the token.

## Behaviour

These are the `MatPaginator` behaviours it reproduces on purpose. Each is covered by a test in
`paginator.component.spec.ts`; change one and a test should fail.

- **Changing page size preserves the first visible item.** At `pageSize` 10 on page 2 (items 20–29),
  switching to `pageSize` 5 lands on page 4 — not page 0. Mirrors `MatPaginator._changePageSize`.
- **`pageIndex` auto-clamps when the data shrinks.** An `effect` pulls `pageIndex` back in range
  when `pageCount` drops, so a filter that shortens the list cannot strand you on an empty page.
  Mirrors `MatTableDataSource._updatePaginator`.
- **Navigation clamps at both ends**, and a no-op navigation emits nothing — `previousPage()` on
  page 0 emits no `page` event.
- **`disabled` blocks navigation and page-size changes**, not just pointer events.
- `pageCount` is `max(1, ceil(length / pageSize))`, so an empty list still reports one page.

## Working on this component

### `sticky` needs a height-bounded scroll ancestor

`[sticky]="true"` only adds the `ll-paginator-sticky` class (`src/styles/_ll-paginator.scss`), which
is plain CSS `position: sticky`. It therefore requires the nearest scrolling ancestor to have a
**definite height** *and* `overflow-auto`. For feature pages that ancestor is
`<main hlmSidebarInset>` (`h-svh overflow-auto`); in a dialog it is `mat-dialog-content`. This is the
same trap described at length in [Table → sticky gotcha](table.md#sticky-headerpaginator-depends-on-a-height-bounded-scroll-ancestor)
— check the ancestor before debugging the paginator.

### Emit semantics are part of the contract

`page` carries `previousPageIndex` and fires only when something actually changed. Consumers rely on
both facts; silently emitting on no-ops would cause redundant refetches.

## Reference consumer

`src/app/features/spaces/tasks/tasks.component.html:149` — `<ll-paginator [sticky]="true" [length]="dataSource.filteredData().length" />`
bound to a `TableDataSource`. `src/app/features/spaces/contents/shared/assets-select-dialog/` shows
the in-dialog variant.

# `ll-filter-toolbar` — search + popover filters

> Related: [Components index](README.md) · [Table](table.md) · [Frontend Architecture](../frontend-architecture.md)

## Overview

A reusable search + popover-filter toolbar in `src/app/shared/components/filter-toolbar/`, paired
with a `FilterPredicateUtils.create()` helper in `src/app/core/utils/`. Together they replace the
hand-rolled `filterForm` / `schemaFilterPredicate` code that used to be duplicated per page — search
input, a `FormGroup`, `debounceTime`, and a bespoke `JSON.parse(filter)` matcher.

It renders an optional search input, one popover per configured filter (single- or multi-select),
and a Reset button that appears only once something is set, then emits a single debounced
`filterChange` with the combined state.

**Not yet migrated:** `translations.component` mixes filter state with an unrelated `locale` select
in the same `FormGroup`, so it needs its own design pass before switching over.

## Usage

```typescript
imports: [LlFilterToolbarImports, /* ... */],
```

```typescript
readonly labelOptions: Signal<FilterOption[]> = computed(() =>
  [...new Set(this.schemas().flatMap(s => s.labels ?? []))].map(label => ({ value: label, label })),
);

readonly filters: Signal<FilterDef[]> = computed(() => [
  { key: 'labels', label: 'Labels', options: this.labelOptions(), mode: 'multiple' },
]);

selectedLabels = signal<string[]>([]);

onFilterChange(value: FilterToolbarValue): void {
  this.selectedLabels.set((value['labels'] as string[]) ?? []);
  this.dataSource.filter = JSON.stringify(value);
}
```

```html
<ll-filter-toolbar [filters]="filters()" (filterChange)="onFilterChange($event)" />
```

`dataSource.filter` (from `TableDataSource`, see [Table](table.md)) is set to
`JSON.stringify(value)` exactly like the old per-page code; `FilterPredicateUtils.create()` parses
it back out.

## API

### `FilterToolbar` — `<ll-filter-toolbar>`

| Member | Type | Default | Notes |
|---|---|---|---|
| `searchEnabled` | `InputSignal<boolean>` | `true` | Hides the search box entirely when `false`. |
| `searchPlaceholder` | `InputSignal<string>` | `'Search...'` | |
| `filters` | `InputSignal<FilterDef[]>` | `[]` | **Read once in `ngOnInit`** to build the internal controls — changing it later has no effect. |
| `filterChange` | `output<FilterToolbarValue>` | — | Fires ~500 ms after the last change to search text or any selection. |

### Models (`filter-toolbar.model.ts`)

```ts
interface FilterOption {
  value: string;
  label: string;
}

type FilterMode = 'single' | 'multiple';

interface FilterDef {
  key: string;      // control name, e.g. 'labels'
  label: string;    // trigger button text, e.g. 'Labels'
  options: FilterOption[];
  mode: FilterMode;
}

type FilterToolbarValue = Record<string, string | string[]> & { search: string };
// value[key] is `string[]` for a 'multiple' filter, `string` for a 'single' filter.
```

### `FilterPredicateUtils.create()`

A static-class helper in `src/app/core/utils/filter-predicate-utils.service.ts` (matching the
existing `ObjectUtils` / `NameUtils` convention) that builds a `(row, filter) => boolean` predicate
assignable to `TableDataSource.filterPredicate`:

```ts
interface FilterPredicateConfig<T> {
  searchFields: (row: T) => (string | undefined)[];
  filterFields?: { key: string; accessor: (row: T) => string[] | string | undefined }[];
}

FilterPredicateUtils.create<Schema>({
  searchFields: schema => [schema.id, schema.displayName, schema.description],
  filterFields: [{ key: 'labels', accessor: schema => schema.labels }],
});
```

## Behaviour

- **`multiple`**: clicking an option toggles it in the array, the popover stays open, and the trigger
  shows a count badge (`hlmButtonGroupText`) once ≥1 option is selected.
- **`single`**: clicking an option replaces the value and closes the popover; the trigger shows the
  selected option's `label` instead of a count.
- **Reset**: `hasActiveValues` (a `computed()` over `toSignal(form.valueChanges)`) is true whenever
  search text or any filter value is non-empty. The button renders only then, and clears every
  control to its empty shape — `''` for `search` and `single`, `[]` for `multiple` — re-triggering
  `filterChange` like any other edit.
- **Predicate matching**: a row must satisfy **all** active `filterFields` **and** the search text.
  `filterFields` use array-overlap matching, with `single` (`string`) and `multiple` (`string[]`)
  values both normalised to arrays so one code path handles each. Empty selections are skipped and
  do not constrain results. `searchFields` are case-insensitive substring matches, skipped entirely
  when `search` is empty.

## Working on this component

### Closing a `single` popover relies on `exportAs` through host directives

The popover is closed programmatically via a template reference that resolves through
`hlm-popover`'s `hostDirectives`-provided `BrnPopover`:

```html
<hlm-popover #pop="brnPopover" ...>
  ...
  <button hlm-command-item (selected)="select(def, option.value); def.mode === 'single' && pop.close()">
```

This was verified empirically — a throwaway scratch component compiled and type-checked
`pop.close()` cleanly — before being relied on, because Angular's Directive Composition API docs
don't explicitly confirm `exportAs` resolution through host directives.

### `filters` is static config, deliberately

It is read once in `ngOnInit`. Consumers compute `FilterOption[]` themselves (typically via
`computed()`); the component never derives option lists from data.

### Testing split

`FilterToolbar` itself has no unit tests — it is thin, markup-driven, and exercised end-to-end by
the `schemas` page, matching this codebase's convention for `ll-table`-style UI wiring.
`FilterPredicateUtils` **is** fully unit tested (`filter-predicate-utils.service.spec.ts`): empty
filter, search-only, single-mode equality, multiple-mode overlap, combined search + filter, and
undefined accessor values.

`FilterPredicateUtils` deliberately does not import `TableFilterPredicate`; the returned function is
structurally compatible with `TableDataSource.filterPredicate`, which keeps `core/utils` free of a
dependency on `shared/components/table`.

## Reference consumer

`src/app/features/spaces/schemas/schemas.component.*` — the first migrated consumer and the clearest
example. `webhook-detail.component` has since migrated too (`LlFilterToolbarImports` / `FilterDef` in
the `.ts`, `<ll-filter-toolbar>` in the `.html`).

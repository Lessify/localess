# Filter Toolbar

> Related: [Table Migration](table-migration.md) · [Frontend Architecture](frontend-architecture.md)

A reusable search + popover-filter toolbar lives in `src/app/shared/components/filter-toolbar/`, alongside a `FilterPredicateUtils.create()` helper in `src/app/core/utils/`. Together they replace the hand-rolled `filterForm`/`schemaFilterPredicate`-style code that used to be duplicated per page (search input + `FormGroup` + `debounceTime` + a bespoke `JSON.parse(filter)` matcher).

**First migrated consumer:** `src/app/features/spaces/schemas/schemas.component.*` — use it as the reference implementation.

**Not yet migrated:** `translations.component` (mixes filter state with an unrelated `locale` select in the same `FormGroup`) and `webhook-detail.component` (drives filters from raw signals, not a `FormGroup`). Both are good next candidates but need their own look before switching over.

---

## `FilterToolbar` (`ll-filter-toolbar`)

Renders: an optional search input, one popover per configured filter (single- or multi-select), and a Reset button that only appears once something is set. Emits one debounced `filterChange` event with the combined state — no per-page `FormGroup`, no per-page `debounceTime` plumbing.

### Inputs / Outputs

| Member | Type | Default | Notes |
|---|---|---|---|
| `searchEnabled` | `InputSignal<boolean>` | `true` | Hides the search box entirely when `false`. |
| `searchPlaceholder` | `InputSignal<string>` | `'Search...'` | |
| `filters` | `InputSignal<FilterDef[]>` | `[]` | Read once in `ngOnInit` to build the internal controls — changing this input after init has no effect (matches "static config computed by the consumer", e.g. via `computed()`). |
| `filterChange` | `output<FilterToolbarValue>()` | — | Fires ~500ms after the last change to search text or any filter selection. |

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

### Usage

```typescript
imports: [LlFilterToolbarImports, /* ... */],
```
```typescript
readonly labelOptions: Signal<FilterOption[]> = computed(() =>
  [...new Set(this.schemas().flatMap(s => s.labels ?? []))].map(label => ({ value: label, label })),
);

readonly filters: Signal<FilterDef[]> = computed(() => [{ key: 'labels', label: 'Labels', options: this.labelOptions(), mode: 'multiple' }]);

selectedLabels = signal<string[]>([]);

onFilterChange(value: FilterToolbarValue): void {
  this.selectedLabels.set((value['labels'] as string[]) ?? []);
  this.dataSource.filter = JSON.stringify(value);
}
```
```html
<ll-filter-toolbar [filters]="filters()" (filterChange)="onFilterChange($event)" />
```

`dataSource.filter` (from `TableDataSource`, see [Table Migration](table-migration.md)) is set to `JSON.stringify(value)` exactly like the old per-page code — `FilterPredicateUtils.create()` below parses it back out.

### Single vs. multiple selection

- **`multiple`**: clicking an option toggles it in the array; the popover stays open; the trigger shows a count badge (`hlmButtonGroupText`) once ≥1 option is selected.
- **`single`**: clicking an option replaces the control's value and closes the popover; the trigger shows the selected option's `label` instead of a count.

The popover is closed programmatically via a template reference variable that resolves through `hlm-popover`'s `hostDirectives`-provided `BrnPopover`:

```html
<hlm-popover #pop="brnPopover" ...>
  ...
  <button hlm-command-item (selected)="select(def, option.value); def.mode === 'single' && pop.close()">
```

This was verified empirically (a throwaway scratch component compiled and type-checked `pop.close()` cleanly) before relying on it, since Angular's Directive Composition API docs don't explicitly confirm `exportAs` resolution through host directives.

### Reset

`hasActiveValues` (a `computed()` driven by `toSignal(form.valueChanges)`) is `true` whenever search text or any filter value is non-empty. The Reset button only renders then, and clears every control back to its empty shape (`''` for `search`/`single` filters, `[]` for `multiple` filters) on click — re-triggering `filterChange` like any other edit.

### Non-goals (see the design spec below for full rationale)

- No dynamic/data-derived option lists inside the component — consumers compute `FilterOption[]` themselves (e.g. via `computed()`).
- No unit tests for `FilterToolbar` itself — it's a thin, markup-driven component exercised end-to-end by the `schemas` migration, matching this codebase's convention for `ll-table`-style UI wiring.

---

## `FilterPredicateUtils.create()` (`src/app/core/utils/filter-predicate-utils.service.ts`)

A static-class helper (matching this codebase's existing `ObjectUtils`/`NameUtils` convention in `core/utils/`) that builds a `(row, filter) => boolean` predicate assignable to `TableDataSource.filterPredicate`:

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

- `filterFields` — array-overlap matching (a row matches if any of its accessor's values is in the selected set); both `single` (`string`) and `multiple` (`string[]`) filter values are normalized to arrays internally so one code path handles both. Empty/absent selections for a field are skipped (that field doesn't constrain the results).
- `searchFields` — case-insensitive substring match against `filter.search`; skipped entirely when `search` is empty.
- A row must satisfy **all** active `filterFields` **and** the search text (if any) to match.
- No dependency on `TableFilterPredicate`'s type import — the returned function is structurally compatible with `TableDataSource.filterPredicate` without needing to import that type, keeping `core/utils` from depending on `shared/components/table`.
- Fully unit tested — see `filter-predicate-utils.service.spec.ts` for the matching-logic cases (empty filter, search-only, single-mode equality, multiple-mode overlap, combined search+filter, undefined accessor values).

---

## Design & planning docs

Full brainstorming design and implementation plan (not tracked in git — local scratch docs):
- `docs/superpowers/specs/2026-07-10-filter-toolbar-design.md`
- `docs/superpowers/plans/2026-07-10-filter-toolbar.md`

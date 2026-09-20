# Shared components

Project-owned, reusable components in `src/app/shared/components/`. These are the pieces consumers
**compose**, so they carry invariants that are easy to break silently — each one documented here.

> Not to be confused with `libs/ui/`, which is the vendored Spartan Helm layer
> (`components.json` → `componentsPath`, aliased `@spartan-ng/helm/*`). Components here are
> project-owned and *use* `Hlm*` primitives; they are not part of that library and are not managed
> by the Spartan CLI. See [Spartan UI Migration](../spartan-ui-migration.md).

## Index

| Component | Doc | Read when working on |
|---|---|---|
| `ll-table` | [table.md](table.md) | `shared/components/table/`, any table, sticky headers, responsive columns |
| `ll-paginator` | [paginator.md](paginator.md) | `shared/components/paginator/`, pagination, sticky paginators |
| `ll-tree` | [tree.md](tree.md) | `shared/components/tree/`, any tree UI, `@angular/aria` usage |
| `ll-filter-toolbar` | [filter-toolbar.md](filter-toolbar.md) | `shared/components/filter-toolbar/`, `core/utils/filter-predicate-utils.service.ts`, table/list filtering |

## When a component belongs here

Add a doc when **all three** hold. Otherwise the code speaks for itself and a doc would just rot:

1. It lives in `src/app/shared/components/`.
2. Consumers **compose** it — passing templates, directives or config — rather than just dropping a
   tag in and walking away.
3. It has at least one invariant you could break without anything failing loudly.

By that test, `logo`, `dialog` (a single constants file), `asset-card` and the one-off dialogs stay
undocumented on purpose. `background/` (the decorative effects family) and `locale-icon` are
borderline: sizeable, but consumed casually rather than composed. Revisit if that changes.

## Required structure

Every doc in this folder uses these sections, in this order. Consistency is the point — a developer
should be able to jump to "Working on this component" in any of them without hunting.

| Section | Contains |
|---|---|
| **Overview** | What it is, where it lives, and *why it's here rather than in `libs/ui`*. |
| **Usage** | One copy-pasteable block: the `imports`, the TypeScript wiring, the template. |
| **API** | Inputs, outputs, models — as tables. Include defaults. |
| **Behaviour** | What it does at runtime: state, events, edge cases a consumer would otherwise discover by accident. |
| **Working on this component** | The invariants. One `###` per rule, each stating **why**, not just what. |
| **Reference consumer** | A real file in `src/app/` to copy from. |

### On "Working on this component"

This is the section that earns the folder its keep, so write it like a warning to the next person —
including future you. Each rule should say what breaks and how you'd notice. Compare:

- ❌ "Don't use `group-*` variants."
- ✅ "Never use Tailwind `group-*` variants for per-item state — they compile to a *descendant*
  selector, and because tree items nest, an ancestor's state styles every descendant row. This
  shipped as a bug twice: focusing a parent ringed all its children, and expanding one rotated every
  descendant chevron."

Rules that came from a real bug should say so. That is what stops someone "simplifying" the fix
away six months later.

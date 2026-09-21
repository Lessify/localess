# `ll-tree` — reusable tree component

> Related: [Components index](README.md) · [Frontend Architecture](../frontend-architecture.md) · [Translations](../features/spaces/translations.md) · [Testing](../testing.md)

## Overview

`ll-tree` renders a hierarchical, keyboard-accessible tree. It lives in
`src/app/shared/components/tree/` and is built on the headless
[`@angular/aria/tree`](https://angular.dev/guide/aria/tree) primitives, styled with
Tailwind against the app's theme tokens so it reads as a sibling of the
Spartan/Helm components in `libs/ui`.

**It is deliberately not in `libs/ui`.** That directory is the vendored Spartan Helm
layer — `components.json` points `componentsPath` there and every folder is aliased
`@spartan-ng/helm/*` in `tsconfig.json`. Spartan ships no tree primitive today; if it
ever does, `spartan-ng add tree` must not collide with this component.

## Usage

```html
<ll-tree
  [nodes]="tree()"
  [expandedKeys]="expandedKeys()"
  (expandedKeysChange)="onExpandedKeysChange($event)"
  [selectedKey]="selectedId()"
  [guides]="true"
  (nodeSelect)="onNodeSelect($event)">
  <ng-template llTreeNodeDef let-node>
    <span class="break-all">{{ node.name }}</span>
  </ng-template>
</ll-tree>
```

```typescript
import { collectGroupKeys, LlTreeImports } from '@shared/components/tree/tree.imports';

@Component({ imports: [LlTreeImports] /* ... */ })
```

`ll-tree` renders the row chrome and the chevron; everything inside the row comes from
your `llTreeNodeDef` template. Expansion state is never written onto your nodes, so the
node array can be a `computed()` that rebuilds freely.

## API

### `LlTree<T extends LlTreeNode>` — `<ll-tree>`

| Member | Type | Default | Notes |
|---|---|---|---|
| `nodes` | `input.required<readonly T[]>` | — | The tree to render. |
| `expandedKeys` | `model<ReadonlySet<string>>` | empty set | Keys of expanded nodes. Uncontrolled by default; bind it to drive expansion yourself. |
| `selectedKey` | `model<string \| undefined>` | `undefined` | Key of the selected node. |
| `indent` | `input<number>` | `16` | Pixels of indentation per level. |
| `guides` | `input<boolean>` | `false` | Draw vertical indent guide lines. |
| `nodeSelect` | `output<T>` | — | Emitted when a leaf is selected. |

### `LlTreeNodeDef` — `[llTreeNodeDef]`

Marks the `ng-template` rendering a node's content. Context:

| Property | Type |
|---|---|
| `$implicit` | `T` — the node |
| `expanded` | `boolean` |
| `hasChildren` | `boolean` |
| `level` | `number` — 1-based |

### `LlTreeNode` and `collectGroupKeys`

```typescript
interface LlTreeNode {
  key: string;   // stable, unique — drives tracking, expansion and selection
  name: string;  // typeahead label only; ll-tree never renders it
  children?: LlTreeNode[];
}

function collectGroupKeys(nodes: readonly LlTreeNode[]): ReadonlySet<string>;
```

`collectGroupKeys` returns every key that has children, at any depth — useful for
"expand all".

## Behaviour

- **Group nodes are not selectable.** A node with children toggles expansion on click
  or Space/Enter; only leaves select and emit `nodeSelect`.
- **`selectionMode` is `explicit`.** Arrow keys move focus without changing selection;
  Space/Enter selects. This keeps a detail pane from re-rendering on every keypress.
- **Keyboard support** comes from Aria: arrows, Home/End, expand/collapse, and
  typeahead (which uses `node.name`, not the row's rendered text).
- **Collapsed subtrees are unmounted, not hidden.** Aria's `TreeItemGroup` host-applies
  `DeferredContent`, so collapsed branches cost nothing. There is no virtual scrolling,
  so a fully expanded very large tree still renders every visible node.

## Working on this component

`@angular/aria` is **developer preview** (`@developerPreview 21.0` on every directive),
so its API may break in a minor release. It is confined to `tree.ts` — consumers only
see the `ll-tree` API, so an upstream break is a one-file repair. The version is pinned
exactly (`21.2.5`) because the package peer-depends on an exact `@angular/cdk` version;
aria, cdk and material must be upgraded together.

**The published guide at angular.dev contradicts the installed package in two places.**
Trust `node_modules/@angular/aria/types/tree.d.ts`, and do not "fix" working code to
match the docs:

| Topic | angular.dev says | The package actually does |
|---|---|---|
| Selection | `[(value)]`, a single value | `values: V[]` with output `valuesChange` — an array, even in single-select |
| Group markup | `<ul role="group">` is a sibling after `</li>` | Nested *inside* the `<li ngTreeItem>` (verified working) |

### Never use Tailwind `group-*` variants for per-item state

Tree items nest — a child's `<li>` lives inside its parent's `<li>` — and Tailwind's
`group-*` variants compile to a **descendant** selector
(`:is(:where(.group\/item):focus-visible *)`). An ancestor's state therefore styles
every descendant row. This shipped as a real bug twice over: focusing a parent drew a
focus ring around all of its children, and expanding a node rotated every descendant
chevron, collapsed ones included.

Per-item state lives in the component's `styles` block, scoped with the **child**
combinator:

```css
[data-slot='tree-item']:focus-visible > [data-slot='tree-item-row'] { … }
[data-slot='tree-item'][aria-selected='true'] > [data-slot='tree-item-row'] { … }
```

Scoped styles work here — unlike the `<svg>` rule above — because both the `<li>` and
the row are in `ll-tree`'s own template and so carry its `_ngcontent` attribute.
The chevron rotation uses `transform: rotate(90deg)` rather than the `rotate` property,
because the chevron's `transition-transform` animates `transform`.

### The focus ring must stay inside the row

Rows are packed tight: 2px between siblings, and **exactly 0** between a parent's row and
its child group, because the group is a block sibling of the row inside the same `<li>`.
An outward ring (`box-shadow: 0 0 0 3px`) therefore always spills onto the neighbouring
row — and since that neighbour's background paints *later*, it clips the spilled band.
The visible symptom was a focused parent whose ring collided with, and was eaten by, its
selected child's highlight.

So the ring is `inset`, and must stay that way:

```css
box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--ring) 60%, transparent);
```

This deviates from the Helm convention (`focus-visible:ring-[3px]`, which is outset) on
purpose: Helm applies it to buttons and inputs, which have room around them. A tree row
does not. `tree.spec.ts` asserts the declared rule is inset, because happy-dom neither
resolves `:focus-visible` nor paints, so nothing else in the suite would catch a revert.

### Indentation has exactly one mechanism

A row is offset by `(level - 1) × indent` pixels of **`margin-left`**, and **nothing else
may offset a node**. Margin rather than padding so the indent sits *outside* the row's
box: the selected/hover highlight then wraps only the node itself instead of the whole
line — which matters because a prefix row is a synthesised namespace segment, not a
translation record, so a full-width bar would misrepresent it.

In particular a child `<ul role="group">` must never carry a `margin-left` or
`border-left`: because each group is nested inside its parent's `<li>`, such an offset
accumulates down the tree *and* stacks on top of the row's own offset, so levels drift
outward instead of stepping evenly. This was a real bug — with guides enabled, levels
landed at 0 / 32 / 80px instead of 0 / 16 / 32px.

That is why indent guides are drawn as an absolutely-positioned `::before` pseudo-element
on the group, offset by the `--ll-tree-guide-left` custom property: it costs no layout.

`tree.spec.ts` guards both halves — indentation is asserted across three levels with
guides on *and* off, and child groups are asserted to have no margin.

Two more things worth knowing before writing tests, both learned the hard way:

- **Aria binds `pointerdown`, not `click`.** `HTMLElement.click()` does nothing; dispatch
  `new MouseEvent('pointerdown', { bubbles: true })`.
- **Icons in a row must not be hit-testable.** Aria resolves the pressed item with
  `event.target instanceof HTMLElement`. An `<svg>` is an `SVGElement`, so pressing an
  icon — the chevron, or any icon your node template renders — is silently ignored. The
  row therefore carries `[&_svg]:pointer-events-none`, which retargets the press to the
  row. Do not remove it, and do not move the rule into the component's `styles` block:
  Angular's emulated encapsulation would scope it to `svg[_ngcontent-…]`, and an `<svg>`
  rendered by `ng-icon` belongs to *that* component's view, so the rule would never
  match. It has to be a global utility class. Keying on `svg` rather than `ng-icon`
  (as `hlm-button` does) leaves the icon host hoverable, so tooltips on projected icons
  keep working.
- **`TreeItem` publishes expansion from an `afterRenderEffect`**, which
  `fixture.detectChanges()` does not flush. Tests must `await fixture.whenStable()` or
  children never mount. See the `settle()` helper in `tree.spec.ts`.

## Reference consumer

The translations tree layout
(`src/app/features/spaces/translations/shared/components/translation-list/`) is the
reference usage. It demonstrates the controlled-expansion pattern: while a filter is
active the tree opens fully — via `collectGroupKeys` — so no match hides behind a
collapsed parent, and the user's manual expansion is restored when the filter clears.

import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, input, model, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';

import { LlTreeNode } from './tree-node.model';
import { LlTreeNodeDef } from './tree-node-def';

/**
 * A tree built on the headless `@angular/aria/tree` primitives, styled to match
 * the Spartan/Helm components in `libs/ui`.
 *
 * Aria is annotated `@developerPreview 21.0`. It is deliberately confined to this
 * file so a breaking change upstream is a one-file repair.
 *
 * Aria's `TreeItemGroup` host-applies `DeferredContent`, so a collapsed subtree is
 * not rendered at all — there is deliberately no `display: none` rule here.
 */
@Component({
  selector: 'll-tree',
  exportAs: 'llTree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NgIcon, Tree, TreeItem, TreeItemGroup],
  providers: [provideIcons({ lucideChevronRight })],
  template: `
    <ul
      ngTree
      #tree="ngTree"
      data-slot="tree"
      selectionMode="explicit"
      [values]="selectedValues()"
      (valuesChange)="onValuesChange($event)"
      class="flex flex-col gap-0.5 outline-none">
      <ng-container [ngTemplateOutlet]="rows" [ngTemplateOutletContext]="{ nodes: nodes(), parent: tree }" />
    </ul>

    <ng-template #rows let-nodes="nodes" let-parent="parent">
      @for (node of nodes; track node.key) {
        <li
          ngTreeItem
          #item="ngTreeItem"
          data-slot="tree-item"
          class="list-none outline-none"
          [parent]="parent"
          [value]="node.key"
          [label]="node.name"
          [selectable]="!hasChildren(node)"
          [expanded]="expandedKeys().has(node.key)"
          (expandedChange)="onExpandedChange(node.key, $event)">
          <div
            data-slot="tree-item-row"
            class="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm select-none [&_svg]:pointer-events-none"
            [style.margin-left.px]="(item.level() - 1) * indent()">
            @if (hasChildren(node)) {
              <ng-icon
                name="lucideChevronRight"
                aria-hidden="true"
                data-slot="tree-item-chevron"
                class="size-4 shrink-0 transition-transform" />
            } @else {
              <span aria-hidden="true" class="size-4 shrink-0"></span>
            }
            <ng-container
              [ngTemplateOutlet]="nodeDef().templateRef"
              [ngTemplateOutletContext]="{
                $implicit: node,
                expanded: expandedKeys().has(node.key),
                hasChildren: hasChildren(node),
                level: item.level(),
              }" />
          </div>

          @if (hasChildren(node)) {
            <ul
              role="group"
              data-slot="tree-group"
              class="relative flex flex-col gap-0.5"
              [attr.data-guides]="guides() ? '' : null"
              [style.--ll-tree-guide-left]="guideLeft(item.level())">
              <ng-template ngTreeItemGroup [ownedBy]="item" #group="ngTreeItemGroup">
                <ng-container [ngTemplateOutlet]="rows" [ngTemplateOutletContext]="{ nodes: node.children, parent: group }" />
              </ng-template>
            </ul>
          }
        </li>
      }
    </ng-template>
  `,
  styles: `
    /*
     * Per-item state is styled with the CHILD combinator, never Tailwind's \`group-*\`
     * variants. Those compile to a descendant selector
     * (\`:is(:where(.group\\/item):focus-visible *)\`), and because tree items nest —
     * a child <li> sits inside its parent's <li> — an ancestor's state leaked onto
     * every descendant row: focusing a parent drew a focus ring around all of its
     * children, and expanding one rotated every descendant chevron, collapsed or not.
     * \`>\` confines each rule to the item's own row.
     */
    [data-slot='tree-item']:focus-visible > [data-slot='tree-item-row'] {
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
    }

    [data-slot='tree-item'][aria-selected='true'] > [data-slot='tree-item-row'] {
      background-color: var(--accent);
      color: var(--accent-foreground);
      font-weight: 500;
    }

    /* \`transform\`, not \`rotate\`: the chevron's \`transition-transform\` animates this one. */
    [data-slot='tree-item'][aria-expanded='true'] > [data-slot='tree-item-row'] > [data-slot='tree-item-chevron'] {
      transform: rotate(90deg);
    }

    /*
     * Indent guides are drawn as a pseudo-element so they cost no layout: a margin or
     * border on the group would shift its children and double-count the indentation
     * the row's own margin already applies.
     */
    [data-slot='tree-group'][data-guides]::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: var(--ll-tree-guide-left);
      border-left: 1px solid var(--border);
      /*
       * Without this, a selected row's opaque background hides every ancestor's guide
       * where it crosses that row: the guide is painted with its own group, but the
       * row belongs to a *deeper* group that paints later. Only the innermost guide —
       * a positioned sibling of the row's own <li> — survived, so a selected node
       * showed one guide and lost the rest. Raising the guides puts them all above
       * row backgrounds, so the lines stay continuous.
       */
      z-index: 1;
    }
  `,
})
export class LlTree<T extends LlTreeNode> {
  /** The nodes to render. Rebuilding this array is cheap — expansion lives in `expandedKeys`, never on the nodes. */
  readonly nodes = input.required<readonly T[]>();
  /** Keys of the expanded nodes. Uncontrolled by default; bind it to drive expansion from the consumer. */
  readonly expandedKeys = model<ReadonlySet<string>>(new Set<string>());
  /** Key of the selected node, or `undefined`. */
  readonly selectedKey = model<string | undefined>(undefined);
  /** Pixels of indentation per level. */
  readonly indent = input(16);
  /** Whether to draw vertical indent guide lines. */
  readonly guides = input(false);

  readonly nodeSelect = output<T>();

  protected readonly nodeDef = contentChild.required(LlTreeNodeDef);

  /** Half the chevron's 16px box, so the guide lands under the parent's chevron centre. */
  private readonly CHEVRON_CENTRE = 16;

  protected hasChildren(node: LlTreeNode): boolean {
    return !!node.children?.length;
  }

  /** Where a child group's guide line sits, relative to the group's own box. */
  protected guideLeft(level: number): string {
    return `${(level - 1) * this.indent() + this.CHEVRON_CENTRE}px`;
  }

  protected onExpandedChange(key: string, expanded: boolean): void {
    const next = new Set(this.expandedKeys());
    if (expanded) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.expandedKeys.set(next);
  }

  /** Aria's `values` model is an array even in single-select, so adapt it to our single key. */
  protected readonly selectedValues = computed<string[]>(() => {
    const key = this.selectedKey();
    return key === undefined ? [] : [key];
  });

  protected onValuesChange(values: string[]): void {
    const key = values.at(0);
    this.selectedKey.set(key);
    const node = key === undefined ? undefined : this.findNode(this.nodes(), key);
    if (node) {
      this.nodeSelect.emit(node);
    }
  }

  /**
   * The base interface declares `children` as `LlTreeNode[]`, so descending into it
   * loses `T`. A consumer's tree is homogeneous, so the narrowing back to `T` is safe
   * — it is asserted once, here, rather than at every call site.
   */
  private findNode(nodes: readonly LlTreeNode[], key: string): T | undefined {
    for (const node of nodes) {
      if (node.key === key) {
        return node as unknown as T;
      }
      const match = node.children?.length ? this.findNode(node.children, key) : undefined;
      if (match) {
        return match;
      }
    }
    return undefined;
  }
}

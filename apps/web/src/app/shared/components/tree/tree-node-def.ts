import { Directive, inject, TemplateRef } from '@angular/core';

import { LlTreeNode } from './tree-node.model';

/** Context handed to the consumer's node template. */
export interface LlTreeNodeContext<T extends LlTreeNode> {
  $implicit: T;
  expanded: boolean;
  hasChildren: boolean;
  level: number;
}

/**
 * Marks the `ng-template` that renders the contents of a single tree node.
 * `ll-tree` renders the chevron and the row chrome; everything inside the row
 * comes from this template.
 */
@Directive({
  selector: '[llTreeNodeDef]',
})
export class LlTreeNodeDef<T extends LlTreeNode> {
  readonly templateRef = inject<TemplateRef<LlTreeNodeContext<T>>>(TemplateRef);

  // The guard's parameters exist only to shape the type predicate; neither is read at runtime.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static ngTemplateContextGuard<T extends LlTreeNode>(_dir: LlTreeNodeDef<T>, ctx: unknown): ctx is LlTreeNodeContext<T> {
    return true;
  }
}

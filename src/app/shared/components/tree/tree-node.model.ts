/**
 * The shape `ll-tree` requires of every node. Consumers extend this with
 * whatever extra fields their node template needs.
 */
export interface LlTreeNode {
  /** Stable, unique identifier. Used for tracking, expansion state and selection. */
  key: string;
  /** Plain-text name. Used only for Aria's typeahead label, never rendered by `ll-tree` itself. */
  name: string;
  children?: LlTreeNode[];
}

/** Collects the keys of every node that has children, at any depth. */
export function collectGroupKeys(nodes: readonly LlTreeNode[]): ReadonlySet<string> {
  const keys = new Set<string>();
  const visit = (items: readonly LlTreeNode[]): void => {
    for (const item of items) {
      if (item.children?.length) {
        keys.add(item.key);
        visit(item.children);
      }
    }
  };
  visit(nodes);
  return keys;
}

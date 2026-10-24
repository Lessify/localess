import type { Content } from '@localess/shared';
import type { LlTreeNode } from '@shared/components/tree/tree.imports';

export interface MoveDialogContext {
  spaceId: string;
  /** What is moved: a folder can not go under itself. */
  content: Content;
}

export interface MoveDialogResult {
  /** The folder to move into; `null`: the root. */
  parentId: string | null;
}

/** A place to move to in the dialog's tree: the root (`id` null) with the folders under it. */
export interface MoveTarget extends LlTreeNode {
  id: string | null;
  /** The folder's full slug; '' for the root. */
  path: string;
  /** Where the item is now: shown, but not a target. */
  current: boolean;
  children?: MoveTarget[];
}

import type { Content } from '@localess/shared';

export interface MoveDialogContext {
  spaceId: string;
  /** What is moved: a folder can not go under itself. */
  content: Content;
}

export interface MoveDialogResult {
  /** The folder to move into; `null`: the root. */
  parentId: string | null;
}

/** A place to move to: a folder, or the root (`id` null). */
export interface MoveTarget {
  id: string | null;
  name: string;
  /** The folder's full slug; '' for the root. */
  path: string;
}

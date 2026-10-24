import { SpaceTemplateId } from '@localess/shared';

/** The dialog takes no context: creating a space starts from a blank form. */
export interface SpaceCreateDialogResult {
  name: string;
  /** One the server offered; none: the space alone ("Empty"). */
  template?: SpaceTemplateId;
}

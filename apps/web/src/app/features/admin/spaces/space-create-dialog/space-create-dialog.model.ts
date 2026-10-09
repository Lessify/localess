import { SpaceTemplateId } from '../space-template.model';

/** The dialog takes no context: creating a space starts from a blank form. */
export interface SpaceCreateDialogResult {
  name: string;
  /** Always set. EMPTY when the user had no choice to make, which means "do nothing". */
  template: SpaceTemplateId;
}

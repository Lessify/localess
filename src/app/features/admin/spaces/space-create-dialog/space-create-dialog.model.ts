import { SpaceTemplateId } from '@shared/models/space-template.model';

export interface SpaceCreateDialogModel {
  name: string;
  /** Always set. EMPTY when the user had no choice to make, which means "do nothing". */
  template: SpaceTemplateId;
}

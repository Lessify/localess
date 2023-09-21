import { Content } from '@shared/models/content.model';

export interface EditDialogModel {
  content: Content;
  reservedNames: string[];
  reservedSlugs: string[];
}

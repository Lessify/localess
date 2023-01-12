import {Content} from '@shared/models/content.model';

export interface ContentEditDialogModel {
  content: Content;
  reservedNames: string[];
  reservedSlugs: string[];
}

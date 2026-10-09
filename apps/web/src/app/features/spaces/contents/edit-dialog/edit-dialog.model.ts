import { Content } from '@shared/models/content.model';

export interface EditDialogContext {
  content: Content;
  reservedNames: string[];
  reservedSlugs: string[];
}

export interface EditDialogResult {
  name: string;
  slug: string;
}

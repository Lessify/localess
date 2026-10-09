import { Content } from '@localess/shared';

export interface EditDialogContext {
  content: Content;
  reservedNames: string[];
  reservedSlugs: string[];
}

export interface EditDialogResult {
  name: string;
  slug: string;
}

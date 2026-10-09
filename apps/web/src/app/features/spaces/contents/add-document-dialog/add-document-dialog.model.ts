import { Schema } from '@localess/shared';

export interface AddDocumentDialogContext {
  schemas: Schema[];
  reservedNames: string[];
  reservedSlugs: string[];
}

export interface AddDocumentDialogResult {
  name: string;
  slug: string;
  schema: string;
}

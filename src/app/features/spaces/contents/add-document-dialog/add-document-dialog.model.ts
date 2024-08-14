import { Schema } from '@shared/models/schema.model';

export interface AddDocumentDialogModel {
  schemas: Schema[];
  reservedNames: string[];
  reservedSlugs: string[];
}

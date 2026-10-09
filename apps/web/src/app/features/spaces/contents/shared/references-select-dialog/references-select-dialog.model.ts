import { ContentDocument } from '@shared/models/content.model';

export interface ReferencesSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
}

export type ReferencesSelectDialogResult = ContentDocument[];

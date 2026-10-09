import { ContentDocument } from '@localess/shared';

export interface ReferencesSelectDialogContext {
  spaceId: string;
  multiple?: boolean;
}

export type ReferencesSelectDialogResult = ContentDocument[];

import { TranslationType } from '@localess/shared';

export interface AddDialogContext {
  reservedIds: string[];
}

export interface AddDialogResult {
  id: string;
  type: TranslationType;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}

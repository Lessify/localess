import { TranslationType } from '@shared/models/translation.model';

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

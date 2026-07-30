import { TranslationType } from '@shared/models/translation.model';

export interface AddDialogModel {
  reservedIds: string[];
}

export interface AddDialogReturnModel {
  id: string;
  type: TranslationType;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}

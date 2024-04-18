import { TranslationType } from '@shared/models/translation.model';

export interface TranslationAddDialogModel {
  id: string;
  type: TranslationType;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}

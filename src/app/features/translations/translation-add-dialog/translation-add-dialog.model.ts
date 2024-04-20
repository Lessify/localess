import { TranslationType } from '@shared/models/translation.model';

export interface TranslationAddDialogModel {
  reservedNames: string[];
}

export interface TranslationAddDialogReturnModel {
  id: string;
  type: TranslationType;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}

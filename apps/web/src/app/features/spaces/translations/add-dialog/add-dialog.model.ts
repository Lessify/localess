import { TranslationType } from '@localess/shared';

export interface AddDialogContext {
  reservedKeys: string[];
}

export interface AddDialogResult {
  key: string;
  type: TranslationType;
  value: string;
  labels: string[];
  description: string;
  autoTranslate?: boolean;
}

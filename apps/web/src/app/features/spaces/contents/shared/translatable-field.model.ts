import { TranslateFormat } from '@localess/shared';

// UI-only translate types; the translate request/response models are in @localess/shared.

export interface TranslatableField {
  id: string;
  content: string;
  format: TranslateFormat;
  apply: (translated: string) => void;
}

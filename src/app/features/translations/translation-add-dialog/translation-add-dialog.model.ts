import {TranslationType} from '@shared/models/translation.model';

export interface TranslationAddDialogModel {
  name: string
  type: TranslationType
  value: string
  labels: string[]
  description: string
  autoTranslate?: boolean
}

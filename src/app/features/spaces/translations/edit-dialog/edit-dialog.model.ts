import { Translation } from '@shared/models/translation.model';

/** The translation being edited; only its description and labels are shown. */
export type EditDialogContext = Translation;

export interface EditDialogResult {
  labels: string[];
  description: string;
}

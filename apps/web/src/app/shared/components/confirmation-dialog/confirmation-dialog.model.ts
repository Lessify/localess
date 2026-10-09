import { DIALOG_WIDTH_LG } from '@shared/components/dialog/dialog-width';

export interface ConfirmationDialogContext {
  title: string;
  content: string;
  /**
   * Style of the confirming button. Defaults to `primary`.
   *
   * Use `destructive` whenever the action destroys something the user cannot get back - every
   * delete, but also actions that irreversibly break something without deleting a record, so the
   * red button is what tells them apart from an ordinary confirmation.
   */
  variant?: ConfirmationDialogVariant;
}

export type ConfirmationDialogVariant = 'primary' | 'destructive';

/** `true` when confirmed. Dismissing resolves to `undefined`, which callers filter out the same way. */
export type ConfirmationDialogResult = boolean;

/** Width for every confirmation dialog, shared so the 17 call sites cannot drift apart. */
export const CONFIRMATION_DIALOG_CONTENT_CLASS = DIALOG_WIDTH_LG;

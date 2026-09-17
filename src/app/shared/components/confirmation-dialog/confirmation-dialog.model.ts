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

/**
 * Width for every confirmation dialog, shared so the 17 call sites cannot drift apart.
 *
 * `.spartan-dialog-content` is `w-full` inside an auto-sized overlay and carries `sm:max-w-sm`, so
 * width *and* max-width are both needed - a lone width utility is silently clamped to 384px. The
 * `!` is needed because the nova sheet is inside `@scope`, where proximity outranks source order.
 */
export const CONFIRMATION_DIALOG_CONTENT_CLASS = 'w-lg! max-w-lg!';

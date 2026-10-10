/** Edits a schema's name (shown as its ID), not the row id. */
export interface EditIdDialogContext {
  name: string;
  reservedNames: string[];
}

/** The new name on its own, not the form object. */
export type EditIdDialogResult = string;

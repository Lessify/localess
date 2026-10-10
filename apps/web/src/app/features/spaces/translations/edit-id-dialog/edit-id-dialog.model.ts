/** Edits a translation's key, not the row id. */
export interface EditIdDialogContext {
  key: string;
  reservedKeys: string[];
}

/** The new key on its own, not the form object. */
export type EditIdDialogResult = string;

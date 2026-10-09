export interface EditIdDialogContext {
  id: string;
  reservedIds: string[];
}

/** The new id on its own, not the form object. */
export type EditIdDialogResult = string;

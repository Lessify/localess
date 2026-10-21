import { Observable } from 'rxjs';

/** Edits a translation's key, not the row id. */
export interface EditIdDialogContext {
  key: string;
  /** Whether the space has this key (the server's check). */
  isKeyTaken: (key: string) => Observable<boolean>;
}

/** The new key on its own, not the form object. */
export type EditIdDialogResult = string;

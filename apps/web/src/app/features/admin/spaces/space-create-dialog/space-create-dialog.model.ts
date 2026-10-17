/** The dialog takes no context: creating a space starts from a blank form. */
export interface SpaceCreateDialogResult {
  name: string;
  /** A template id the server offered; always set, `EMPTY` when the user had no choice to make. */
  template: string;
}

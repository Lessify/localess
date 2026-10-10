/** The environment being edited; absent when adding one. */
export interface EnvironmentDialogContext {
  name: string;
  url: string;
}

export interface EnvironmentDialogResult {
  name: string;
  url: string;
}

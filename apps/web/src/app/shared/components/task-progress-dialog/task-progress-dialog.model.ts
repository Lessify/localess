import { Task } from '@localess/shared';

/** The task a dialog follows: just created, in `spaceId`. */
export interface TaskProgressDialogContext {
  spaceId: string;
  task: Task;
  /** The dialog's title: what the user started ("Translations Import"). */
  title: string;
}

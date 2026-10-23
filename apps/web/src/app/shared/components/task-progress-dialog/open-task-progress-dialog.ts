import { DIALOG_WIDTH_SM } from '@shared/components/dialog/dialog-width';
import { HlmDialogService } from '@spartan-ng/helm/dialog';

import { TaskProgressDialogComponent } from './task-progress-dialog.component';
import { TaskProgressDialogContext } from './task-progress-dialog.model';

/** Opens the dialog that follows a task the user just started. */
export function openTaskProgressDialog(dialog: HlmDialogService, context: TaskProgressDialogContext): void {
  dialog.open<void, TaskProgressDialogContext>(TaskProgressDialogComponent, { context, contentClass: DIALOG_WIDTH_SM });
}

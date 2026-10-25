import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TaskService } from '@core/services/task.service';
import { TaskLogService } from '@core/services/task-log.service';
import { TaskNotifierService } from '@core/services/task-notifier.service';
import { isTaskExport, TaskLogLevel, TaskStatus } from '@localess/shared';
import { formatTaskProgress } from '@shared/models/task.model';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { saveAs } from 'file-saver-es';
import { filter, switchMap, take } from 'rxjs';

import { TaskProgressDialogContext } from './task-progress-dialog.model';

/** Problems shown in the dialog; the task's page lists them all. */
const SHOWN_PROBLEMS = 10;

/**
 * Follows a task the user just started, live: queued, running (its step and a bar), done (an export downloads, an
 * import says so) or failed (the reason and the problems, from its logs). "Continue in background" closes it and leaves the
 * end to the notifier.
 */
@Component({
  selector: 'll-task-progress-dialog',
  templateUrl: './task-progress-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmButtonImports, HlmDialogImports, HlmProgressImports],
})
export class TaskProgressDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<void>>(BrnDialogRef);
  private readonly taskService = inject(TaskService);
  private readonly taskLogService = inject(TaskLogService);
  private readonly notifier = inject(TaskNotifierService);

  readonly context = injectBrnDialogContext<TaskProgressDialogContext>();

  readonly task = toSignal(this.taskService.findOne(this.context.spaceId, this.context.task.id), { initialValue: this.context.task });
  /** The live progress (events only; a task's row holds none). */
  readonly progress = toSignal(this.taskService.progress(this.context.spaceId, this.context.task.id));
  readonly ended = computed(() => this.task().status === TaskStatus.FINISHED || this.task().status === TaskStatus.ERROR);
  /** Why it failed: its logs' ERROR lines, then its first problems (WARN lines). Read once it ended in ERROR. */
  private readonly failureLines = toSignal(
    toObservable(this.task).pipe(
      filter(task => task.status === TaskStatus.ERROR),
      take(1),
      switchMap(() => this.taskLogService.findAll(this.context.spaceId, this.context.task.id)),
    ),
    { initialValue: [] },
  );
  readonly statusText = computed(() => {
    const task = this.task();
    switch (task.status) {
      case TaskStatus.QUEUED:
        return 'Queued: it starts when no other task of this space is running.';
      case TaskStatus.IN_PROGRESS: {
        const progress = this.progress();
        return progress ? formatTaskProgress(progress) : 'Running';
      }
      case TaskStatus.FINISHED:
        return isTaskExport(task) ? 'Done: the download has started.' : 'Done';
      default:
        return this.failureLines().find(it => it.level === TaskLogLevel.ERROR)?.message ?? 'Failed';
    }
  });
  /** The bar's value in percent; undefined while the total is unknown (an indeterminate bar). */
  readonly percent = computed(() => {
    const progress = this.progress();
    return progress?.total ? Math.round((progress.done / progress.total) * 100) : undefined;
  });
  readonly problems = computed(() =>
    this.failureLines()
      .filter(it => it.level === TaskLogLevel.WARN)
      .slice(0, SHOWN_PROBLEMS)
      .map(it => it.message),
  );

  private downloaded = false;

  constructor() {
    this.notifier.follow(this.context.spaceId, this.context.task.id);
    inject(DestroyRef).onDestroy(() => this.notifier.unfollow(this.context.task.id));
    effect(() => {
      const task = this.task();
      const file = task.file;
      if (this.downloaded || task.status !== TaskStatus.FINISHED || !isTaskExport(task) || !file) return;
      this.downloaded = true;
      this.taskService.downloadUrl(this.context.spaceId, task.id).subscribe(url => saveAs(url, file.name));
    });
  }

  continueInBackground(): void {
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TaskService } from '@core/services/task.service';
import { UserStore } from '@core/stores/user.store';
import { isTaskExport, Task, TaskKind, taskKindsFor, TaskProgress, TaskStatus } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideClock, lucideInfo, lucideTriangleAlert } from '@ng-icons/lucide';
import { formatTaskParams, formatTaskProgress, TASK_KIND_LABELS, TASK_KIND_WARNINGS } from '@shared/models/task.model';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { combineLatest, map, of, scan, startWith, switchMap } from 'rxjs';

/** An active task as the pill and its popover show it. */
export interface ActiveTaskView {
  task: Task;
  label: string;
  /** "en → de", "Localess file (all locales)". */
  details?: string;
  progress?: TaskProgress;
  progressText?: string;
  /** The bar's value in percent; undefined while the total is unknown. */
  percent?: number;
  startedBy?: string;
  warning: string;
  /** An export only reads: told softly, not as a warning. */
  readsOnly: boolean;
  /** The user may open the task (its kind is one they may start). */
  link?: string[];
}

/**
 * Tells everyone on a screen that a task is queued or running on its data (`kinds`): a pill in the action bar with the
 * running task's progress and how many wait, and a popover with each one (who started it, what it may do to the data
 * shown, a link for those who may open it). Shown only while one is active; it blocks nothing.
 */
@Component({
  selector: 'll-active-tasks',
  templateUrl: './active-tasks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    HlmBadgeImports,
    HlmButtonImports,
    HlmIconImports,
    HlmPopoverImports,
    HlmProgressImports,
    HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideClock, lucideInfo, lucideTriangleAlert })],
})
export class ActiveTasksComponent {
  private readonly taskService = inject(TaskService);
  private readonly userStore = inject(UserStore);

  readonly spaceId = input.required<string>();
  /** The kinds whose tasks change (or read) the data this screen shows. */
  readonly kinds = input.required<readonly TaskKind[]>();

  private readonly source = computed(() => ({ spaceId: this.spaceId(), kinds: this.kinds() }));

  /** The active tasks, with the latest progress events laid over what the server knew when it answered. */
  private readonly tasks = toSignal(
    toObservable(this.source).pipe(
      switchMap(({ spaceId, kinds }) =>
        kinds.length
          ? combineLatest([
              this.taskService.findActive(spaceId, kinds),
              this.taskService.spaceProgress(spaceId).pipe(
                scan((live, it) => new Map(live).set(it.id, it.progress), new Map<string, TaskProgress>()),
                startWith(new Map<string, TaskProgress>()),
              ),
            ]).pipe(map(([tasks, live]) => tasks.map(task => ({ task, progress: live.get(task.id) ?? task.progress }))))
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  readonly views = computed<ActiveTaskView[]>(() => {
    const spaceId = this.spaceId();
    const readable = taskKindsFor({ role: this.userStore.role() });
    return this.tasks().map(({ task, progress }) => {
      const running = task.status === TaskStatus.IN_PROGRESS;
      return {
        task,
        label: TASK_KIND_LABELS[task.kind],
        details: formatTaskParams('params' in task ? task.params : undefined),
        progress: running ? progress : undefined,
        progressText: running && progress ? formatTaskProgress(progress) : undefined,
        percent: running && progress?.total ? Math.round((progress.done / progress.total) * 100) : undefined,
        startedBy: task.createdBy ? (task.createdBy.displayName ?? task.createdBy.email) : undefined,
        warning: TASK_KIND_WARNINGS[task.kind],
        readsOnly: isTaskExport(task),
        link: readable.includes(task.kind) ? ['/features/spaces', spaceId, 'tasks', task.id] : undefined,
      };
    });
  });

  /** The task the pill shows: the running one, else the first queued. */
  readonly current = computed(() => this.views().find(it => it.task.status === TaskStatus.IN_PROGRESS) ?? this.views()[0]);
  readonly running = computed(() => this.current()?.task.status === TaskStatus.IN_PROGRESS);
  /** Waiting besides the one the pill shows. */
  readonly othersCount = computed(() => Math.max(0, this.views().length - 1));
}

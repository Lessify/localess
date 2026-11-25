import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { UserStore } from '@core/stores/user.store';
import { isTaskExport, Task, TaskKind, TaskProgress, TaskStatus } from '@localess/shared';
import { TASK_KIND_LABELS } from '@shared/models/task.model';
import { saveAs } from 'file-saver-es';
import { catchError, EMPTY, filter, map, mergeMap, share, Subscription, take } from 'rxjs';

/**
 * Tells the user about the tasks they start: "<kind> started" when a screen creates one (`watch`; the screen's
 * `ll-active-tasks` shows its progress), then, wherever they are in the app, "<kind> finished" with Download (an export)
 * or View, or "<kind> failed" with View (its logs say why). Quiet about other users' tasks. Started once by the
 * features shell.
 *
 * Task events come on each space's own stream, so it listens to the selected space and to every space where a task the
 * user started here still runs, until it ends.
 */
/** The user's own tasks that have not ended, as the browser tab shows them. */
export interface ActiveTasksSummary {
  count: number;
  /** The first one's kind: "Translation Export". */
  label: string;
  /** The first one's progress, once the worker reported it. */
  percent?: number;
}

@Injectable({ providedIn: 'root' })
export class TaskNotifierService {
  private readonly events = inject(ChangeEventsService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly userStore = inject(UserStore);
  private readonly spaceStore = inject(SpaceStore);
  private readonly injector = inject(Injector);

  private listeningStarted = false;
  /** Told already, or not the user's: never read again. */
  private readonly done = new Set<string>();
  /** The space and kind of each task the user started here that has not ended. */
  private readonly running = signal<ReadonlyMap<string, { spaceId: string; kind: TaskKind }>>(new Map());
  /** The latest progress the worker published for those tasks. */
  private readonly progress = signal<ReadonlyMap<string, TaskProgress>>(new Map());
  private readonly spaceIds = computed(() => {
    const selected = this.spaceStore.selectedSpaceId();
    return new Set([...(selected ? [selected] : []), ...[...this.running().values()].map(it => it.spaceId)]);
  });

  /**
   * The tasks the user started here that have not ended, for the browser tab (TabActivityService): how many, the
   * first one's label and, once the worker reported it, its progress in percent.
   */
  readonly active = computed<ActiveTasksSummary | undefined>(() => {
    const [first] = this.running();
    if (!first) return undefined;
    const [id, { kind }] = first;
    const progress = this.progress().get(id);
    return {
      count: this.running().size,
      label: TASK_KIND_LABELS[kind],
      percent: progress?.total ? Math.round((progress.done / progress.total) * 100) : undefined,
    };
  });
  /** One subscription per space listened to. */
  private readonly listening = new Map<string, Subscription>();

  start(): void {
    if (this.listeningStarted) return;
    this.listeningStarted = true;
    effect(
      () => {
        const spaceIds = this.spaceIds();
        for (const [spaceId, subscription] of this.listening) {
          if (spaceIds.has(spaceId)) continue;
          subscription.unsubscribe();
          this.listening.delete(spaceId);
        }
        for (const spaceId of spaceIds) {
          if (!this.listening.has(spaceId)) this.listening.set(spaceId, this.listen(spaceId));
        }
      },
      { injector: this.injector },
    );
  }

  /** The user just started `task`: says so, and listens to its space until it ends (they may move to another one). */
  watch(spaceId: string, task: Pick<Task, 'id' | 'kind'>): void {
    this.notificationService.info(`${TASK_KIND_LABELS[task.kind]} started`);
    if (!this.done.has(task.id)) this.running.update(running => new Map(running).set(task.id, { spaceId, kind: task.kind }));
  }

  private listen(spaceId: string): Subscription {
    // One connection to the space's stream for both: the progress of the user's tasks, and their updates.
    const changes = this.events.changes(spaceId).pipe(share());
    const progress = changes
      .pipe(filter(event => event.entity === 'tasks' && event.op === 'progress' && !!event.id && !!event.progress))
      .subscribe(event => {
        if (this.running().has(event.id!)) this.progress.update(all => new Map(all).set(event.id!, event.progress!));
      });
    const updates = changes
      .pipe(
        filter(event => event.entity === 'tasks' && event.op === 'updated' && !!event.id && event.spaceId === spaceId),
        filter(event => !this.done.has(event.id!)),
        mergeMap(event =>
          this.taskService.findOne(spaceId, event.id!).pipe(
            take(1),
            catchError((error: unknown) => {
              // A kind the user may not read (404), or a task deleted meanwhile: not theirs to hear about.
              if (error instanceof HttpErrorResponse && error.status === 404) this.end(event.id!);
              return EMPTY;
            }),
          ),
        ),
        map(task => ({ spaceId, task })),
      )
      .subscribe(({ task }) => this.check(spaceId, task));
    updates.add(progress);
    return updates;
  }

  /** Never read again, and its space no longer listened to for it. */
  private end(taskId: string): void {
    this.done.add(taskId);
    if (!this.running().has(taskId)) return;
    this.running.update(running => {
      const next = new Map(running);
      next.delete(taskId);
      return next;
    });
    this.progress.update(all => {
      const next = new Map(all);
      next.delete(taskId);
      return next;
    });
  }

  private check(spaceId: string, task: Task): void {
    if (this.done.has(task.id)) return;
    if (task.createdBy?.id !== this.userStore.id()) {
      this.end(task.id);
      return;
    }
    if (task.status !== TaskStatus.FINISHED && task.status !== TaskStatus.ERROR) return;
    this.end(task.id);
    const label = TASK_KIND_LABELS[task.kind];
    const view = { type: 'route' as const, label: 'View', link: `/features/spaces/${spaceId}/tasks/${task.id}` };
    if (task.status === TaskStatus.ERROR) {
      this.notificationService.error(`${label} failed`, { action: view });
      return;
    }
    const file = task.file;
    if (isTaskExport(task) && file) {
      this.notificationService.success(`${label} finished`, {
        action: {
          type: 'action',
          label: 'Download',
          onClick: () => this.taskService.downloadUrl(spaceId, task.id).subscribe(url => saveAs(url, file.name)),
        },
      });
    } else {
      this.notificationService.success(`${label} finished`, { action: view });
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { SpaceStore } from '@core/stores/space.store';
import { UserStore } from '@core/stores/user.store';
import { isTaskExport, Task, TaskStatus } from '@localess/shared';
import { TASK_KIND_LABELS } from '@shared/models/task.model';
import { saveAs } from 'file-saver-es';
import { catchError, EMPTY, filter, map, mergeMap, Subscription, take } from 'rxjs';

/**
 * Tells the user when a task they started ends, wherever they are in the app: "<kind> finished" with Download (an
 * export) or View, or "<kind> failed". Quiet about a task an open progress dialog follows (`follow` / `unfollow`), and
 * about other users' tasks. Started once by the features shell.
 *
 * Task events come on each space's own stream, so it listens to the selected space and to every space where a task the
 * user started here (a progress dialog followed it) still runs, until it ends.
 */
@Injectable({ providedIn: 'root' })
export class TaskNotifierService {
  private readonly events = inject(ChangeEventsService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly userStore = inject(UserStore);
  private readonly spaceStore = inject(SpaceStore);
  private readonly injector = inject(Injector);

  private started = false;
  /** Followed by an open progress dialog: it tells the end itself. */
  private readonly followed = new Set<string>();
  /** Told already, or not the user's: never read again. */
  private readonly done = new Set<string>();
  /** The space of each task the user started here that has not ended. */
  private readonly running = signal<ReadonlyMap<string, string>>(new Map());
  private readonly spaceIds = computed(() => {
    const selected = this.spaceStore.selectedSpaceId();
    return new Set([...(selected ? [selected] : []), ...this.running().values()]);
  });
  /** One subscription per space listened to. */
  private readonly listening = new Map<string, Subscription>();

  start(): void {
    if (this.started) return;
    this.started = true;
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

  /** A progress dialog opened on a task the user started: its space stays listened to until the task ends. */
  follow(spaceId: string, taskId: string): void {
    this.followed.add(taskId);
    if (!this.done.has(taskId)) this.running.update(running => new Map(running).set(taskId, spaceId));
  }

  unfollow(taskId: string): void {
    this.followed.delete(taskId);
  }

  private listen(spaceId: string): Subscription {
    return this.events
      .changes(spaceId)
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
  }

  private check(spaceId: string, task: Task): void {
    if (this.done.has(task.id)) return;
    if (task.createdBy?.id !== this.userStore.id()) {
      this.end(task.id);
      return;
    }
    if (task.status !== TaskStatus.FINISHED && task.status !== TaskStatus.ERROR) return;
    this.end(task.id);
    // An open progress dialog tells the end itself.
    if (this.followed.has(task.id)) return;
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

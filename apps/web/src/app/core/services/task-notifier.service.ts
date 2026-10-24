import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { NotificationService } from '@core/services/notification.service';
import { TaskService } from '@core/services/task.service';
import { UserStore } from '@core/stores/user.store';
import { isTaskExport, Task, TaskStatus } from '@localess/shared';
import { TASK_KIND_LABELS } from '@shared/models/task.model';
import { saveAs } from 'file-saver-es';
import { catchError, EMPTY, filter, map, mergeMap, take } from 'rxjs';

/**
 * Tells the user when a task they started ends, wherever they are in the app: "<kind> finished" with Download (an
 * export) or View, or "<kind> failed". Quiet about a task an open progress dialog follows (`follow` / `unfollow`), and
 * about other users' tasks. Started once by the features shell.
 */
@Injectable({ providedIn: 'root' })
export class TaskNotifierService {
  private readonly events = inject(ChangeEventsService);
  private readonly taskService = inject(TaskService);
  private readonly notificationService = inject(NotificationService);
  private readonly userStore = inject(UserStore);

  private started = false;
  /** Followed by an open progress dialog: it tells the end itself. */
  private readonly followed = new Set<string>();
  /** Told already, or not the user's: never read again. */
  private readonly done = new Set<string>();

  start(): void {
    if (this.started) return;
    this.started = true;
    this.events
      .changes()
      .pipe(
        filter(event => event.entity === 'tasks' && event.op === 'updated' && !!event.id && !!event.spaceId),
        filter(event => !this.done.has(event.id!) && !this.followed.has(event.id!)),
        mergeMap(event =>
          this.taskService.findOne(event.spaceId!, event.id!).pipe(
            take(1),
            map(task => ({ spaceId: event.spaceId!, task })),
            catchError((error: unknown) => {
              // A kind the user may not read (404), or a task deleted meanwhile: not theirs to hear about.
              if (error instanceof HttpErrorResponse && error.status === 404) this.done.add(event.id!);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe(({ spaceId, task }) => this.check(spaceId, task));
  }

  follow(taskId: string): void {
    this.followed.add(taskId);
  }

  unfollow(taskId: string): void {
    this.followed.delete(taskId);
  }

  private check(spaceId: string, task: Task): void {
    if (this.done.has(task.id) || this.followed.has(task.id)) return;
    if (task.createdBy?.id !== this.userStore.id()) {
      this.done.add(task.id);
      return;
    }
    if (task.status !== TaskStatus.FINISHED && task.status !== TaskStatus.ERROR) return;
    this.done.add(task.id);
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

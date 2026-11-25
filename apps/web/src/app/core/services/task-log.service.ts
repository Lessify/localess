import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ChangeEventsService } from '@core/api/change-events.service';
import { liveQueryWith } from '@core/api/live-query';
import { TaskLog } from '@localess/shared';
import { Observable } from 'rxjs';

/** The logs of a task (`/api/app/spaces/:spaceId/tasks/:taskId/logs`, the server's `TaskLogController`); reads are live. */
@Injectable({ providedIn: 'root' })
export class TaskLogService {
  private readonly http = inject(HttpClient);
  private readonly events = inject(ChangeEventsService);

  /** Refetched on log events of this task only. */
  findAll(spaceId: string, taskId: string): Observable<TaskLog[]> {
    return liveQueryWith(this.events, { spaceId, entities: ['task_logs'], id: taskId }, () =>
      this.http.get<TaskLog[]>(`/api/app/spaces/${spaceId}/tasks/${taskId}/logs`),
    );
  }
}

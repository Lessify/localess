import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { taskLogs } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import type { TaskLogEntity } from '../../../shared/entities/task-log.entity.js';

/** The steps of a task (`task_logs`); they cascade with it. Every write publishes a `task_logs` event. */
@Injectable()
export class TaskLogRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** In the order they were written. */
  findAll(taskId: string): Promise<TaskLogEntity[]> {
    return this.db.query.taskLogs.findMany({ where: eq(taskLogs.taskId, taskId), orderBy: [asc(taskLogs.createdAt), asc(taskLogs.id)] });
  }

  create(
    task: Pick<TaskEntity, 'spaceId' | 'id' | 'kind'>,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    trace?: string,
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(taskLogs).values({ id: newUuid(), taskId: task.id, level, message, trace });
      await this.eventService.publish({ spaceId: task.spaceId, entity: 'task_logs', id: task.id, op: 'created', kind: task.kind }, t);
    });
  }

  /** Several lines at once (a refused import's problems), in one insert and one event; in the order given. */
  createMany(
    task: Pick<TaskEntity, 'spaceId' | 'id' | 'kind'>,
    lines: { level: 'INFO' | 'WARN' | 'ERROR'; message: string; trace?: string }[],
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      if (!lines.length) return;
      // On the database's clock, as every other line (`now()`), one microsecond apart: they read back in the order given,
      // and a line written after them sorts after them.
      await t.insert(taskLogs).values(
        lines.map((line, index) => ({
          id: newUuid(),
          taskId: task.id,
          ...line,
          createdAt: sql`now() + ${index} * interval '1 microsecond'`,
        })),
      );
      await this.eventService.publish({ spaceId: task.spaceId, entity: 'task_logs', id: task.id, op: 'created', kind: task.kind }, t);
    });
  }
}

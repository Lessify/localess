import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { taskLogs } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TaskEntity } from './task.repository.js';

export type TaskLogEntity = typeof taskLogs.$inferSelect;

/** The steps of a task (`task_logs`); they cascade with it. Every write publishes a `task_logs` event. */
@Injectable()
export class TaskLogRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  /** In the order they were written. */
  findAll(taskId: string): Promise<TaskLogEntity[]> {
    return this.db.select().from(taskLogs).where(eq(taskLogs.taskId, taskId)).orderBy(asc(taskLogs.createdAt), asc(taskLogs.id));
  }

  create(
    task: Pick<TaskEntity, 'spaceId' | 'id'>,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    trace?: string,
    tx?: Transaction,
  ): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(taskLogs).values({ id: newUuid(), taskId: task.id, level, message, trace });
      await this.events.publish({ spaceId: task.spaceId, entity: 'task_logs', id: task.id, op: 'created' }, t);
    });
  }
}

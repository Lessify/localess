import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { tasks } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import type { TaskPageable } from '../models/task.models.js';
import type { TaskOutcome } from '../utils/task.utils.js';

export type TaskEntity = typeof tasks.$inferSelect;
export type NewTask = Omit<typeof tasks.$inferInsert, 'spaceId' | 'status'>;

/**
 * The `tasks` rows (the queue) and their `task_logs`. Every write publishes its `tasks` / `task_logs` change event in
 * its transaction. Claiming is atomic with `FOR UPDATE SKIP LOCKED`, so with several instances each task runs once.
 */
@Injectable()
export class TaskRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  /** One page of the space's tasks by creation time (then the id, so ties page stably), and how many match. */
  async findPage(spaceId: string, query: TaskPageable): Promise<{ rows: TaskEntity[]; total: number }> {
    const conditions: SQL[] = [eq(tasks.spaceId, spaceId)];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(sql`${tasks.id}::text`, pattern), ilike(sql`${tasks.file}->>'name'`, pattern), ilike(tasks.message, pattern)) as SQL);
    }
    if (query.kind) conditions.push(inArray(tasks.kind, query.kind));
    if (query.status) conditions.push(inArray(tasks.status, query.status));
    const where = and(...conditions);
    const order = query.direction === 'desc' ? desc : asc;
    const rows = await this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(order(tasks.createdAt), order(tasks.id))
      .limit(query.size)
      .offset(offsetOf(query));
    const [{ total }] = await this.db.select({ total: count() }).from(tasks).where(where);
    return { rows, total };
  }

  async findById(spaceId: string, id: string): Promise<TaskEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.spaceId, spaceId), eq(tasks.id, id)));
    return row;
  }

  /** A new INITIATED task, for the worker to pick up; the space checked first (404 when gone). */
  create(spaceId: string, values: NewTask, tx?: Transaction): Promise<TaskEntity> {
    return transaction(this.db, tx, async t => {
      await requireSpace(t, spaceId);
      const [row] = await t
        .insert(tasks)
        .values({ ...values, spaceId, status: 'INITIATED' })
        .returning();
      await this.events.publish({ spaceId, entity: 'tasks', id: row.id, op: 'created' }, t);
      return row;
    });
  }

  /** Logs cascade. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(tasks).where(and(eq(tasks.spaceId, spaceId), eq(tasks.id, id)));
      await this.events.publish({ spaceId, entity: 'tasks', id, op: 'deleted' }, t);
    });
  }

  /** Takes the oldest INITIATED task no one else holds, marking it IN_PROGRESS for `workerId`. */
  claim(workerId: string, tx?: Transaction): Promise<TaskEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const { rows } = (await t.execute(sql`
        update ${tasks} set status = 'IN_PROGRESS', locked_by = ${workerId}, locked_at = now(), updated_at = now()
        where id = (
          select id from ${tasks} where status = 'INITIATED' order by created_at, id for update skip locked limit 1
        )
        returning id`)) as unknown as { rows: { id: string }[] };
      if (!rows.length) return undefined;
      const [task] = await t.select().from(tasks).where(eq(tasks.id, rows[0].id));
      if (task) await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
      return task;
    });
  }

  /**
   * Writes the outcome onto a task `workerId` still holds and releases it. Answers false when the row is gone (deleted
   * meanwhile) or no longer held.
   */
  finish(task: Pick<TaskEntity, 'spaceId' | 'id'>, workerId: string, outcome: TaskOutcome, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const updated = await t
        .update(tasks)
        .set({
          status: outcome.status,
          message: outcome.message ?? null,
          trace: outcome.trace ?? null,
          ...(outcome.file ? { file: outcome.file } : {}),
          lockedBy: null,
          lockedAt: null,
        })
        .where(and(eq(tasks.id, task.id), eq(tasks.lockedBy, workerId)))
        .returning({ id: tasks.id });
      if (updated.length) await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
      return updated.length > 0;
    });
  }

  /** Marks every task IN_PROGRESS since before `lockedBefore` as ERROR with `message`; answers them. */
  failStale(lockedBefore: Date, message: string, tx?: Transaction): Promise<{ id: string; spaceId: string }[]> {
    return transaction(this.db, tx, async t => {
      const stale = await t
        .update(tasks)
        .set({ status: 'ERROR', message, lockedBy: null, lockedAt: null })
        .where(and(eq(tasks.status, 'IN_PROGRESS'), lt(tasks.lockedAt, lockedBefore)))
        .returning({ id: tasks.id, spaceId: tasks.spaceId });
      for (const task of stale) await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
      return stale;
    });
  }
}

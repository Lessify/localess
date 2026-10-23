import type { TaskPageable } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, lt, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { tasks } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TaskEntity, TaskInsertEntity } from '../../../shared/entities/task.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import type { TaskOutcome } from '../utils/task.utils.js';

/** A task as the service creates it: its id chosen first (an import stores its file under it). */
export type NewTask = Omit<TaskInsertEntity, 'id' | 'spaceId' | 'status'> & { id: string };

/**
 * The `tasks` rows (the queue). Every write publishes its `tasks` change event in its transaction. The worker's queue
 * operations (`claim`, `finish`, `failStale`) answer what they took or released: claiming is atomic with
 * `FOR UPDATE SKIP LOCKED`, so with several instances each task runs once.
 */
@Injectable()
export class TaskRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** One page of the space's tasks by creation time (then the id, so ties page stably). */
  findAll(spaceId: string, query: TaskPageable): Promise<TaskEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    return this.db.query.tasks.findMany({
      where: this.where(spaceId, query),
      orderBy: [order(tasks.createdAt), order(tasks.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the space's tasks match the query's filters and search. */
  findAllCount(spaceId: string, query: TaskPageable): Promise<number> {
    return this.db.$count(tasks, this.where(spaceId, query));
  }

  findOne(spaceId: string, id: string): Promise<TaskEntity | undefined> {
    return this.db.query.tasks.findFirst({ where: this.byId(spaceId, id) });
  }

  async exists(spaceId: string, id: string): Promise<boolean> {
    return (await this.db.$count(tasks, this.byId(spaceId, id))) > 0;
  }

  /** A new INITIATED task, for the worker to pick up; the space is checked by the service. */
  create(spaceId: string, values: NewTask, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(tasks).values({ ...values, spaceId, status: 'INITIATED' });
      await this.eventService.publish({ spaceId, entity: 'tasks', id: values.id, op: 'created' }, t);
    });
  }

  /** Logs cascade. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(tasks).where(this.byId(spaceId, id));
      await this.eventService.publish({ spaceId, entity: 'tasks', id, op: 'deleted' }, t);
    });
  }

  /** Takes the oldest INITIATED task no one else holds, marking it IN_PROGRESS for `workerId`. */
  claim(workerId: string, tx?: Transaction): Promise<TaskEntity | undefined> {
    return transaction(this.db, tx, async t => {
      // The relational API has no lock: `for update skip locked` in a raw update.
      const { rows } = (await t.execute(sql`
        update ${tasks} set status = 'IN_PROGRESS', locked_by = ${workerId}, locked_at = now(), updated_at = now()
        where id = (
          select id from ${tasks} where status = 'INITIATED' order by created_at, id for update skip locked limit 1
        )
        returning id`)) as unknown as { rows: { id: string }[] };
      if (!rows.length) return undefined;
      const task = await t.query.tasks.findFirst({ where: eq(tasks.id, rows[0].id) });
      if (task) await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
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
      if (updated.length) await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
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
      for (const task of stale) await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' }, t);
      return stale;
    });
  }

  private byId(spaceId: string, id: string): SQL | undefined {
    return and(eq(tasks.spaceId, spaceId), eq(tasks.id, id));
  }

  /** The space's tasks matching the query's search (id, file name, message), kinds and statuses. */
  private where(spaceId: string, query: TaskPageable): SQL | undefined {
    const conditions: SQL[] = [eq(tasks.spaceId, spaceId)];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(
        or(ilike(sql`${tasks.id}::text`, pattern), ilike(sql`${tasks.file}->>'name'`, pattern), ilike(tasks.message, pattern)) as SQL,
      );
    }
    if (query.kind) conditions.push(inArray(tasks.kind, query.kind));
    if (query.status) conditions.push(inArray(tasks.status, query.status));
    return and(...conditions);
  }
}

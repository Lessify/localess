import type { TaskKind, TaskPageable } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, lt, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { tasks } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TaskEntity, TaskInsertEntity, TaskSelect } from '../../../shared/entities/task.entity.js';
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

  /** One page of the space's tasks of `kinds`, by creation time (then the id, so ties page stably), with who started each. */
  findAll(spaceId: string, kinds: TaskKind[], query: TaskPageable): Promise<TaskSelect[]> {
    const order = query.direction === 'desc' ? desc : asc;
    return this.db.query.tasks.findMany({
      where: this.where(spaceId, kinds, query),
      with: { createdBy: true },
      orderBy: [order(tasks.createdAt), order(tasks.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the space's tasks of `kinds` match the query's filters and search. */
  findAllCount(spaceId: string, kinds: TaskKind[], query: TaskPageable): Promise<number> {
    return this.db.$count(tasks, this.where(spaceId, kinds, query));
  }

  /** The task when it is one of `kinds`, with who started it. */
  findOne(spaceId: string, id: string, kinds: TaskKind[]): Promise<TaskSelect | undefined> {
    return this.db.query.tasks.findFirst({ where: and(this.byId(spaceId, id), inArray(tasks.kind, kinds)), with: { createdBy: true } });
  }

  /** A new QUEUED task, for the worker to pick up; the space is checked by the service. */
  create(spaceId: string, values: NewTask, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.insert(tasks).values({ ...values, spaceId, status: 'QUEUED' });
      await this.eventService.publish({ spaceId, entity: 'tasks', id: values.id, op: 'created', kind: values.kind }, t);
    });
  }

  /**
   * Logs cascade. Only a task that has ended (not queued or running: its space's slot stays taken until it ends);
   * answers false when it had not.
   */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const deleted = await t
        .delete(tasks)
        .where(and(this.byId(spaceId, id), inArray(tasks.status, ['FINISHED', 'ERROR'])))
        .returning({ id: tasks.id, kind: tasks.kind });
      if (deleted.length) await this.eventService.publish({ spaceId, entity: 'tasks', id, op: 'deleted', kind: deleted[0].kind }, t);
      return deleted.length > 0;
    });
  }

  /**
   * Takes the oldest QUEUED task no one else holds, of a space with no task in progress, marking it IN_PROGRESS for
   * `workerId`. Answers nothing when another instance took the space's slot at the same moment (the partial unique
   * index `tasks_running_space_idx` refuses the second).
   */
  async claim(workerId: string, tx?: Transaction): Promise<TaskEntity | undefined> {
    try {
      return await this.claimNext(workerId, tx);
    } catch (error) {
      // The claim's only unique constraint: the space's running slot.
      if (isUniqueViolation(error)) return undefined;
      throw error;
    }
  }

  private claimNext(workerId: string, tx?: Transaction): Promise<TaskEntity | undefined> {
    return transaction(this.db, tx, async t => {
      // The relational API has no lock: `for update skip locked` in a raw update.
      const { rows } = (await t.execute(sql`
        update ${tasks} set status = 'IN_PROGRESS', locked_by = ${workerId}, heartbeat_at = now(), started_at = now(), updated_at = now()
        where id = (
          select q.id from ${tasks} q
          where q.status = 'QUEUED'
            and not exists (select 1 from ${tasks} r where r.space_id = q.space_id and r.status = 'IN_PROGRESS')
          order by q.created_at, q.id for update skip locked limit 1
        )
        returning id`)) as unknown as { rows: { id: string }[] };
      if (!rows.length) return undefined;
      const task = await t.query.tasks.findFirst({ where: eq(tasks.id, rows[0].id) });
      if (task) await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated', kind: task.kind }, t);
      return task;
    });
  }

  /**
   * Writes the outcome onto a task `workerId` still holds, ends it (`finished_at`) and releases it. Answers false when the
   * row is gone (deleted meanwhile) or no longer held.
   */
  finish(task: Pick<TaskEntity, 'spaceId' | 'id' | 'kind'>, workerId: string, outcome: TaskOutcome, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const updated = await t
        .update(tasks)
        .set({
          status: outcome.status,
          ...(outcome.file ? { file: outcome.file } : {}),
          finishedAt: sql`now()`,
          lockedBy: null,
          heartbeatAt: null,
        })
        .where(and(eq(tasks.id, task.id), eq(tasks.lockedBy, workerId)))
        .returning({ id: tasks.id });
      if (updated.length) {
        await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated', kind: task.kind }, t);
      }
      return updated.length > 0;
    });
  }

  /** The instance `workerId` is alive: its running tasks' heartbeats are fresh again (`failStale` leaves them alone). */
  async heartbeat(workerId: string): Promise<void> {
    await this.db
      .update(tasks)
      .set({ heartbeatAt: sql`now()` })
      .where(and(eq(tasks.lockedBy, workerId), eq(tasks.status, 'IN_PROGRESS')));
  }

  /** Ends as ERROR every task IN_PROGRESS whose heartbeat is older than `heartbeatBefore` (its instance stopped); answers them. */
  failStale(heartbeatBefore: Date, tx?: Transaction): Promise<Pick<TaskEntity, 'id' | 'spaceId' | 'kind'>[]> {
    return transaction(this.db, tx, async t => {
      const stale = await t
        .update(tasks)
        .set({ status: 'ERROR', finishedAt: sql`now()`, lockedBy: null, heartbeatAt: null })
        .where(and(eq(tasks.status, 'IN_PROGRESS'), lt(tasks.heartbeatAt, heartbeatBefore)))
        .returning({ id: tasks.id, spaceId: tasks.spaceId, kind: tasks.kind });
      for (const task of stale) {
        await this.eventService.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated', kind: task.kind }, t);
      }
      return stale;
    });
  }

  private byId(spaceId: string, id: string): SQL | undefined {
    return and(eq(tasks.spaceId, spaceId), eq(tasks.id, id));
  }

  /** The space's tasks of `kinds` matching the query's search (id, file name), kinds and statuses. */
  private where(spaceId: string, kinds: TaskKind[], query: TaskPageable): SQL | undefined {
    const conditions: SQL[] = [eq(tasks.spaceId, spaceId), inArray(tasks.kind, kinds)];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(sql`${tasks.id}::text`, pattern), ilike(sql`${tasks.file}->>'name'`, pattern)) as SQL);
    }
    if (query.kind) conditions.push(inArray(tasks.kind, query.kind));
    if (query.status) conditions.push(inArray(tasks.status, query.status));
    return and(...conditions);
  }
}

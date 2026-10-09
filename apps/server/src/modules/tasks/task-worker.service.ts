import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { and, eq, lt, sql } from 'drizzle-orm';
import { filter, Subscription } from 'rxjs';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { tasks } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { TaskOutcome, TaskRow, TaskRunner } from './task-runner.service.js';

const POLL_INTERVAL_MS = 30_000;
/** A task still IN_PROGRESS after this long was interrupted (crash, deploy); nothing runs this long. */
export const STALE_AFTER_MS = 60 * 60_000;

/**
 * Runs export/import tasks (was the `task-oncreate` Firestore trigger). A task row is the queue item:
 * claimed atomically with `FOR UPDATE SKIP LOCKED`, so with several instances each task runs exactly
 * once. Woken by `tasks` change events, with a poll as fallback. One task at a time per instance.
 */
@Injectable()
export class TaskWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TaskWorker.name);
  readonly workerId = `${hostname()}-${process.pid}-${randomBytes(3).toString('hex')}`;
  private subscription?: Subscription;
  private timer?: NodeJS.Timeout;
  private draining?: Promise<void>;
  private wakeAgain = false;
  private stopped = false;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly runner: TaskRunner,
    private readonly events: EventsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.taskWorker) return;
    await this.failStale();
    this.subscription = this.events
      .stream()
      .pipe(filter(event => event.entity === 'tasks' && event.op === 'created'))
      .subscribe(() => this.wake());
    this.timer = setInterval(() => {
      void this.failStale().catch(error => this.logger.error(error));
      this.wake();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
    this.wake();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    this.subscription?.unsubscribe();
    if (this.timer) clearInterval(this.timer);
    await this.draining;
  }

  /** Resolves once the queue is empty (tests). */
  async whenIdle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  /** Starts draining the queue, or asks the running drain to look again when it's done. */
  wake(): void {
    if (this.stopped) return;
    if (this.draining) {
      this.wakeAgain = true;
      return;
    }
    this.draining = this.drain()
      .catch(error => this.logger.error(`Task queue failed: ${error}`))
      .finally(() => {
        this.draining = undefined;
        if (this.wakeAgain && !this.stopped) {
          this.wakeAgain = false;
          this.wake();
        }
      });
  }

  private async drain(): Promise<void> {
    for (let task = await this.claim(); task && !this.stopped; task = await this.claim()) {
      await this.process(task);
    }
  }

  /** Takes the oldest INITIATED task no one else holds, marking it IN_PROGRESS for this worker. */
  async claim(): Promise<TaskRow | undefined> {
    const { rows } = (await this.db.execute(sql`
      update ${tasks} set status = 'IN_PROGRESS', locked_by = ${this.workerId}, locked_at = now(), updated_at = now()
      where id = (
        select id from ${tasks} where status = 'INITIATED' order by created_at, id for update skip locked limit 1
      )
      returning id`)) as unknown as { rows: { id: string }[] };
    if (!rows.length) return undefined;
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, rows[0].id));
    if (task) await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' });
    return task;
  }

  private async process(task: TaskRow): Promise<void> {
    let outcome: TaskOutcome;
    await this.runner.log(task, 'INFO', `Starting ${task.kind} processing`);
    try {
      outcome = await this.runner.run(task);
      if (outcome.status === 'FINISHED') await this.runner.log(task, 'INFO', 'Task finished successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      outcome = { status: 'ERROR', message: err.message, trace: err.stack };
      await this.runner.log(task, 'ERROR', err.message, err.stack);
    }
    // The row may have been deleted meanwhile; then there is nothing to report.
    const updated = await this.db
      .update(tasks)
      .set({
        status: outcome.status,
        message: outcome.message ?? null,
        trace: outcome.trace ?? null,
        ...(outcome.file ? { file: outcome.file } : {}),
        lockedBy: null,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, task.id), eq(tasks.lockedBy, this.workerId)))
      .returning({ id: tasks.id });
    if (updated.length) await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' });
  }

  /**
   * Marks tasks interrupted mid-run as failed. Not re-run on purpose: an import may have been half
   * applied, and running it again is the user's call.
   */
  async failStale(): Promise<void> {
    const stale = await this.db
      .update(tasks)
      .set({
        status: 'ERROR',
        message: 'The task was interrupted (the server stopped while it ran). Run it again.',
        lockedBy: null,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.status, 'IN_PROGRESS'), lt(tasks.lockedAt, new Date(Date.now() - STALE_AFTER_MS))))
      .returning({ id: tasks.id, spaceId: tasks.spaceId });
    for (const task of stale) {
      this.logger.warn(`Task ${task.id} was interrupted and marked as failed`);
      await this.events.publish({ spaceId: task.spaceId, entity: 'tasks', id: task.id, op: 'updated' });
    }
  }
}

import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';

import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { filter, Subscription } from 'rxjs';

import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { TaskLogService } from '../services/task-log.service.js';
import type { TaskOutcome } from '../utils/task.utils.js';
import { TaskProgressReporter } from '../utils/task-progress.js';
import { TaskRunner } from './task-runner.service.js';

const POLL_INTERVAL_MS = 30_000;
/** How often a busy instance refreshes its running tasks' locks. */
const HEARTBEAT_MS = 60_000;
/**
 * A task IN_PROGRESS whose lock was not refreshed for this long was interrupted (its instance crashed or stopped): a
 * live instance beats every minute, so its space is freed within minutes, not held for an hour.
 */
export const STALE_AFTER_MS = 5 * 60_000;

/**
 * Runs export/import tasks (was the `task-oncreate` Firestore trigger). A task row is the queue item:
 * claimed atomically with `FOR UPDATE SKIP LOCKED`, so with several instances each task runs exactly
 * once. Woken by `tasks` change events, with a poll as fallback. Up to `LOCALESS_TASK_CONCURRENCY` tasks at once per
 * instance (one slot each), never two of one space (the claim skips a space with a task in progress).
 */
@Injectable()
export class TaskWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TaskWorker.name);
  readonly workerId = `${hostname()}-${process.pid}-${randomBytes(3).toString('hex')}`;
  private subscription?: Subscription;
  private timer?: NodeJS.Timeout;
  private heartbeat?: NodeJS.Timeout;
  /** The busy slots: each claims and runs tasks until the queue has nothing for it. */
  private readonly slots = new Set<Promise<void>>();
  /** Set by `wake()`: a slot that found nothing looks once more before it stops. */
  private wakeAgain = false;
  private stopped = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly taskRepository: TaskRepository,
    private readonly taskRunner: TaskRunner,
    private readonly taskLogService: TaskLogService,
    private readonly eventService: EventService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.taskWorker) return;
    await this.failStale();
    this.subscription = this.eventService
      .stream()
      .pipe(filter(event => event.entity === 'tasks' && event.op === 'created'))
      .subscribe(() => this.wake());
    this.timer = setInterval(() => {
      void this.failStale().catch(error => this.logger.error(error));
      this.wake();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
    this.heartbeat = setInterval(() => {
      if (this.slots.size) void this.taskRepository.heartbeat(this.workerId).catch(error => this.logger.error(error));
    }, HEARTBEAT_MS);
    this.heartbeat.unref();
    this.wake();
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    this.subscription?.unsubscribe();
    if (this.timer) clearInterval(this.timer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    await Promise.all(this.slots);
  }

  /** Resolves once the queue is empty (tests). */
  async whenIdle(): Promise<void> {
    while (this.slots.size) await Promise.all(this.slots);
  }

  /** Fills the free slots; busy ones look again before they stop. */
  wake(): void {
    if (this.stopped) return;
    this.wakeAgain = true;
    while (this.slots.size < this.config.taskConcurrency) {
      const slot: Promise<void> = this.drain()
        .catch(error => this.logger.error(`Task queue failed: ${error}`))
        .finally(() => this.slots.delete(slot));
      this.slots.add(slot);
    }
  }

  private async drain(): Promise<void> {
    while (!this.stopped) {
      this.wakeAgain = false;
      const task = await this.claim();
      if (task) await this.process(task);
      else if (!this.wakeAgain) return;
    }
  }

  /** Takes the oldest QUEUED task no one else holds, marking it IN_PROGRESS for this worker. */
  claim(): Promise<TaskEntity | undefined> {
    return this.taskRepository.claim(this.workerId);
  }

  private async process(task: TaskEntity): Promise<void> {
    let outcome: TaskOutcome;
    await this.taskLogService.log(task, 'INFO', `Starting ${task.kind} processing`);
    try {
      // Live state, not a column: published for the open dialogs and lists, at most once a second.
      const progress = new TaskProgressReporter(value =>
        this.eventService.publish({
          spaceId: task.spaceId,
          entity: 'tasks',
          id: task.id,
          op: 'progress',
          kind: task.kind,
          progress: value,
        }),
      );
      outcome = await this.taskRunner.run(task, progress);
      if (outcome.status === 'FINISHED') await this.taskLogService.log(task, 'INFO', 'Task finished successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      outcome = { status: 'ERROR' };
      await this.taskLogService.log(task, 'ERROR', err.message, err.stack);
    }
    // The row may have been deleted meanwhile; then there is nothing to report.
    await this.taskRepository.finish(task, this.workerId, outcome);
  }

  /**
   * Marks tasks interrupted mid-run as failed. Not re-run on purpose: an import may have been half
   * applied, and running it again is the user's call.
   */
  async failStale(): Promise<void> {
    const stale = await this.taskRepository.failStale(new Date(Date.now() - STALE_AFTER_MS));
    for (const task of stale) {
      this.logger.warn(`Task ${task.id} was interrupted and marked as failed`);
      await this.taskLogService.log(task, 'ERROR', 'Interrupted: the server running it stopped');
    }
  }
}

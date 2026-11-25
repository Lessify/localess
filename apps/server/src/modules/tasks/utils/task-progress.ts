import type { TaskProgress } from '@localess/shared';

/**
 * A running task's progress, written through `write` at most once per `intervalMs` (each write is a change event, not
 * stored: `TaskProgressService` keeps the last one in memory): a new step is written at once, and `flush()` writes the
 * last value if it was held back.
 */
export class TaskProgressReporter {
  private lastWriteAt?: number;
  private lastStep?: string;
  private pending?: TaskProgress;

  constructor(
    private readonly write: (progress: TaskProgress) => Promise<void>,
    private readonly now: () => number = Date.now,
    private readonly intervalMs = 1000,
  ) {}

  async report(step: string, done: number, total?: number): Promise<void> {
    const progress: TaskProgress = total === undefined ? { step, done } : { step, done, total };
    const due = this.lastWriteAt === undefined || this.now() - this.lastWriteAt >= this.intervalMs;
    if (step !== this.lastStep || due) await this.send(progress);
    else this.pending = progress;
  }

  async flush(): Promise<void> {
    if (this.pending) await this.send(this.pending);
  }

  private async send(progress: TaskProgress): Promise<void> {
    this.pending = undefined;
    this.lastStep = progress.step;
    this.lastWriteAt = this.now();
    await this.write(progress);
  }
}

/** A reporter that writes nothing (jobs run outside the worker, tests). */
export const noProgress = (): TaskProgressReporter => new TaskProgressReporter(async () => {});

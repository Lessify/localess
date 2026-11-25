import type { TaskProgress } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { TaskProgressReporter } from './task-progress.js';

describe('TaskProgressReporter', () => {
  it('writes at most once a second, a new step at once, the last value on flush', async () => {
    let clock = 0;
    const writes: TaskProgress[] = [];
    const reporter = new TaskProgressReporter(
      async progress => {
        writes.push(progress);
      },
      () => clock,
    );
    await reporter.report('Writing', 1, 10);
    await reporter.report('Writing', 2, 10);
    clock = 1000;
    await reporter.report('Writing', 3, 10);
    await reporter.report('Checking', 0, 10);
    await reporter.report('Checking', 5, 10);
    await reporter.flush();
    expect(writes).toEqual([
      { step: 'Writing', done: 1, total: 10 },
      { step: 'Writing', done: 3, total: 10 },
      { step: 'Checking', done: 0, total: 10 },
      { step: 'Checking', done: 5, total: 10 },
    ]);
  });

  it('leaves total out while unknown, and flush writes nothing when all was written', async () => {
    const writes: TaskProgress[] = [];
    const reporter = new TaskProgressReporter(
      async progress => {
        writes.push(progress);
      },
      () => 0,
    );
    await reporter.report('Reading file', 0);
    await reporter.flush();
    expect(writes).toEqual([{ step: 'Reading file', done: 0 }]);
  });
});

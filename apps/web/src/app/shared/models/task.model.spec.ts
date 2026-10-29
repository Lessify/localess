import { TaskKind } from '@localess/shared';

import { formatDuration, formatTaskParams, formatTaskProgress, TASK_KIND_LABELS, taskDurations } from './task.model';

describe('task model', () => {
  it('names every kind', () => {
    expect(TASK_KIND_LABELS[TaskKind.TRANSLATION_TRANSLATE]).toBe('Translate Locale');
    expect(Object.keys(TASK_KIND_LABELS)).toHaveLength(Object.keys(TaskKind).length);
  });

  it('formats a duration in s, min and h', () => {
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(40_400)).toBe('40 s');
    expect(formatDuration(130_000)).toBe('2 min 10 s');
    expect(formatDuration(3_720_000)).toBe('1 h 2 min');
  });

  it('tells how long a task waited and ran, as far as it got', () => {
    const at = (s: number) => new Date(Date.UTC(2026, 9, 24, 10, 0, s)).toISOString();
    expect(taskDurations({ createdAt: at(0), startedAt: at(40), finishedAt: at(170) })).toEqual({ waited: '40 s', ran: '2 min 10 s' });
    expect(taskDurations({ createdAt: at(0) })).toEqual({});
  });

  it('formats progress with or without a total', () => {
    expect(formatTaskProgress({ step: 'Writing', done: 4200, total: 10000 })).toBe('Writing 4,200 / 10,000');
    expect(formatTaskProgress({ step: 'Reading file', done: 0 })).toBe('Reading file');
  });

  it('tells the input of a task by its params type', () => {
    expect(formatTaskParams({ type: 'translation-full' })).toBe('Localess file (all locales)');
    expect(formatTaskParams({ type: 'translation-json-flat', locale: 'de' })).toBe('Locale de (key-value JSON)');
    expect(formatTaskParams({ type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: true })).toBe(
      'en → de (overwrite)',
    );
    expect(formatTaskParams(undefined)).toBeUndefined();
  });
});

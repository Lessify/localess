import { TaskKind, TaskParams, TaskProgress } from '@localess/shared';

/** What each kind of task is called in the UI (the Tasks page, the progress dialog, the notifications). */
export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  [TaskKind.ASSET_REGEN_METADATA]: 'Regenerate Asset Metadata',
  [TaskKind.SCHEMA_EXPORT]: 'Schema Export',
  [TaskKind.SCHEMA_IMPORT]: 'Schema Import',
  [TaskKind.TRANSLATION_EXPORT]: 'Translation Export',
  [TaskKind.TRANSLATION_IMPORT]: 'Translation Import',
  [TaskKind.TRANSLATION_TRANSLATE]: 'Translate Locale',
};

const count = (value: number): string => value.toLocaleString('en-US');

/** "Writing 4,200 / 10,000", or the step alone while the total is unknown. */
export function formatTaskProgress(progress: TaskProgress): string {
  return progress.total === undefined ? progress.step : `${progress.step} ${count(progress.done)} / ${count(progress.total)}`;
}

/** "40 s", "2 min 10 s", "1 h 2 min". */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
  return minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${Math.floor(minutes / 60)} h`;
}

/** How long a task waited in the queue (created → started) and ran (started → finished), as far as it got. */
export function taskDurations(task: { createdAt: string; startedAt?: string; finishedAt?: string }): { waited?: string; ran?: string } {
  const at = (value: string) => new Date(value).getTime();
  if (!task.startedAt) return {};
  const waited = formatDuration(at(task.startedAt) - at(task.createdAt));
  return task.finishedAt ? { waited, ran: formatDuration(at(task.finishedAt) - at(task.startedAt)) } : { waited };
}

/** A task's input as text, by its `type`: "Locale de (key-value JSON)", "Localess file (all locales)", "en → de (overwrite)". */
export function formatTaskParams(params: TaskParams | undefined): string | undefined {
  switch (params?.type) {
    case 'translation-full':
      return 'Localess file (all locales)';
    case 'translation-json-flat':
      return `Locale ${params.locale} (key-value JSON)`;
    case 'translation-translate':
      return `${params.sourceLocale} → ${params.targetLocale}${params.overwrite ? ' (overwrite)' : ''}`;
    default:
      return undefined;
  }
}

import type { ZodError } from 'zod';
import type { TaskExportMetadata } from '@localess/shared';

/** What a job reports back; written onto the task row by the worker. */
export interface TaskOutcome {
  status: 'FINISHED' | 'ERROR';
  message?: string;
  trace?: string;
  file?: { name: string; size: number };
}

/** JSON entries (assets.json, contents.json, …) may inflate up to this much. */
export const MAX_JSON_BYTES = 512 * 1024 * 1024;
const MAX_VALIDATION_ISSUES = 5;
export const PROGRESS_INTERVAL = 50;
export const KIND_LABEL: Record<TaskExportMetadata['kind'], string> = {
  ASSET: 'Asset',
  CONTENT: 'Content',
  SCHEMA: 'Schema',
  TRANSLATION: 'Translation',
};

/** The task's file: the export result, or the uploaded import. */
export const taskFileKey = (task: { spaceId: string; id: string }) => `spaces/${task.spaceId}/tasks/${task.id}/original`;
/** Everything stored for a task, dropped with it. */
export const taskFilesPrefix = (spaceId: string, id: string) => `spaces/${spaceId}/tasks/${id}/`;
export const assetFileKey = (spaceId: string, id: string) => `spaces/${spaceId}/assets/${id}/original`;

export function formatZodError(error: ZodError): string {
  const total = error.issues.length;
  const shown = error.issues.slice(0, MAX_VALIDATION_ISSUES).map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  const suffix = total > MAX_VALIDATION_ISSUES ? ` (+${total - MAX_VALIDATION_ISSUES} more)` : '';
  return `${total} validation issue${total === 1 ? '' : 's'} - ${shown.join('; ')}${suffix}`;
}

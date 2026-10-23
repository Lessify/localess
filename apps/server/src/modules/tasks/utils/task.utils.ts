import { LOCALESS_FILE_EXTENSION, type TaskFile } from '@localess/shared';

import { sanitizeFileName, toFileName } from '../../../shared/utils/file-name.js';

/** What a job reports back; written onto the task row by the worker. */
export interface TaskOutcome {
  status: 'FINISHED' | 'ERROR';
  /** An export's file. Everything else a job has to say goes to its logs. */
  file?: TaskFile;
}

/** One reason an import was refused: where in the file (`translations[42].key`), and why. A WARN line of its logs. */
export interface TaskProblem {
  path: string;
  message: string;
}

/** What an import or a translate did, as one INFO line of its logs. */
export interface TaskCounts {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

/** JSON entries of an old archive (translations.json, schemas.json) may inflate up to this much. */
export const MAX_JSON_BYTES = 512 * 1024 * 1024;
/** A key-value JSON import is read whole: at most this much, refused at upload. */
export const MAX_LOCALE_FILE_BYTES = 50 * 1024 * 1024;

const count = (value: number): string => value.toLocaleString('en-US');

/** "12 created · 40 updated · 1,200 unchanged · 3 skipped". */
export function formatCounts(counts: TaskCounts): string {
  return `${count(counts.created)} created · ${count(counts.updated)} updated · ${count(counts.unchanged)} unchanged · ${count(counts.skipped)} skipped`;
}

/** An export's file name: `<space-name>-<what>-<YYYY-MM-DD>.localess.zip`, the name reduced to letters, digits and dashes. */
export function exportFileName(spaceName: string, what: string, now = new Date()): string {
  return sanitizeFileName(`${toFileName(spaceName)}-${what}-${now.toISOString().slice(0, 10)}${LOCALESS_FILE_EXTENSION}`);
}

/** Where a task's file is stored: under its folder, by its (sanitised) name. */
export const taskFileKey = (task: { spaceId: string; id: string }, name: string): string =>
  `spaces/${task.spaceId}/tasks/${task.id}/${name}`;
/** Everything stored for a task, dropped with it. */
export const taskFilesPrefix = (spaceId: string, id: string): string => `spaces/${spaceId}/tasks/${id}/`;
export const assetFileKey = (spaceId: string, id: string): string => `spaces/${spaceId}/assets/${id}/original`;

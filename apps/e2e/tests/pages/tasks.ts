import { readFile } from 'node:fs/promises';

import { type Download, expect, type Locator, type Page } from '@playwright/test';

import type { AppApi } from '../support/app-api';

/** A file for an upload: its name decides the import format (`.localess.zip`, `.json`, ...). */
export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** A task as the App API answers it (the fields the tests read). */
export interface TaskDto {
  id: string;
  kind: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'FINISHED' | 'ERROR';
  file?: { name: string; size: number };
  createdBy?: { id: string; email: string; displayName?: string };
}

/**
 * How long a test waits for a task to end: tasks queue on the server (one at a time per space, a few per instance),
 * and other tests' tasks may be ahead of it.
 */
export const TASK_ENDS_WITHIN = 60_000;

/** The toast the app shows when a task the user started ends ("Translation Export finished", "... failed"). */
export function taskToast(page: Page, text: string): Locator {
  return page.locator('[data-sonner-toast]').filter({ hasText: text }).first();
}

/** Waits for the toast of a task that ended (it may be queued behind other tasks first). */
export async function expectTaskToast(page: Page, text: string): Promise<void> {
  await expect(taskToast(page, text)).toBeVisible({ timeout: TASK_ENDS_WITHIN });
}

/** Clicks a toast's action ("Download", "View"), the toast found by its text. */
export async function clickToastAction(page: Page, text: string, action: 'Download' | 'View'): Promise<void> {
  await expectTaskToast(page, text);
  await taskToast(page, text).getByRole('button', { name: action, exact: true }).click();
}

/** Waits for the download `click` starts, and returns it as a file to upload again (its name and bytes). */
export async function downloadOf(page: Page, click: () => Promise<void>): Promise<FilePayload> {
  const download = page.waitForEvent('download');
  await click();
  return asFile(await download);
}

async function asFile(download: Download): Promise<FilePayload> {
  const name = download.suggestedFilename();
  const mimeType = name.endsWith('.json') ? 'application/json' : 'application/zip';
  return { name, mimeType, buffer: await readFile(await download.path()) };
}

/** Picks a file in an import dialog ("Upload File" opens the browser's file chooser). */
export async function chooseFile(page: Page, form: Locator, file: FilePayload): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await form.getByRole('button', { name: 'Upload File' }).click();
  await (await chooser).setFiles(file);
  await expect(form.getByText(file.name, { exact: true })).toBeVisible();
}

/** The space's tasks of one kind (newest first), as the admin sees them. */
export async function tasksOf(api: AppApi, spaceId: string, kind: string): Promise<TaskDto[]> {
  return (await api.get<{ items: TaskDto[] }>(`/api/app/spaces/${spaceId}/tasks?kind=${kind}`)).items;
}

/** Waits until the space has `count` tasks of `kind` that ended, and returns the newest. */
export async function endedTask(api: AppApi, spaceId: string, kind: string, count = 1): Promise<TaskDto> {
  let tasks: TaskDto[] = [];
  await expect
    .poll(
      async () => {
        tasks = (await tasksOf(api, spaceId, kind)).filter(it => it.status === 'FINISHED' || it.status === 'ERROR');
        return tasks.length;
      },
      { timeout: TASK_ENDS_WITHIN },
    )
    .toBe(count);
  return tasks[0];
}

/** Starts an export through the App API and waits for it to finish (data for tests of the Tasks page). */
export async function finishedExport(api: AppApi, spaceId: string, kind: 'TRANSLATION_EXPORT' | 'SCHEMA_EXPORT'): Promise<TaskDto> {
  const task = await api.send<TaskDto>('post', `/api/app/spaces/${spaceId}/tasks`, { kind });
  let current = task;
  await expect
    .poll(
      async () => {
        current = await api.get<TaskDto>(`/api/app/spaces/${spaceId}/tasks/${task.id}`);
        return current.status;
      },
      { timeout: TASK_ENDS_WITHIN },
    )
    .toBe('FINISHED');
  return current;
}

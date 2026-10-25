import { expect, type Locator, type Page } from '@playwright/test';

import { rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';
import { cellUnder, dataRows } from './table';

/** Space → Tasks (`/features/spaces/:spaceId/tasks`): the history of the space's tasks, and a task's page. */
export class TasksPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/tasks`);
    await expect(this.table.getByRole('columnheader', { name: 'Kind' })).toBeVisible();
  }

  get table(): Locator {
    return this.page.getByRole('table');
  }

  /** The task rows: not the "No tasks yet." row (shown while the first page loads, too). */
  get rows(): Locator {
    return dataRows(this.table).filter({ hasNotText: 'No tasks yet.' });
  }

  /** A task's row, by a text in it (its kind, its file name). */
  row(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  /** The kinds the list shows, one per row, in order. */
  async kinds(): Promise<string[]> {
    const kinds: string[] = [];
    for (const row of await this.rows.all()) kinds.push((await (await cellUnder(this.table, row, 'Kind')).innerText()).trim());
    return kinds;
  }

  /** The status icon of a row: its accessible name is the status in words ("Finished", "Error"). */
  status(row: Locator, status: string): Locator {
    return row.getByRole('img', { name: status, exact: true });
  }

  // --- Search and filters (on the server) ---------------------------------------------------------------------------

  /** Searches the id and the file name; runs on Enter, an emptied box lists every task again by itself. */
  async search(text: string): Promise<void> {
    const box = this.page.getByRole('searchbox');
    await box.fill(text);
    if (text) await box.press('Enter');
  }

  /** Toggles values of the "Kind" or "Status" filter (several may be chosen). */
  async filter(name: 'Kind' | 'Status', ...values: string[]): Promise<void> {
    await this.page.getByRole('button', { name, exact: true }).click();
    for (const value of values) await this.page.getByRole('option', { name: value, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  async resetFilters(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reset' }).click();
  }

  /** Deletes a task from its row menu, confirmed. */
  async delete(row: Locator, taskId: string): Promise<void> {
    await rowMenu(this.page, row, 'Delete');
    await confirmDialog(this.page, 'Delete Task');
    await expectToast(this.page, `Task '${taskId}' has been deleted.`);
  }

  // --- A task's page -------------------------------------------------------------------------------------------------

  /** Opens a task's page from its row. */
  async open(row: Locator): Promise<void> {
    await row.getByRole('cell').first().click();
    await expect(this.page.getByRole('heading', { name: 'Logs' })).toBeVisible();
  }

  /** The task page's log messages. */
  get logs(): Locator {
    return dataRows(this.page.getByRole('table'));
  }
}

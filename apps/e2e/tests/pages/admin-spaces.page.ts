import { expect, type Locator, type Page } from '@playwright/test';

import { confirmDialog, expectToast } from './notifications';

/** Admin → Spaces (`/features/admin/spaces`). */
export class AdminSpacesPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/features/admin/spaces');
    await expect(this.page.getByRole('button', { name: 'Add Space' })).toBeVisible();
  }

  row(name: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  async create(name: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Space' }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Create Space' });
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(dialog).toBeHidden();
    await expectToast(this.page, 'Space has been created.');
  }

  /** The id from the row's ID column. */
  async idOf(name: string): Promise<string> {
    return (await this.row(name).getByRole('cell').first().innerText()).trim();
  }

  async rename(name: string, newName: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Edit' }).click();
    const form = this.page.getByRole('dialog').filter({ hasText: 'Edit Space' });
    await form.getByLabel('Name').fill(newName);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Space has been updated.');
  }

  async delete(name: string): Promise<void> {
    await this.row(name).getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(this.page, 'Delete Space');
    await expectToast(this.page, `Space '${name}' has been deleted.`);
  }
}

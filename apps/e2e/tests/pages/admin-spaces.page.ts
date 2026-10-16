import { expect, type Locator, type Page } from '@playwright/test';

import { dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** Admin → Spaces (`/features/admin/spaces`). */
export class AdminSpacesPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/features/admin/spaces');
    await expect(this.page.getByRole('button', { name: 'Add Space' })).toBeVisible();
    // The table has loaded once the seeded space is listed.
    // `first`: the CLI test's `admin:create` adds another "Hello World" for a moment.
    await expect(this.row('Hello World').first()).toBeVisible();
  }

  /** A row, by the exact space name. */
  row(name: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  /** Opens the create dialog and fills the name, without submitting. */
  async openCreate(name: string): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Space' }).click();
    const form = await dialog(this.page, 'Create Space');
    await form.getByLabel('Name', { exact: true }).fill(name);
    return form;
  }

  async create(name: string): Promise<void> {
    const form = await this.openCreate(name);
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Space has been created.');
  }

  /** The id from the row's ID column. */
  async idOf(name: string): Promise<string> {
    return (await this.row(name).getByRole('cell').first().innerText()).trim();
  }

  /** Opens the edit dialog of a space and fills the new name, without submitting. */
  async openRename(name: string, newName: string): Promise<Locator> {
    await this.row(name).getByRole('button', { name: 'Edit' }).click();
    const form = await dialog(this.page, 'Edit Space');
    await expect(form.getByLabel('Name', { exact: true })).toHaveValue(name);
    await form.getByLabel('Name', { exact: true }).fill(newName);
    return form;
  }

  async rename(name: string, newName: string): Promise<void> {
    const form = await this.openRename(name, newName);
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

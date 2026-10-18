import { expect, type Locator, type Page } from '@playwright/test';

import { escapeRegExp } from '../support/text';
import { dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';
import { cellUnder } from './table';

/** Admin → Spaces (`/features/admin/spaces`). */
export class AdminSpacesPage {
  constructor(private readonly page: Page) {}

  /** The list; with `search`, narrowed to it (one page is listed: a given space may be on another). */
  async goto(search?: string): Promise<void> {
    await this.page.goto('/features/admin/spaces');
    await expect(this.page.getByRole('button', { name: 'Add Space' })).toBeVisible();
    // The table has loaded once its total shows (one page is listed: a given space may be on another).
    await expect(this.page.getByText(/^\d+ total items$/)).toBeVisible();
    if (search !== undefined) await this.find(search);
  }

  /** Narrows the table to rows matching `text` (server-side search), once the server has answered it. */
  async find(text: string): Promise<void> {
    const answered = this.page.waitForResponse(
      response => response.url().includes('/api/app/spaces?') && new URL(response.url()).searchParams.get('search') === (text.trim() || null),
    );
    await this.page.getByPlaceholder(/^Search/).fill(text);
    await answered;
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

  /** Picks a template in the open create dialog (a radio whose label starts with the template's name). */
  async chooseTemplate(form: Locator, template: string): Promise<void> {
    const radio = form.getByRole('radio', { name: new RegExp(`^${escapeRegExp(template)}`) });
    // The radio input is visually hidden: click its label's title, as a user does.
    await form.getByText(template, { exact: true }).click();
    await expect(radio).toBeChecked();
  }

  async create(name: string): Promise<void> {
    const form = await this.openCreate(name);
    await form.getByRole('button', { name: 'Create' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Space has been created.');
  }

  /** The id from the row's ID column. */
  async idOf(name: string): Promise<string> {
    return (await (await cellUnder(this.page.getByRole('table'), this.row(name), 'ID')).innerText()).trim();
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

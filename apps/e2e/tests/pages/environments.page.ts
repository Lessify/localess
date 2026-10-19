import { expect, type Locator, type Page } from '@playwright/test';

import { dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';
import { dataRows } from './table';

export interface EnvironmentInput {
  name: string;
  url: string;
}

/** Space → Settings → Visual Editor (`/features/spaces/:spaceId/settings/visual-editor`): the preview environments. */
export class EnvironmentsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/settings/visual-editor`);
    await expect(this.page.getByRole('button', { name: 'Add Environment' })).toBeVisible();
  }

  /** The environment rows of the table (not "No environments yet."). */
  items(): Locator {
    return dataRows(this.page.getByRole('table')).filter({ has: this.page.getByRole('button', { name: 'Actions', exact: true }) });
  }

  /** The row of an environment, by its name (the Name cell, "(default)" aside). */
  item(name: string): Locator {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.items().filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${escaped}( \\(default\\))?$`) }) });
  }

  async add(environment: EnvironmentInput): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Environment' }).click();
    await this.save(await this.fillDialog('Add Environment', environment));
    await expectToast(this.page, 'Environment has been added.');
  }

  async edit(currentName: string, environment: EnvironmentInput): Promise<void> {
    await this.save(await this.openEdit(currentName, environment));
    await expectToast(this.page, `Environment '${environment.name}' has been updated.`);
  }

  /** Opens "Edit Environment" from the row menu and fills it, without saving. */
  async openEdit(currentName: string, environment: EnvironmentInput): Promise<Locator> {
    await rowMenu(this.page, this.item(currentName), 'Edit');
    return this.fillDialog('Edit Environment', environment);
  }

  /** The environment names in the table's order (the space's order unless sorted; the first is the default). */
  async names(): Promise<string[]> {
    const rows = await this.items().all();
    return Promise.all(rows.map(async row => (await row.getByRole('cell').first().innerText()).replace('(default)', '').trim()));
  }

  /** The search box (name or URL, on the server). */
  async search(text: string): Promise<void> {
    await this.page.getByPlaceholder('Search...').fill(text);
  }

  /** Clicks a sortable column header (Name, URL): ascending, then descending, then the space's order again. */
  async sortBy(header: 'Name' | 'URL'): Promise<void> {
    await this.page.getByRole('columnheader', { name: header }).click();
  }

  async move(name: string, direction: 'Move Up' | 'Move Down'): Promise<void> {
    await rowMenu(this.page, this.item(name), direction);
  }

  /** Opens the row menu's Delete, without answering the confirmation. */
  async openDelete(name: string): Promise<void> {
    await rowMenu(this.page, this.item(name), 'Delete');
  }

  async delete(name: string): Promise<void> {
    await this.openDelete(name);
    await confirmDialog(this.page, 'Delete Environment');
    await expectToast(this.page, `Environment '${name}' has been deleted.`);
  }

  private async save(form: Locator): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
  }

  private async fillDialog(title: string, { name, url }: EnvironmentInput): Promise<Locator> {
    const form = await dialog(this.page, title);
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('URL').fill(url);
    return form;
  }
}

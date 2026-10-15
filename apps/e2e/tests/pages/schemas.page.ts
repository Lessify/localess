import { expect, type Locator, type Page } from '@playwright/test';

import { choose, dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** Space → Schemas: the list (`/schemas`) and the ROOT/NODE editor (`/schemas/comp/:id`). */
export class SchemasPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/schemas`);
    await expect(this.page.getByRole('button', { name: 'Add Schema' })).toBeVisible();
  }

  /** A row, by the schema name (shown as `#name`). */
  row(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: `#${name}` });
  }

  async create(input: { displayName: string; id: string; type: 'Root' | 'Node' | 'Enum' }): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Schema' }).click();
    const form = await dialog(this.page, 'Create new Schema');
    await form.getByLabel('Display Name').fill(input.displayName);
    await form.getByLabel('ID', { exact: true }).fill(input.id);
    await choose(this.page, form.locator('#type'), input.type);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Schema has been created.');
  }

  async open(name: string): Promise<void> {
    await this.row(name).click();
    await expect(this.page).toHaveURL(/\/schemas\/(comp|enum)\//);
  }

  /** In the editor: adds a field (it starts as Text) and closes its side sheet. */
  async addField(name: string): Promise<void> {
    await this.page.getByPlaceholder('Name of the new field...').fill(name);
    await this.page.getByRole('button', { name: 'Add', exact: true }).click();
    const sheetTitle = this.page.getByRole('heading', { name: 'Edit Field' });
    await expect(sheetTitle).toBeVisible();
    await this.page.keyboard.press('Escape');
    await expect(sheetTitle).toBeHidden();
  }

  /** The field rows of the open editor. */
  field(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: `#${name}` });
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: /^Save/ }).click();
    await expectToast(this.page, 'Schema has been updated.');
  }

  async delete(name: string): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Delete');
    await confirmDialog(this.page, 'Delete Schema');
    await expectToast(this.page, `Schema '${name}' has been deleted.`);
  }
}

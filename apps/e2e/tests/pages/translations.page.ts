import { expect, type Locator, type Page } from '@playwright/test';

import { dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** Space → Translations (`/features/spaces/:spaceId/translations`): key list on the left, detail panel on the right. */
export class TranslationsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/translations`);
    await expect(this.page.getByRole('button', { name: 'Publish' })).toBeVisible();
  }

  /** A key in the list (list layout). */
  item(key: string): Locator {
    return this.page.locator('cdk-virtual-scroll-viewport [role="listitem"]').filter({ hasText: key });
  }

  get valueEditor(): Locator {
    return this.page.getByRole('textbox', { name: 'Translation value' });
  }

  async add(input: { key: string; value: string; description?: string }): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Translation' }).click();
    const form = await dialog(this.page, 'Add Translation');
    await form.getByLabel('Key').fill(input.key);
    await form.getByLabel('Value').fill(input.value);
    if (input.description) await form.getByLabel('Description').fill(input.description);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Translation has been added.');
  }

  async select(key: string): Promise<void> {
    await this.item(key).click();
    await expect(this.page.getByRole('button', { name: 'Edit Key' })).toBeVisible();
  }

  /** Picks the locale edited in the detail panel. */
  async selectTargetLocale(name: string): Promise<void> {
    await this.page.getByLabel('Target Locale').click();
    await this.page.getByRole('option', { name }).click();
  }

  async saveValue(value: string): Promise<void> {
    await this.valueEditor.fill(value);
    await this.page.getByRole('button', { name: /^Save/ }).click();
    await expectToast(this.page, 'Translation has been updated.');
  }

  async renameKey(newKey: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit Key' }).click();
    const form = await dialog(this.page, 'Edit Translation Key');
    await form.getByLabel('Key').fill(newKey);
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(this.page, 'Translation key has been updated.');
  }

  async deleteSelected(): Promise<void> {
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
    await confirmDialog(this.page, 'Delete Translation');
    await expectToast(this.page, 'Translation has been deleted.');
  }

  async search(text: string): Promise<void> {
    await this.page.getByPlaceholder('Search...').fill(text);
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: 'Publish' }).click();
    await expectToast(this.page, 'Translations have been published.');
  }
}

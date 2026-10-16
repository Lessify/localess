import { expect, type Locator, type Page } from '@playwright/test';

import { dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';
import { dataRows } from './table';

/** Space → Settings → Locales (`/features/spaces/:spaceId/settings/locales`). */
export class LocalesPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/settings/locales`);
    await expect(this.page.getByRole('button', { name: 'Add Locale' })).toBeVisible();
  }

  /** The row of a locale, by its id (`en`, `de`, ...). */
  row(localeId: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: localeId, exact: true }) });
  }

  /** Opens "Add Locale" and picks the locale, without saving. */
  async openAdd(localeName: string): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Locale' }).click();
    const form = await dialog(this.page, 'Add Locale');
    await form.getByRole('combobox').fill(localeName);
    await this.page.getByRole('option', { name: localeName, exact: true }).click();
    return form;
  }

  async add(localeName: string): Promise<void> {
    const form = await this.openAdd(localeName);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Locale has been added.');
  }

  /** The locale ids in the table's order (the space's order). */
  async ids(): Promise<string[]> {
    const rows = await dataRows(this.page.getByRole('table')).all();
    return Promise.all(rows.map(async row => (await row.getByRole('cell').first().innerText()).trim()));
  }

  /** The Default column's check mark. */
  isDefault(localeId: string): Locator {
    return this.row(localeId).getByRole('img', { name: 'Default locale' });
  }

  async setDefault(localeId: string, localeName: string): Promise<void> {
    await rowMenu(this.page, this.row(localeId), 'Set as Default');
    await confirmDialog(this.page, 'Change Default Locale');
    await expectToast(this.page, `Locale '${localeName}' is now the default locale.`);
  }

  async move(localeId: string, direction: 'Move Up' | 'Move Down'): Promise<void> {
    await rowMenu(this.page, this.row(localeId), direction);
  }

  async delete(localeId: string, localeName: string): Promise<void> {
    await rowMenu(this.page, this.row(localeId), 'Delete');
    await confirmDialog(this.page, 'Delete Locale');
    await expectToast(this.page, `Locale '${localeName}' has been deleted.`);
  }
}

import { expect, type Locator, type Page } from '@playwright/test';

import { rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

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

  async add(localeName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Locale' }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Add Locale' });
    await dialog.getByRole('combobox').fill(localeName);
    await this.page.getByRole('option', { name: localeName, exact: true }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expectToast(this.page, 'Locale has been added.');
  }

  async delete(localeId: string, localeName: string): Promise<void> {
    await rowMenu(this.page, this.row(localeId), 'Delete');
    await confirmDialog(this.page, 'Delete Locale');
    await expectToast(this.page, `Locale '${localeName}' has been deleted.`);
  }
}

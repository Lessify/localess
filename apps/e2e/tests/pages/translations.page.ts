import { expect, type Locator, type Page } from '@playwright/test';

import { dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export interface NewTranslation {
  key: string;
  value: string;
  description?: string;
  labels?: string[];
  /** "Translate other locales": fill every other locale by machine translation. */
  autoTranslate?: boolean;
}

/** Space → Translations (`/features/spaces/:spaceId/translations`): filter bar, key list, detail panel. */
export class TranslationsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/translations`);
    await expect(this.page.getByRole('button', { name: 'Publish' })).toBeVisible();
  }

  // --- List and tree -----------------------------------------------------------------------------------------------

  /** A key in the list layout, by its exact key. */
  item(key: string): Locator {
    return this.page
      .locator('cdk-virtual-scroll-viewport [role="listitem"]')
      .filter({ has: this.page.locator('[hlmItemTitle]').getByText(key, { exact: true }) });
  }

  /** All rows of the list layout. */
  get items(): Locator {
    return this.page.locator('cdk-virtual-scroll-viewport [role="listitem"]');
  }

  /** The keys the list shows, in order. */
  async visibleKeys(): Promise<string[]> {
    const titles = await this.items.locator('[hlmItemTitle]').allInnerTexts();
    return titles.map(it => it.trim());
  }

  /** The value a list row shows (the value of the locale chosen in the filter). */
  valueOf(key: string): Locator {
    return this.item(key).locator('[hlmItemDescription]');
  }

  async useLayout(layout: 'List' | 'Tree'): Promise<void> {
    await this.page.getByLabel(`${layout} Layout`, { exact: true }).click();
    await expect(layout === 'Tree' ? this.tree : this.page.locator('cdk-virtual-scroll-viewport')).toBeVisible();
  }

  get tree(): Locator {
    return this.page.getByRole('tree');
  }

  /** A node of the tree layout, by its own segment name (not its children's). */
  treeNode(name: string): Locator {
    return this.page.locator('li[data-slot="tree-item"]').filter({
      has: this.page.locator(':scope > [data-slot="tree-item-row"]', { hasText: new RegExp(`^\\s*${name}\\s*$`) }),
    });
  }

  /** The clickable row of a tree node. */
  treeRow(name: string): Locator {
    return this.treeNode(name).locator(':scope > [data-slot="tree-item-row"]');
  }

  /** The segment names of the tree's top-level nodes. */
  async treeRoots(): Promise<string[]> {
    const rows = this.tree.locator(':scope > li > [data-slot="tree-item-row"]');
    return (await rows.allInnerTexts()).map(it => it.trim());
  }

  // --- Filter bar --------------------------------------------------------------------------------------------------

  /** The locale whose values the list shows and the search looks in. */
  async filterLocale(name: string): Promise<void> {
    await this.page.getByLabel('Locale', { exact: true }).click();
    await this.page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
  }

  async search(text: string): Promise<void> {
    await this.page.getByPlaceholder('Search...').fill(text);
  }

  /** Picks a status in the "Status" filter: group "Translation" (all locales) or "Locale" (the filter's locale). */
  async filterStatus(group: 'Translation' | 'Locale', status: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Status' }).click();
    const groupLocator = this.page.getByRole('group').filter({ hasText: group });
    await groupLocator.getByRole('option', { name: status, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  async filterLabel(label: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Labels' }).click();
    await this.page.getByRole('option', { name: label, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  async resetFilters(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reset' }).click();
  }

  // --- Add ---------------------------------------------------------------------------------------------------------

  /** Opens "Add Translation" and fills it, without saving. */
  async openAdd(input: NewTranslation): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Translation' }).click();
    const form = await dialog(this.page, 'Add Translation');
    await form.getByLabel('Key', { exact: true }).fill(input.key);
    await form.getByLabel('Value', { exact: true }).fill(input.value);
    if (input.description) await form.getByLabel('Description').fill(input.description);
    for (const label of input.labels ?? []) await this.addLabelChip(form, label);
    if (input.autoTranslate) await form.locator('label[for="autoTranslate"]').click();
    return form;
  }

  async add(input: NewTranslation): Promise<void> {
    const form = await this.openAdd(input);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Translation has been added.');
  }

  /** Types a label and presses Enter (Add and Edit dialogs). */
  async addLabelChip(form: Locator, label: string): Promise<void> {
    const input = form.getByLabel('Labels');
    await input.fill(label);
    await input.press('Enter');
  }

  /** A label chip in the Add or Edit dialog (click it to remove the label). */
  labelChip(form: Locator, label: string): Locator {
    return form.getByRole('button', { name: label, exact: true });
  }

  // --- Detail panel ------------------------------------------------------------------------------------------------

  async select(key: string): Promise<void> {
    await this.item(key).click();
    await expect(this.detail('Key')).toContainText(key);
  }

  /** A field of the detail panel (Key, Status, Description, Labels, ...). */
  detail(field: 'Key' | 'Status' | 'Description' | 'Labels'): Locator {
    return this.page
      .locator('ul[role="list"] > li')
      .filter({ has: this.page.getByText(field, { exact: true }) })
      .first();
  }

  get valueEditor(): Locator {
    return this.page.getByRole('textbox', { name: 'Translation value' });
  }

  get saveValueButton(): Locator {
    return this.page.getByRole('button', { name: /^Save/ });
  }

  /** Picks the locale edited in the detail panel. */
  async selectTargetLocale(name: string): Promise<void> {
    await this.page.getByLabel('Target Locale').click();
    await this.page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
  }

  async selectSourceLocale(name: string): Promise<void> {
    await this.page.getByLabel('Source Locale').click();
    await this.page.getByRole('option', { name: new RegExp(`^${name}`) }).click();
  }

  async saveValue(value: string): Promise<void> {
    await this.valueEditor.fill(value);
    await this.saveValueButton.click();
    await expectToast(this.page, 'Translation has been updated.');
  }

  /** Opens "Edit Translation Key" and fills it, without saving. */
  async openRename(newKey: string): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Edit Key' }).click();
    const form = await dialog(this.page, 'Edit Translation Key');
    await form.getByLabel('Key', { exact: true }).fill(newKey);
    return form;
  }

  async renameKey(newKey: string): Promise<void> {
    const form = await this.openRename(newKey);
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(this.page, 'Translation key has been updated.');
  }

  /** Opens "Edit Translation" (description and labels) for the selected key. */
  async openEdit(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Edit', exact: true }).click();
    return dialog(this.page, 'Edit Translation');
  }

  async saveEdit(form: Locator): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Translation has been updated.');
  }

  async deleteSelected(): Promise<void> {
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
    await confirmDialog(this.page, 'Delete Translation');
    await expectToast(this.page, 'Translation has been deleted.');
  }

  // --- Publish and machine translation -----------------------------------------------------------------------------

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: 'Publish' }).click();
    await expectToast(this.page, 'Translations have been published.');
  }

  /** The detail panel's Translate button: fills the target value from the source (not saved). */
  get translateButton(): Locator {
    return this.page.getByRole('button', { name: 'Translate', exact: true });
  }

  /** More menu → Translate Locale: machine-translates a whole locale. */
  async translateLocale(source: string, target: string, overwrite: boolean): Promise<void> {
    await this.page.getByRole('button', { name: 'More' }).click();
    await this.page.getByRole('menuitem', { name: 'Translate Locale' }).click();
    const form = await dialog(this.page, 'Translate Locale');
    await form.getByLabel('Source Locale').click();
    await this.page.getByRole('option', { name: new RegExp(`^${source}`) }).click();
    await form.getByLabel('Target Locale').click();
    await this.page.getByRole('option', { name: new RegExp(`^${target}`) }).click();
    await expect(form.getByLabel('Target Locale')).toContainText(target);
    if (overwrite) await form.locator('label[for="overwrite"]').click();
    await form.getByRole('button', { name: 'Translate' }).click();
    await expect(form).toBeHidden();
  }
}

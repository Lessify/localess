import { expect, type Locator, type Page } from '@playwright/test';

import { escapeRegExp } from '../support/text';
import { choose, dialog } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** A locale in a select, by its name; the space's default locale is listed as `English (Default)`. */
function localeOption(name: string): RegExp {
  return new RegExp(`^${escapeRegExp(name)}( \\(Default\\))?$`);
}

/** Turns on a Spartan checkbox or switch: its state follows the click a moment later (no `check()`). */
async function turnOn(control: Locator): Promise<void> {
  await expect(control).not.toBeChecked();
  await control.click();
  await expect(control).toBeChecked();
}

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

  /** The list layout (a virtual scroll: it renders only the rows in view). */
  get list(): Locator {
    return this.page.getByRole('list', { name: 'Translations', exact: true });
  }

  /** A key in the list layout, by its exact key (a row is named after its key). */
  item(key: string): Locator {
    return this.list.getByRole('listitem', { name: key, exact: true });
  }

  /** All rows of the list layout. */
  get items(): Locator {
    return this.list.getByRole('listitem');
  }

  /** The keys the list shows, in order. */
  async visibleKeys(): Promise<string[]> {
    return this.items.evaluateAll(rows => rows.map(row => row.getAttribute('aria-label') ?? ''));
  }

  /** The value a list row shows (the value of the locale chosen in the filter). */
  valueOf(key: string): Locator {
    return this.item(key).getByRole('paragraph');
  }

  /** Scrolls the list layout to its end, as with the mouse wheel (the virtual scroll renders the last rows). */
  async scrollToEnd(): Promise<void> {
    await this.items.first().hover();
    await this.page.mouse.wheel(0, 100_000);
  }

  async useLayout(layout: 'List' | 'Tree'): Promise<void> {
    await this.page.getByLabel(`${layout} Layout`, { exact: true }).click();
    await expect(layout === 'Tree' ? this.tree : this.list).toBeVisible();
  }

  get tree(): Locator {
    return this.page.getByRole('tree');
  }

  /**
   * A node of the tree layout, by its own segment name: the tree item that shows the name, but not only inside its
   * group of children (an expanded parent contains its children's names too).
   */
  treeNode(name: string): Locator {
    const named = this.page.getByText(name, { exact: true });
    return this.tree
      .getByRole('treeitem')
      .filter({ has: named })
      .filter({ hasNot: this.page.getByRole('group').filter({ has: named }) });
  }

  /** The clickable name of a tree node. */
  treeRow(name: string): Locator {
    return this.treeNode(name).getByText(name, { exact: true });
  }

  /** The segment names of the tree's top-level nodes (the first line of each: an expanded node lists its children below). */
  async treeRoots(): Promise<string[]> {
    const roots = await this.tree.getByRole('treeitem', { level: 1 }).allInnerTexts();
    return roots.map(it => it.trim().split('\n')[0].trim());
  }

  // --- Filter bar --------------------------------------------------------------------------------------------------

  /** The locale whose values the list shows and the search looks in. */
  async filterLocale(name: string): Promise<void> {
    await choose(this.page, this.page.getByLabel('Locale', { exact: true }), localeOption(name));
  }

  async search(text: string): Promise<void> {
    const box = this.page.getByPlaceholder('Search...');
    await box.fill(text);
    // The search runs on Enter; an emptied box shows every key again by itself.
    if (text) await box.press('Enter');
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
    if (input.autoTranslate) await turnOn(form.getByRole('switch', { name: 'Translate other locales' }));
    return form;
  }

  async add(input: NewTranslation): Promise<void> {
    await this.saveAdd(await this.openAdd(input));
  }

  /** Saves the open "Add Translation" dialog and waits for it to close and for the toast. */
  async saveAdd(form: Locator): Promise<void> {
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
      .getByRole('list', { name: 'Translation details', exact: true })
      .getByRole('listitem')
      .filter({ has: this.page.getByText(field, { exact: true }) });
  }

  get valueEditor(): Locator {
    return this.page.getByRole('textbox', { name: 'Translation value' });
  }

  get saveValueButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true });
  }

  /** Picks the locale edited in the detail panel. */
  async selectTargetLocale(name: string): Promise<void> {
    await choose(this.page, this.page.getByLabel('Target Locale'), localeOption(name));
  }

  async selectSourceLocale(name: string): Promise<void> {
    await choose(this.page, this.page.getByLabel('Source Locale'), localeOption(name));
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
    await expect(form).toBeHidden();
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

  /** Opens the delete confirmation of the selected key and returns it, without confirming. */
  async openDelete(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
    return dialog(this.page, 'Delete Translation');
  }

  async deleteSelected(): Promise<void> {
    await this.openDelete();
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
    await choose(this.page, form.getByLabel('Source Locale'), localeOption(source));
    await choose(this.page, form.getByLabel('Target Locale'), localeOption(target));
    await expect(form.getByLabel('Target Locale')).toContainText(target);
    if (overwrite) await turnOn(form.getByRole('checkbox', { name: 'Overwrite existing translations' }));
    await form.getByRole('button', { name: 'Translate' }).click();
    await expect(form).toBeHidden();
  }
}

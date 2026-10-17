import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

import { escapeRegExp } from '../support/text';
import { choose, dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** The toast of a Save the form's rules refuse. */
export const CONTENT_INVALID = 'Content is not valid. Please check all fields are filled correctly.';

/** Space → Contents: the folder browser (`/contents`) and the document editor (`/contents/:id`). */
export class ContentsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/contents`);
    await expect(this.page.getByRole('button', { name: 'Add Content' })).toBeVisible();
  }

  /** A row, by the exact content name (the name cell shows `name #slug`). */
  row(name: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*#`) }) });
  }

  /** The content rows (each has an Actions menu; the header and the "No content yet." row don't). */
  get rows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'Actions', exact: true }) });
  }

  get empty(): Locator {
    return this.page.getByText('No content yet.');
  }

  /** The status icon of a row: "Published", "Draft" or "Not published". */
  status(name: string, status: 'Published' | 'Draft' | 'Not published'): Locator {
    return this.row(name).getByRole('img', { name: status, exact: true });
  }

  get rootFolder(): Locator {
    return this.page.getByRole('button', { name: 'Root folder' });
  }

  /** The folder breadcrumb trail above the list. */
  get folders(): Locator {
    return this.page.getByRole('navigation', { name: 'Folders' });
  }

  /** A folder of the breadcrumb trail (not the current one). */
  breadcrumb(name: string): Locator {
    return this.folders.getByRole('button', { name, exact: true });
  }

  /** Opens "Add Folder" or "Add Document" and fills it, without saving. */
  async openAdd(kind: 'Folder' | 'Document', input: { name: string; slug?: string; schema?: string }): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Content' }).click();
    await this.page.getByRole('menuitem', { name: kind }).click();
    const form = await dialog(this.page, `Add ${kind}`);
    await form.getByLabel('Name', { exact: true }).fill(input.name);
    if (input.slug !== undefined) await form.getByLabel('Slug', { exact: true }).fill(input.slug);
    if (input.schema) await choose(this.page, form.getByLabel('Schema', { exact: true }), input.schema);
    return form;
  }

  /** Edit (name and slug) from the row menu. */
  async rename(name: string, input: { name?: string; slug?: string }): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Edit');
    const form = await dialog(this.page, 'Edit Content');
    if (input.name !== undefined) await form.getByLabel('Name', { exact: true }).fill(input.name);
    if (input.slug !== undefined) await form.getByLabel('Slug', { exact: true }).fill(input.slug);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Content has been updated.');
  }

  /** Move from the row menu. */
  async openMove(name: string): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Move');
    return dialog(this.page, 'Move');
  }

  /** An option of the Move dialog's folder list, by the folder name ("Root", or a folder's; options read `name | path`). */
  moveTarget(folder: string): Locator {
    return this.page.getByRole('option', { name: new RegExp(`^\\s*${escapeRegExp(folder)}\\s*\\|`) });
  }

  async move(name: string, folder: string): Promise<void> {
    const form = await this.openMove(name);
    await form.getByRole('combobox').click();
    await this.moveTarget(folder).click();
    await form.getByRole('button', { name: 'Move' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Content has been moved.');
  }

  async clone(name: string): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Clone');
    await confirmDialog(this.page, 'Clone Document');
    await expectToast(this.page, `Document '${name}' has been cloned.`);
  }

  async publishRow(name: string, kind: 'Document' | 'Folder'): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Publish');
    await confirmDialog(this.page, `Publish ${kind}`);
    await expectToast(this.page, `${kind} '${name}' has been published.`);
  }

  async unpublishRow(name: string, kind: 'Document' | 'Folder'): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Unpublish');
    await confirmDialog(this.page, `Unpublish ${kind}`);
    await expectToast(this.page, `${kind} '${name}' has been unpublished.`);
  }

  async addFolder(name: string, slug: string): Promise<void> {
    const form = await this.openAdd('Folder', { name, slug });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Folder has been created.');
    // The toast may still be the previous one's: done once the row is there.
    await expect(this.row(name)).toBeVisible();
  }

  async addDocument(name: string, slug: string, schema: string): Promise<void> {
    const form = await this.openAdd('Document', { name, slug, schema });
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Document has been created.');
    await expect(this.row(name)).toBeVisible();
  }

  /** Opens a folder: done once it is the current breadcrumb (new content goes into the current folder). */
  async openFolder(name: string): Promise<void> {
    await this.row(name).click();
    await expect(this.currentFolder).toHaveText(name);
  }

  /** The open folder: the breadcrumb's last item, the only one that is not a button (none at the root). */
  get currentFolder(): Locator {
    return this.folders.getByRole('link');
  }

  async openDocument(name: string): Promise<void> {
    await this.row(name).click();
    await expect(this.page).toHaveURL(/\/contents\/[0-9a-f-]{36}$/);
  }

  async delete(name: string, kind: 'Document' | 'Folder'): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Delete');
    await confirmDialog(this.page, `Delete ${kind}`);
    await expectToast(this.page, `${kind} '${name}' has been deleted.`);
  }

  // --- Editor ---------------------------------------------------------------------------------------------

  /** A schema field in the editor, by its display name. */
  field(label: string): Locator {
    return this.page.getByLabel(label, { exact: true });
  }

  /** A Schema / Schemas field (a fieldset named after the field). */
  blockField(label: string): Locator {
    return this.page.getByRole('group', { name: label, exact: true });
  }

  /** The blocks of a Schema / Schemas field, in order. */
  blocks(field: Locator): Locator {
    return field.getByRole('listitem');
  }

  /** The `#schema` names of a field's blocks, in order (read once: wrap in `expect.poll`). */
  async blockSchemas(field: Locator): Promise<string[]> {
    return (await this.blocks(field).allInnerTexts()).map(it => (it.match(/#(\S+)/) ?? [])[1] ?? '');
  }

  /** The block path above the form: the open block is its last item (a link, not a button; none at the root). */
  get openBlock(): Locator {
    return this.page.getByRole('navigation', { name: 'Blocks' }).getByRole('link');
  }

  /** Back from a block to the document's own fields. */
  async backToDocumentRoot(): Promise<void> {
    await this.page.getByRole('button', { name: 'Document root' }).click();
    await expect(this.openBlock).toHaveCount(0);
  }

  /**
   * The editable area of a Rich Text field, inside the field's group. TipTap's own markup: a `contenteditable` without
   * a role, so it is found by that attribute.
   */
  richText(label: string): Locator {
    return this.page.getByRole('group', { name: label, exact: true }).locator('[contenteditable="true"]');
  }

  /** Picks the option of an Option field. */
  async chooseOption(label: string, option: string): Promise<void> {
    await choose(this.page, this.field(label), option);
  }

  /** Picks options of an Options field (added to those chosen), then closes the list. */
  async chooseOptions(label: string, options: string[]): Promise<void> {
    await this.field(label).click();
    for (const option of options) await this.page.getByRole('option', { name: option, exact: true }).click();
    await this.page.keyboard.press('Escape');
    await expect(this.page.getByRole('listbox')).toHaveCount(0);
  }

  /**
   * Picks documents for a Reference ("Add Reference") or References ("Add References") field in the Contents dialog,
   * opening `folder` (at the root) first when the documents are in one.
   */
  async pickDocuments(button: 'Add Reference' | 'Add References', names: string[], folder?: string): Promise<void> {
    await this.page.getByRole('button', { name: button, exact: true }).click();
    const picker = await dialog(this.page, 'Contents');
    // The name cell reads `name #slug`.
    const row = (name: string) =>
      picker
        .getByRole('row')
        .filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*#`) }) });
    if (folder) {
      await row(folder).click();
      await expect(row(names[0])).toBeVisible();
    }
    for (const name of names) await row(name).click();
    const add = names.length === 1 ? 'Add Selected Document' : `Add Selected Documents (${names.length})`;
    await picker.getByRole('button', { name: add, exact: true }).click();
    await expect(picker).toBeHidden();
  }

  /**
   * Opens the Assets dialog of an Asset ("Add Asset") or Assets ("Add Assets") field, in `folder` (at the root) when
   * given, and returns it with a way to find its rows.
   */
  async openAssetPicker(
    button: 'Add Asset' | 'Add Assets',
    folder?: string,
    field?: string,
  ): Promise<{ picker: Locator; row: (name: string) => Locator }> {
    // `field`: the field's label, when several fields have the same button (its group is named after the label and
    // the button: "Images Add Assets").
    const scope = field ? this.page.getByRole('group', { name: new RegExp(`^${escapeRegExp(field)} ${button}$`) }) : this.page;
    await scope.getByRole('button', { name: button, exact: true }).click();
    const picker = await dialog(this.page, 'Assets');
    // The name cell reads `name.ext`, then the image size; a folder's just its name.
    const row = (name: string) =>
      picker
        .getByRole('row')
        .filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}(\\s|$)`) }) });
    if (folder) await row(folder).click();
    return { picker, row };
  }

  /** Picks files for an Asset ("Add Asset") or Assets ("Add Assets") field in the Assets dialog (in `folder`, if given). */
  async pickAssets(button: 'Add Asset' | 'Add Assets', names: string[], folder?: string, field?: string): Promise<void> {
    const { picker, row } = await this.openAssetPicker(button, folder, field);
    for (const name of names) await row(name).click();
    const add = names.length === 1 ? 'Add Selected Asset' : `Add Selected Assets (${names.length})`;
    await picker.getByRole('button', { name: add, exact: true }).click();
    await expect(picker).toBeHidden();
  }

  /** A document picked in a Reference / References field (the row reads `name #slug`, then the full slug). */
  pickedDocument(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*#`) });
  }

  /** A file picked in an Asset / Assets field (the row reads `name.ext`, then its size). */
  pickedAsset(name: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s`) });
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: /^Save/ }).click();
    await expectToast(this.page, 'Content has been saved in draft.');
  }

  /** Save, refused by the form's rules. */
  async saveExpectInvalid(): Promise<void> {
    await this.page.getByRole('button', { name: /^Save/ }).click();
    await expectToast(this.page, CONTENT_INVALID);
  }

  /** Opens the Errors menu (after a refused Save) and returns its items. */
  async errors(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Errors', exact: true }).click();
    return this.page.getByRole('menu').getByRole('menuitem');
  }

  /** The editor's status icon: "Published", "Draft" or "Not published". */
  editorStatus(status: 'Published' | 'Draft' | 'Not published'): Locator {
    return this.page.getByRole('img', { name: status, exact: true });
  }

  /** Opens a document in the editor by URL. */
  async gotoDocument(spaceId: string, documentId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/contents/${documentId}`);
    await expect(this.page.getByRole('button', { name: 'Back to Contents' })).toBeVisible();
  }

  /** The editor's locale menu: which locale's values the form shows. */
  async editorLocale(name: string): Promise<void> {
    // The trigger is named after the selected locale. A click while the last pick's menu is still closing is lost:
    // retried until the item can be clicked.
    const trigger = this.page.getByRole('button', { name: /^(English|German|Romanian|French)/ }).first();
    const menu = this.page.getByRole('menu');
    // The default locale is listed as "English (Default)".
    const label = new RegExp(`^${escapeRegExp(name)}( \\(Default\\))?$`);
    const item = menu.getByRole('menuitemradio', { name: label });
    await expect(async () => {
      if (!(await menu.isVisible())) await trigger.click();
      await item.click({ timeout: 2_000 });
      await expect(item).toBeChecked({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    // A radio menu stays open after a pick.
    await this.page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: label })).toBeVisible();
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: /^Publish/ }).click();
    await expectToast(this.page, 'Content has been published.');
  }

  // --- Visual Editor ----------------------------------------------------------------------------------------

  async openVisualEditor(): Promise<void> {
    await this.page.getByRole('button', { name: 'Visual Editor', exact: true }).click();
  }

  /** The Visual Editor's preview (an iframe). */
  get preview(): Locator {
    return this.page.getByTitle('Preview', { exact: true });
  }

  /** The customer's page inside the preview. */
  get previewFrame(): FrameLocator {
    return this.preview.contentFrame();
  }
}

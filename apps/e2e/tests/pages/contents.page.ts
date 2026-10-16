import { expect, type Locator, type Page } from '@playwright/test';

import { choose, dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

/** Space → Contents: the folder browser (`/contents`) and the document editor (`/contents/:id`). */
export class ContentsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/contents`);
    await expect(this.page.getByRole('button', { name: 'Add Content' })).toBeVisible();
  }

  /** A row, by the exact content name (the name cell shows `name #slug`). */
  row(name: string): Locator {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*#`) }) });
  }

  get rows(): Locator {
    return this.page.locator('tr[ll-row]');
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

  /** A folder of the breadcrumb trail (not the current one). */
  breadcrumb(name: string): Locator {
    return this.page.locator('nav[hlmBreadcrumb]').last().getByRole('button', { name, exact: true });
  }

  /** Opens "Add Folder" or "Add Document" and fills it, without saving. */
  async openAdd(kind: 'Folder' | 'Document', input: { name: string; slug?: string; schema?: string }): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Add Content' }).click();
    await this.page.getByRole('menuitem', { name: kind }).click();
    const form = await dialog(this.page, `Add ${kind}`);
    await form.getByLabel('Name', { exact: true }).fill(input.name);
    if (input.slug !== undefined) await form.getByLabel('Slug', { exact: true }).fill(input.slug);
    if (input.schema) await choose(this.page, form.locator('#schema'), input.schema);
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

  /** Move from the row menu; `folder` is the option text's start ("Root", or a folder's name). */
  async openMove(name: string): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Move');
    return dialog(this.page, 'Move');
  }

  async move(name: string, folder: string): Promise<void> {
    const form = await this.openMove(name);
    await form.getByPlaceholder('Search folders...').first().click();
    await this.page.getByRole('option', { name: new RegExp(`^\\s*${folder}\\b`) }).click();
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
    await this.page.getByRole('button', { name: 'Add Content' }).click();
    await this.page.getByRole('menuitem', { name: 'Folder' }).click();
    const form = await dialog(this.page, 'Add Folder');
    await form.getByLabel('Name', { exact: true }).fill(name);
    await form.getByLabel('Slug', { exact: true }).fill(slug);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Folder has been created.');
    // The toast may still be the previous one's: done once the row is there.
    await expect(this.row(name)).toBeVisible();
  }

  async addDocument(name: string, slug: string, schema: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Content' }).click();
    await this.page.getByRole('menuitem', { name: 'Document' }).click();
    const form = await dialog(this.page, 'Add Document');
    await form.getByLabel('Name', { exact: true }).fill(name);
    await form.getByLabel('Slug', { exact: true }).fill(slug);
    await choose(this.page, form.locator('#schema'), schema);
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

  get currentFolder(): Locator {
    // The last one: the header has a breadcrumb too.
    return this.page.locator('nav[hlmBreadcrumb] [aria-current="page"]').last();
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

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: /^Save/ }).click();
    await expectToast(this.page, 'Content has been saved in draft.');
  }

  /** Opens a document in the editor by URL. */
  async gotoDocument(spaceId: string, documentId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/contents/${documentId}`);
    await expect(this.page.getByRole('button', { name: 'Back to Contents' })).toBeVisible();
  }

  /** The editor's locale menu: which locale's values the form shows. */
  async editorLocale(name: string): Promise<void> {
    await this.page
      .getByRole('button', { name: /^(English|German|Romanian)/ })
      .first()
      .click();
    await this.page.getByRole('menuitemradio', { name: new RegExp(name) }).click();
  }

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: /^Publish/ }).click();
    await expectToast(this.page, 'Content has been published.');
  }
}

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

  /** A row, by the content name. */
  row(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name });
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

  async publish(): Promise<void> {
    await this.page.getByRole('button', { name: /^Publish/ }).click();
    await expectToast(this.page, 'Content has been published.');
  }
}

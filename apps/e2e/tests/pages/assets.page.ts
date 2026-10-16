import { expect, type Locator, type Page } from '@playwright/test';

import { dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** Space → Assets (`/features/spaces/:spaceId/assets`), list layout (the default). */
export class AssetsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/assets`);
    await expect(this.page.getByRole('button', { name: 'Upload Assets' })).toBeVisible();
    await expect(this.rootFolder).toBeVisible();
  }

  // --- List ----------------------------------------------------------------------------------------------------------

  /** A row, by the name the list shows: `hero.png` for a file, `Images` for a folder. */
  row(name: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The data rows of the current folder. */
  get rows(): Locator {
    return this.page.locator('tr[ll-row]');
  }

  get emptyFolder(): Locator {
    return this.page.getByText('0 total items');
  }

  // --- Folders and breadcrumb ----------------------------------------------------------------------------------------

  get rootFolder(): Locator {
    return this.page.getByRole('button', { name: 'Root folder' });
  }

  /** The folder the breadcrumb shows as current (the header has a breadcrumb too, hence `last`). */
  get currentFolder(): Locator {
    return this.page.locator('nav[hlmBreadcrumb] [aria-current="page"]').last();
  }

  /** A folder in the breadcrumb trail (not the current one). */
  breadcrumb(name: string): Locator {
    return this.page.locator('nav[hlmBreadcrumb]').last().getByRole('button', { name, exact: true });
  }

  async openFolder(name: string): Promise<void> {
    await this.row(name).click();
    await expect(this.currentFolder).toHaveText(name);
  }

  /** Opens "Create new Folder" and fills the name, without saving. */
  async openCreateFolder(name: string): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Create Folder' }).click();
    const form = await dialog(this.page, 'Create new Folder');
    await form.getByLabel('Name', { exact: true }).fill(name);
    return form;
  }

  async createFolder(name: string): Promise<void> {
    const form = await this.openCreateFolder(name);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Folder has been created.');
  }

  // --- Upload --------------------------------------------------------------------------------------------------------

  /** "Upload Assets → From Local": the file picker's input. */
  async upload(...files: FilePayload[]): Promise<void> {
    await this.page.locator('input[type="file"]').setInputFiles(files);
  }

  /** Drops files on the asset area, as from the desktop. */
  async drop(...files: FilePayload[]): Promise<void> {
    const dataTransfer = await this.page.evaluateHandle(
      payloads => {
        const transfer = new DataTransfer();
        for (const { name, mimeType, base64 } of payloads) {
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          transfer.items.add(new File([bytes], name, { type: mimeType }));
        }
        return transfer;
      },
      files.map(it => ({ name: it.name, mimeType: it.mimeType, base64: it.buffer.toString('base64') })),
    );
    const target = this.page.locator('[llFileDragDrop]');
    await target.dispatchEvent('dragover', { dataTransfer });
    await target.dispatchEvent('drop', { dataTransfer });
  }

  /** "Upload Assets → From Link": the browser downloads the URL and uploads it. */
  async uploadFromLink(url: string): Promise<void> {
    this.page.once('dialog', prompt => void prompt.accept(url));
    await this.page.getByRole('button', { name: 'Upload Assets' }).click();
    await this.page.getByRole('menuitem', { name: 'From Link' }).click();
  }

  // --- Move ---------------------------------------------------------------------------------------------------------

  /** Opens Move from the row menu; returns the dialog. */
  async openMove(name: string): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Move');
    return dialog(this.page, 'Move');
  }

  /** The folder options the open Move dialog offers, as `name | path` (`Root | ~` for the root). */
  async moveOptions(form: Locator): Promise<string[]> {
    await form.getByPlaceholder('Search folders...').first().click();
    const options = this.page.getByRole('option');
    await expect(options.first()).toBeVisible();
    return (await options.allInnerTexts()).map(it => it.replace(/\s+/g, ' ').trim());
  }

  /** Moves a file or folder; `folder` is the target's name (`Root` for the root). */
  async move(name: string, folder: string): Promise<void> {
    const form = await this.openMove(name);
    await expect(async () => {
      await form.getByPlaceholder('Search folders...').first().click();
      await this.page.getByRole('option', { name: new RegExp(`^\\s*${folder}\\s*\\|`) }).click({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await form.getByRole('button', { name: 'Move' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Asset has been moved.');
  }

  // --- Layouts and preview -------------------------------------------------------------------------------------------

  async layout(name: 'List Layout' | 'Grid Layout'): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  /** A card of the grid layout, by the name it shows (`hero.png`, `Images`). */
  card(name: string): Locator {
    return this.page.locator('hlm-card').filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  get cards(): Locator {
    return this.page.locator('hlm-card');
  }

  /** Opens a card: a folder, or an image's preview (the picture area, hidden from assistive technology). */
  async openCard(name: string): Promise<void> {
    await this.card(name).locator('.cursor-pointer').first().click();
  }

  /** The image preview dialog (it has no title: a picture with a caption and Close). */
  get preview(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('img', { name: 'thumbnail' }) });
  }

  // --- Edit and delete -----------------------------------------------------------------------------------------------

  /** Opens Edit on a file (`Edit File`) or a folder (`Edit Folder`). */
  async openEdit(name: string, kind: 'File' | 'Folder'): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Edit');
    return dialog(this.page, `Edit ${kind}`);
  }

  async rename(name: string, kind: 'File' | 'Folder', newName: string): Promise<void> {
    const form = await this.openEdit(name, kind);
    await form.getByLabel('Name', { exact: true }).fill(newName);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, `${kind} has been updated.`);
  }

  /** Opens the delete confirmation and returns it, without confirming. */
  async openDelete(name: string): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Delete');
    const confirm = this.page.getByRole('dialog').filter({ hasText: /Delete (Asset|Folder)/ });
    await expect(confirm).toBeVisible();
    return confirm;
  }

  /** Deletes a file or folder; `assetName` is the name without extension the toast uses. */
  async delete(name: string, kind: 'Asset' | 'Folder', assetName: string): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Delete');
    await confirmDialog(this.page, `Delete ${kind}`);
    await expectToast(this.page, `Asset '${assetName}' has been deleted.`);
  }
}

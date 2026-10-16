import { expect, type Locator, type Page } from '@playwright/test';

import type { FilePayload } from '../support/files';
import { escapeRegExp } from '../support/text';
import { choose, dialog, rowMenu } from './dialogs';
import { expectToast } from './notifications';

/** Space → Assets (`/features/spaces/:spaceId/assets`), list layout (the default). */
export class AssetsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/assets`);
    await expect(this.page.getByRole('button', { name: 'Upload Assets' })).toBeVisible();
    await expect(this.rootFolder).toBeVisible();
  }

  /** The asset area: the list or the grid of the open folder, and where files are dropped. */
  get area(): Locator {
    return this.page.getByRole('region', { name: 'Assets', exact: true });
  }

  // --- List ----------------------------------------------------------------------------------------------------------

  /** A row, by the name the list shows: `hero.png` for a file, `Images` for a folder. */
  row(name: string): Locator {
    return this.rows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  /** The data rows of the current folder (each has an Actions menu; the header and the "empty" row have none). */
  get rows(): Locator {
    return this.area.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'Actions', exact: true }) });
  }

  get emptyFolder(): Locator {
    return this.page.getByText('0 total items');
  }

  // --- Folders and breadcrumb ----------------------------------------------------------------------------------------

  /** The breadcrumb of the open folder (the header has a breadcrumb of its own). */
  get folderPath(): Locator {
    return this.page.getByRole('navigation', { name: 'Folder path', exact: true });
  }

  get rootFolder(): Locator {
    return this.folderPath.getByRole('button', { name: 'Root folder' });
  }

  /** The folder the breadcrumb shows as current (a disabled link, `aria-current="page"`). */
  get currentFolder(): Locator {
    return this.folderPath.getByRole('link', { disabled: true });
  }

  /** A folder in the breadcrumb trail (not the current one). */
  breadcrumb(name: string): Locator {
    return this.folderPath.getByRole('button', { name, exact: true });
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

  /** "Upload Assets → From Local": picks the files in the browser's file chooser. */
  async upload(...files: FilePayload[]): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.page.getByRole('button', { name: 'Upload Assets' }).click();
    await this.page.getByRole('menuitem', { name: 'From Local' }).click();
    await (await chooser).setFiles(files);
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
    await this.area.dispatchEvent('dragover', { dataTransfer });
    await this.area.dispatchEvent('drop', { dataTransfer });
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

  /** The Move dialog's folder field (a combobox that searches the folders). */
  folderField(form: Locator): Locator {
    return form.getByRole('combobox', { name: 'Folder', exact: true });
  }

  /**
   * Opens the folder list of the Move dialog and returns its options, each `name | path` (`Root | ~` for the root).
   * The folders load after the dialog opens: check them with a retrying `expect(...).toHaveText([...])`.
   */
  async openMoveOptions(form: Locator): Promise<Locator> {
    await this.folderField(form).click();
    return this.page.getByRole('option');
  }

  /** Picks the target folder in the open Move dialog by its name (`Root` for the root) and moves. */
  async moveTo(form: Locator, folder: string): Promise<void> {
    await choose(this.page, this.folderField(form), new RegExp(`^\\s*${escapeRegExp(folder)}\\s*\\|`));
    await expect(this.folderField(form)).toHaveValue(new RegExp(`^${escapeRegExp(folder)} \\|`));
    await form.getByRole('button', { name: 'Move' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'Asset has been moved.');
  }

  /** Moves a file or folder; `folder` is the target's name (`Root` for the root). */
  async move(name: string, folder: string): Promise<void> {
    await this.moveTo(await this.openMove(name), folder);
  }

  // --- Layouts and preview -------------------------------------------------------------------------------------------

  async layout(name: 'List Layout' | 'Grid Layout'): Promise<void> {
    await this.page.getByRole('button', { name }).click();
  }

  /** The cards of the grid layout. */
  get cards(): Locator {
    return this.page.getByRole('list', { name: 'Asset cards', exact: true }).getByRole('listitem');
  }

  /** A card of the grid layout, by the name it shows (`hero.png`, `Images`). */
  card(name: string): Locator {
    return this.page.getByRole('list', { name: 'Asset cards', exact: true }).getByRole('listitem', { name, exact: true });
  }

  /** Opens a card: a folder, or an image's preview (the picture at the top of the card, a button named "Open …"). */
  async openCard(name: string): Promise<void> {
    await this.card(name)
      .getByRole('button', { name: `Open ${name}`, exact: true })
      .click();
  }

  /** The image preview dialog: a picture with a caption and Close, named after the file (a visually hidden title). */
  get preview(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('button', { name: 'Close', exact: true }) });
  }

  /** The preview dialog of this file, found by its accessible name. */
  previewOf(fileName: string): Locator {
    return this.page.getByRole('dialog', { name: fileName, exact: true });
  }

  // --- Edit and delete -----------------------------------------------------------------------------------------------

  /** Opens Edit on a file (`Edit File`) or a folder (`Edit Folder`). */
  async openEdit(name: string, kind: 'File' | 'Folder'): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Edit');
    return dialog(this.page, `Edit ${kind}`);
  }

  /** Saves an open Edit dialog and waits for it to close and for the toast. */
  async saveEdit(form: Locator, kind: 'File' | 'Folder'): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, `${kind} has been updated.`);
  }

  /** Edits a file: its name (without the extension, which stays) and/or its alt text. */
  async editFile(name: string, changes: { name?: string; alt?: string }): Promise<void> {
    const form = await this.openEdit(name, 'File');
    if (changes.name !== undefined) await form.getByLabel('Name', { exact: true }).fill(changes.name);
    if (changes.alt !== undefined) await form.getByLabel('Alt Text').fill(changes.alt);
    await this.saveEdit(form, 'File');
  }

  async rename(name: string, kind: 'File' | 'Folder', newName: string): Promise<void> {
    if (kind === 'File') return this.editFile(name, { name: newName });
    const form = await this.openEdit(name, kind);
    await form.getByLabel('Name', { exact: true }).fill(newName);
    await this.saveEdit(form, kind);
  }

  /** Opens the delete confirmation of a file (`Delete Asset`) or a folder (`Delete Folder`), without confirming. */
  async openDelete(name: string, kind: 'Asset' | 'Folder'): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Delete');
    return dialog(this.page, `Delete ${kind}`);
  }

  /** Deletes a file or folder; `assetName` is the name without extension the toast uses. */
  async delete(name: string, kind: 'Asset' | 'Folder', assetName: string): Promise<void> {
    await this.confirmDelete(await this.openDelete(name, kind), assetName);
  }

  /** Confirms an open delete confirmation and waits for it to close and for the toast. */
  async confirmDelete(confirm: Locator, assetName: string): Promise<void> {
    await confirm.getByRole('button', { name: 'OK' }).click();
    await expect(confirm).toBeHidden();
    await expectToast(this.page, `Asset '${assetName}' has been deleted.`);
  }
}

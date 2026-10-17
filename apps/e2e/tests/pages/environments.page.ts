import { expect, type Locator, type Page } from '@playwright/test';

import { dialog } from './dialogs';
import { dragAbove } from './drag';
import { confirmDialog, expectToast } from './notifications';

export interface EnvironmentInput {
  name: string;
  url: string;
}

/** Space → Settings → Visual Editor (`/features/spaces/:spaceId/settings/visual-editor`): the preview environments. */
export class EnvironmentsPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/settings/visual-editor`);
    await expect(this.page.getByRole('button', { name: 'Add Environment' })).toBeVisible();
  }

  /** The environment cards. */
  items(): Locator {
    return this.page.getByRole('list', { name: 'Environments' }).getByRole('listitem');
  }

  item(name: string): Locator {
    return this.items().filter({ hasText: name });
  }

  async add(environment: EnvironmentInput): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Environment' }).click();
    await this.save(await this.fillDialog('Add Environment', environment));
    await expectToast(this.page, 'Environment has been added.');
  }

  async edit(currentName: string, environment: EnvironmentInput): Promise<void> {
    await this.save(await this.openEdit(currentName, environment));
    await expectToast(this.page, `Environment '${environment.name}' has been updated.`);
  }

  /** Opens "Edit Environment" and fills it, without saving. */
  async openEdit(currentName: string, environment: EnvironmentInput): Promise<Locator> {
    await this.item(currentName).getByRole('button', { name: 'Edit' }).click();
    return this.fillDialog('Edit Environment', environment);
  }

  /** The environment names in order (the first is the default). */
  async names(): Promise<string[]> {
    const titles = await this.items().locator('[hlmItemTitle]').allInnerTexts();
    return titles.map(it => it.replace('(default)', '').trim());
  }

  /** Drags an environment above another one. */
  async moveAbove(name: string, above: string): Promise<void> {
    await dragAbove(this.page, this.item(name).getByRole('button', { name: 'Move' }), this.item(above), async () => {
      const names = await this.names();
      return names.indexOf(name) < names.indexOf(above);
    });
  }

  async delete(name: string): Promise<void> {
    await this.item(name).getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(this.page, 'Delete Environment');
    await expectToast(this.page, `Environment '${name}' has been deleted.`);
  }

  private async save(form: Locator): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
  }

  private async fillDialog(title: string, { name, url }: EnvironmentInput): Promise<Locator> {
    const form = await dialog(this.page, title);
    await form.getByLabel('Name').fill(name);
    await form.getByLabel('URL').fill(url);
    return form;
  }
}

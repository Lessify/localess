import { expect, type Locator, type Page } from '@playwright/test';

import { dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export interface WebhookInput {
  name?: string;
  url?: string;
  /** Events to add (the chips have no accessible remove button). */
  events?: string[];
  secret?: string;
}

/** Space → Developers → Webhooks: the list (`/developers/webhooks`) and a webhook's page with its logs (`/:id`). */
export class WebhooksPage {
  constructor(private readonly page: Page) {}

  async goto(spaceId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/developers/webhooks`);
    await expect(this.page.getByRole('button', { name: 'Add Webhook' })).toBeVisible();
  }

  async gotoDetail(spaceId: string, webhookId: string): Promise<void> {
    await this.page.goto(`/features/spaces/${spaceId}/developers/webhooks/${webhookId}`);
    await expect(this.page.getByRole('heading', { name: 'Logs' })).toBeVisible();
  }

  get empty(): Locator {
    return this.page.getByText('No webhooks yet.');
  }

  row(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name });
  }

  async create(input: WebhookInput & { name: string; url: string }): Promise<void> {
    await this.page.getByRole('button', { name: 'Add Webhook' }).click();
    await this.save(await this.fill('Add Webhook', input));
    await expectToast(this.page, 'Webhook has been created.');
  }

  async edit(name: string, input: WebhookInput): Promise<void> {
    await this.save(await this.openEdit(name, input));
    await expectToast(this.page, 'Webhook has been updated.');
  }

  /** Opens "Edit Webhook" from the row menu and fills it, without saving. */
  async openEdit(name: string, input: WebhookInput): Promise<Locator> {
    await rowMenu(this.page, this.row(name), 'Edit');
    return this.fill('Edit Webhook', input);
  }

  /** Enable or Disable from the row menu. */
  async toggle(name: string, action: 'Enable' | 'Disable'): Promise<void> {
    await rowMenu(this.page, this.row(name), action);
    await expectToast(this.page, `Webhook '${name}' has been ${action === 'Enable' ? 'enabled' : 'disabled'}.`);
  }

  async delete(name: string): Promise<void> {
    await rowMenu(this.page, this.row(name), 'Delete');
    await confirmDialog(this.page, 'Delete Webhook');
    await expectToast(this.page, `Webhook '${name}' has been deleted.`);
  }

  /** The log rows of the webhook page (not their expanded details). */
  get logs(): Locator {
    return this.page.locator('tr[ll-row]').filter({ has: this.page.locator('td.font-mono') });
  }

  /** A value of an expanded log's details (a term / definition pair of its description list). */
  logField(term: string): Locator {
    // Each pair is wrapped in a <div> of the <dl>.
    return this.page
      .locator('dl > div')
      .filter({ has: this.page.getByRole('term').filter({ hasText: term }) })
      .getByRole('definition');
  }

  private async save(form: Locator): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
  }

  private async fill(title: string, input: WebhookInput): Promise<Locator> {
    const form = await dialog(this.page, title);
    if (input.name !== undefined) await form.getByLabel('Name', { exact: true }).fill(input.name);
    if (input.url !== undefined) await form.getByLabel('URL', { exact: true }).fill(input.url);
    for (const event of input.events ?? []) {
      await expect(async () => {
        await form.getByPlaceholder('Select events...').click();
        await this.page.getByRole('option', { name: event, exact: true }).click({ timeout: 2_000 });
        await expect(form.locator('hlm-combobox-chip').filter({ hasText: event })).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      // Closes the list (Escape would close the dialog once the list is gone).
      await form.getByRole('heading', { name: title }).click();
      await expect(this.page.getByRole('listbox')).toHaveCount(0);
    }
    if (input.secret !== undefined) await form.getByLabel('Secret (Optional)').fill(input.secret);
    return form;
  }
}

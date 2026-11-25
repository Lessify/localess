import { expect, type Locator, type Page } from '@playwright/test';

import { confirmDialog, expectToast } from './notifications';

/** Admin → Settings → Integrations (`/features/admin/settings`): one card per integration. */
export class AdminSettingsPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/features/admin/settings');
    await expect(this.page.getByRole('heading', { name: 'Integrations', level: 1 })).toBeVisible();
    await expect(this.card('Unsplash')).toBeVisible();
  }

  /** The card of an integration, by its name (`Unsplash`, `DeepL`, `Google Cloud Translation`). */
  card(name: string): Locator {
    return this.page.getByRole('region', { name, exact: true });
  }

  /** The card's state badge: `Not connected`, `Connected`, `Server configuration`, `Key rejected`, … */
  badge(name: string, label: string): Locator {
    return this.card(name).getByText(label, { exact: true });
  }

  /** The answer of the last test or save, under the card. */
  result(name: string): Locator {
    return this.card(name).getByRole('status');
  }

  /** Connect → fills the generated form by its labels → Test & enable. Leaves the toast or the result to the caller. */
  async connect(name: string, values: Record<string, string>): Promise<void> {
    const card = this.card(name);
    const connect = card.getByRole('button', { name: 'Connect', exact: true });
    if (await connect.isVisible()) await connect.click();
    for (const [label, value] of Object.entries(values)) await card.getByLabel(label, { exact: true }).fill(value);
    await card.getByRole('button', { name: 'Test & enable' }).click();
  }

  /** Disconnect, confirmed; waits for the toast. */
  async disconnect(name: string): Promise<void> {
    await this.card(name).getByRole('button', { name: 'Disconnect' }).click();
    await confirmDialog(this.page, `Disconnect ${name}`);
    await expectToast(this.page, `${name} is disconnected.`);
  }
}

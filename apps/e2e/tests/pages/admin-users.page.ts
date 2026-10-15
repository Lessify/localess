import { expect, type Locator, type Page } from '@playwright/test';

import { choose, dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';

export interface InviteInput {
  email: string;
  password: string;
  displayName?: string;
  role: 'None' | 'Custom' | 'Admin';
  /** Permission ids (`TRANSLATION_READ`, ...); for the Custom role. */
  permissions?: string[];
}

/** Admin → Users (`/features/admin/users`). */
export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/features/admin/users');
    await expect(this.page.getByRole('button', { name: 'Invite' })).toBeVisible();
  }

  row(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  async invite(input: InviteInput): Promise<void> {
    await this.page.getByRole('button', { name: 'Invite' }).click();
    const form = await dialog(this.page, 'User Invite');
    await form.getByLabel('Email').fill(input.email);
    await form.getByLabel('Password').fill(input.password);
    if (input.displayName) await form.getByLabel('Display Name').fill(input.displayName);
    await choose(this.page, form.locator('#role'), input.role);
    // Checkbox labels repeat per group ("Read", "Create"), the ids are the permission ids.
    for (const permission of input.permissions ?? []) await form.locator(`[id="${permission}"]`).click();
    await form.getByRole('button', { name: 'Invite' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been invited.');
  }

  async action(email: string, item: string): Promise<void> {
    await rowMenu(this.page, this.row(email), item);
  }

  async disable(email: string): Promise<void> {
    await this.action(email, 'Disable');
    await confirmDialog(this.page, 'Disable User');
    await expectToast(this.page, `User '${email}' has been disabled.`);
  }

  async enable(email: string): Promise<void> {
    await this.action(email, 'Enable');
    await expectToast(this.page, `User '${email}' has been enabled.`);
  }

  async delete(email: string): Promise<void> {
    await this.action(email, 'Delete');
    await confirmDialog(this.page, 'Delete User');
    await expectToast(this.page, `User '${email}' has been deleted.`);
  }
}

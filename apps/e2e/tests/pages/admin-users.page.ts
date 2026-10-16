import { expect, type Locator, type Page } from '@playwright/test';

import { choose, dialog, rowMenu } from './dialogs';
import { ADMIN } from '../support/env';
import { confirmDialog, expectToast } from './notifications';
import { cellUnder } from './table';

export type RoleLabel = 'None' | 'Custom' | 'Admin';

export interface InviteInput {
  email: string;
  password: string;
  displayName?: string;
  role: RoleLabel;
  /** Permission ids (`TRANSLATION_READ`, ...); for the Custom role. */
  permissions?: string[];
}

export interface AccessInput {
  role: RoleLabel;
  /** Permission ids to switch on or off (the checkboxes toggle); for the Custom role. */
  togglePermissions?: string[];
  /** Switches Lock User on or off; for the Custom role. */
  toggleLock?: boolean;
}

/**
 * A permission's checkbox in the invite or edit dialog, by the permission id (`TRANSLATION_READ`): its label ("Read")
 * repeats in every group, the id is unique and is what the API stores.
 */
export function permission(form: Locator, id: string): Locator {
  return form.locator(`[role="checkbox"][id="${id}"]`);
}

/** Admin → Users (`/features/admin/users`). */
export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/features/admin/users');
    await expect(this.page.getByRole('button', { name: 'Invite' })).toBeVisible();
    // The table has loaded once the seeded admin is listed.
    await expect(this.row(ADMIN.email)).toBeVisible();
  }

  row(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  /** The Role column of a user's row: `ADMIN`, `CUSTOM` or `NONE`. */
  roleCell(email: string): Promise<Locator> {
    return cellUnder(this.page.getByRole('table'), this.row(email), 'Role');
  }

  /** The lock icon of a locked custom user. */
  async lockIcon(email: string): Promise<Locator> {
    return (await this.roleCell(email)).getByRole('img', { name: 'Locked' });
  }

  /** The Active column's icon: "User is Active" or "User is Disabled". */
  status(email: string, status: 'Active' | 'Disabled'): Locator {
    return this.row(email).getByRole('img', { name: `User is ${status}` });
  }

  async invite(input: InviteInput): Promise<void> {
    await this.page.getByRole('button', { name: 'Invite' }).click();
    const form = await dialog(this.page, 'User Invite');
    await form.getByLabel('Email').fill(input.email);
    await form.getByLabel('Password').fill(input.password);
    if (input.displayName) await form.getByLabel('Display Name').fill(input.displayName);
    await choose(this.page, form.getByLabel('Role', { exact: true }), input.role);
    // Checkbox labels repeat per group ("Read", "Create"), the ids are the permission ids.
    for (const id of input.permissions ?? []) await permission(form, id).click();
    await form.getByRole('button', { name: 'Invite' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been invited.');
  }

  /** Edit: role, permissions and Lock User (all the admin can change on an existing user). */
  async editAccess(email: string, input: AccessInput): Promise<void> {
    await this.action(email, 'Edit');
    const form = await dialog(this.page, 'User');
    await choose(this.page, form.getByLabel('Role', { exact: true }), input.role);
    if (input.toggleLock) await form.getByRole('switch', { name: 'Lock User' }).click();
    for (const id of input.togglePermissions ?? []) await permission(form, id).click();
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been updated.');
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

  /** Copies the user's password reset link to the clipboard (needs clipboard permissions) and returns it. */
  async copyResetLink(email: string): Promise<string> {
    await this.action(email, 'Copy password reset link');
    await expectToast(this.page, `Password reset link for '${email}' copied to clipboard.`);
    return this.page.evaluate(() => navigator.clipboard.readText());
  }
}

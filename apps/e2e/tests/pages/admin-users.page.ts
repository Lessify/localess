import { expect, type Locator, type Page } from '@playwright/test';

import { dialog, rowMenu } from './dialogs';
import { confirmDialog, expectToast } from './notifications';
import { cellUnder } from './table';

/** A role as the role cards and the Role column show it. */
export type RoleLabel = 'None' | 'Admin' | 'Developer' | 'Editor' | 'Translator' | 'Viewer';

export interface InviteInput {
  email: string;
  password: string;
  displayName?: string;
  role: RoleLabel;
}

export interface AccessInput {
  role: RoleLabel;
}

/** Admin → Users (`/features/admin/users`). */
export class AdminUsersPage {
  constructor(private readonly page: Page) {}

  /** The list; with `search`, narrowed to it (one page is listed: a given user may be on another). */
  async goto(search?: string): Promise<void> {
    await this.page.goto('/features/admin/users');
    await expect(this.page.getByRole('button', { name: 'Invite' })).toBeVisible();
    // The table has loaded once its total shows (one page is listed: a given user may be on another).
    await expect(this.page.getByText(/^\d+ total items$/)).toBeVisible();
    if (search !== undefined) await this.find(search);
  }

  /** Narrows the table to rows matching `text` (server-side search), once the server has answered it. */
  async find(text: string): Promise<void> {
    const answered = this.page.waitForResponse(
      response =>
        response.url().includes('/api/app/users?') && new URL(response.url()).searchParams.get('search') === (text.trim() || null),
    );
    await this.page.getByPlaceholder(/^Search/).fill(text);
    await answered;
  }

  row(email: string): Locator {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  /** The Role column of a user's row: the role's label (`Editor`), or `None`. */
  roleCell(email: string): Promise<Locator> {
    return cellUnder(this.page.getByRole('table'), this.row(email), 'Role');
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
    await this.chooseRole(form, input.role);
    await form.getByRole('button', { name: 'Invite' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been invited.');
  }

  /** Edit: the role (all the admin can change on an existing user). */
  async editAccess(email: string, input: AccessInput): Promise<void> {
    const form = await this.openEditAccess(email, input);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been updated.');
  }

  /** Opens Edit and chooses the role, without saving. */
  async openEditAccess(email: string, input: AccessInput): Promise<Locator> {
    await this.action(email, 'Edit');
    const form = await dialog(this.page, 'User');
    await this.chooseRole(form, input.role);
    return form;
  }

  /** The role cards (a radio each, named by its title): None, Admin, Developer, Editor, Translator, Viewer. */
  roleCards(form: Locator): Locator {
    return form.getByRole('group', { name: 'Role' }).getByRole('radio');
  }

  async chooseRole(form: Locator, role: RoleLabel): Promise<void> {
    const card = form.getByRole('radio', { name: role, exact: true });
    // The radio input is visually hidden: click the card's title, as a user does.
    await form.getByRole('group', { name: 'Role' }).getByText(role, { exact: true }).click();
    await expect(card).toBeChecked();
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

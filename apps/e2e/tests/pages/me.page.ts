import { expect, type Locator, type Page } from '@playwright/test';

import { dialog } from './dialogs';
import { expectToast } from './notifications';

/** Me → profile (`/features/me`): the signed-in user's own account. */
export class MePage {
  constructor(private readonly page: Page) {}

  async goto(email: string): Promise<void> {
    await this.page.goto('/features/me');
    await expect(this.field('Email')).toContainText(email);
  }

  /** A line of the profile card, e.g. field('Role') → "Role: CUSTOM". */
  field(label: 'Email' | 'Email Verified' | 'Role' | 'Permissions'): Locator {
    return this.page.locator('[hlmCardContent] > div').filter({ hasText: new RegExp(`^${label}:`) });
  }

  get heading(): Locator {
    return this.page.locator('[hlmCardHeader]').getByRole('heading');
  }

  get avatar(): Locator {
    return this.page.getByRole('img', { name: 'avatar' });
  }

  button(name: 'Update Profile' | 'Update Email' | 'Update Password'): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Opens "Update Profile" and fills it, without saving. */
  async openProfile(values: { displayName?: string; photoURL?: string }): Promise<Locator> {
    await this.button('Update Profile').click();
    const form = await dialog(this.page, 'User');
    if (values.displayName !== undefined) await form.getByLabel('Display Name').fill(values.displayName);
    if (values.photoURL !== undefined) await form.getByLabel('Avatar URL').fill(values.photoURL);
    return form;
  }

  async updateProfile(values: { displayName?: string; photoURL?: string }): Promise<void> {
    const form = await this.openProfile(values);
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();
    await expectToast(this.page, 'User has been updated.');
  }

  /** Opens "Update Email" and fills it, without saving. */
  async openEmail(currentPassword: string, newEmail: string): Promise<Locator> {
    await this.button('Update Email').click();
    const form = await dialog(this.page, 'Update Email');
    await form.getByLabel('Current Password').fill(currentPassword);
    await form.getByLabel('New Email').fill(newEmail);
    return form;
  }

  /** Opens "Update Password" and fills it, without saving. */
  async openPassword(currentPassword: string, newPassword: string): Promise<Locator> {
    await this.button('Update Password').click();
    const form = await dialog(this.page, 'Update Password');
    await form.getByLabel('Current Password').fill(currentPassword);
    await form.getByLabel('New Password').fill(newPassword);
    return form;
  }

  /** Saves an open dialog and waits for the toast. */
  async save(form: Locator, toast: string): Promise<void> {
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(this.page, toast);
  }
}

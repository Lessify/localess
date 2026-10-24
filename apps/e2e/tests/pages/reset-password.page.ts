import { expect, type Page } from '@playwright/test';

/** "Forgot password?" (`/auth/reset`) and the page a reset link opens (`/auth/reset/confirm?token=…`). */
export class ResetPasswordPage {
  constructor(private readonly page: Page) {}

  /** Asks for a reset mail; resolves once the server answered (any mail is sent by then). */
  async request(email: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
    // The server sends the mail before it answers, and the mail catcher stores it before it acknowledges.
    const answered = this.page.waitForResponse(response => response.url().endsWith('/api/auth/password-reset/request'));
    await this.page.getByRole('button', { name: 'Reset Password' }).click();
    expect((await answered).status()).toBe(204);
    await expect(this.page.getByRole('status')).toContainText('If an account exists for that address, a reset link is on its way.');
  }

  /** Fills the new password (and its repetition) on the page a reset link opens, and submits. */
  async setPassword(password: string, repeat = password): Promise<void> {
    await this.page.getByLabel('New password', { exact: true }).fill(password);
    await this.page.getByLabel('Repeat new password').fill(repeat);
    await this.page.getByRole('button', { name: 'Change password' }).click();
  }

  async expectChanged(): Promise<void> {
    await expect(this.page.getByRole('status')).toContainText('Your password has been changed');
  }

  async expectInvalidLink(): Promise<void> {
    await expect(this.page.getByText('This reset link is invalid or has expired.')).toBeVisible();
  }
}

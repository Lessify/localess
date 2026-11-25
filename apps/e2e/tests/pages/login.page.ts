import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }

  /** Sign-in reloads the app into the shell, which lands on the welcome page. */
  async expectSignedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/\/features\/welcome/);
    await expect(this.page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  }
}

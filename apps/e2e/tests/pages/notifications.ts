import { expect, type Page } from '@playwright/test';

/** Waits for a toast (ngx-sonner) with this text. */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

/** Confirms the open ConfirmationDialogComponent. */
export async function confirmDialog(page: Page, title: string): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(dialog).toBeHidden();
}

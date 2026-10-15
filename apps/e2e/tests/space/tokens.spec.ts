import { dialog } from '../pages/dialogs';
import { confirmDialog, expectToast } from '../pages/notifications';
import type { Page } from '@playwright/test';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';

async function createToken(page: Page, name: string, type: 'Public' | 'Preview' | 'Management'): Promise<void> {
  await page.getByRole('button', { name: 'Add Token' }).click();
  const form = await dialog(page, 'Token Form');
  await form.getByLabel('Name', { exact: true }).fill(name);
  // The radio's label also holds a description, so it is picked by the radio's id.
  await form.locator(`label[for="token-type-${type.toLowerCase()}"]`).click();
  await form.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Token has been created.');
}

async function tokenNamed(api: AppApi, spaceId: string, name: string): Promise<string> {
  const tokens = await api.get<{ name: string; token: string }[]>(`/api/app/spaces/${spaceId}/tokens`);
  const token = tokens.find(it => it.name === name);
  expect(token, `token '${name}'`).toBeDefined();
  return token!.token;
}

test.describe('Space settings → Access Tokens', () => {
  test('creates a public token that opens the CDN API @smoke', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    await page.goto(`/features/spaces/${space.id}/settings/tokens`);
    // Every space starts with a preview token.
    await expect(page.getByRole('row').filter({ hasText: 'Auto Generated Preview Token' })).toBeVisible();

    await createToken(page, 'Website', 'Public');
    const row = page.getByRole('row').filter({ hasText: 'Website' });
    await expect(row).toContainText('Public');

    const token = await tokenNamed(api, space.id, 'Website');
    const cdn = await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    expect(await cdn.json()).toEqual({ k1: 'v' });
  });

  test('shows a management token once, in a dialog that must be acknowledged', async ({ page, space }) => {
    await page.goto(`/features/spaces/${space.id}/settings/tokens`);

    await createToken(page, 'CI pipeline', 'Management');
    const secret = await dialog(page, 'Copy your token');
    await expect(secret.getByText(/^mgt_/)).toBeVisible();
    await expect(secret.getByText(/localess login/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(secret).toBeVisible();
    await secret.getByRole('button', { name: "I've copied it" }).click();
    await expect(secret).toBeHidden();

    await expect(page.getByRole('row').filter({ hasText: 'CI pipeline' })).toContainText('Management');
  });

  test('regenerating a token cuts off the old value; deleting removes it', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    const { token: oldValue } = await api.createToken(space.id, { name: 'Rotate me', type: 'public' });
    const cdn = (token: string) => request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    await page.goto(`/features/spaces/${space.id}/settings/tokens`);
    const row = page.getByRole('row').filter({ hasText: 'Rotate me' });

    await row.getByRole('button', { name: 'Regenerate' }).click();
    await confirmDialog(page, 'Regenerate Token');
    await expectToast(page, "Token 'Rotate me' has been regenerated.");
    expect((await cdn(oldValue)).status()).toBe(401);
    const newValue = await tokenNamed(api, space.id, 'Rotate me');
    expect((await cdn(newValue)).status()).toBe(200);

    await row.getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(page, 'Delete Token');
    await expectToast(page, "Token 'Rotate me' has been deleted.");
    await expect(row).toHaveCount(0);
    expect((await cdn(newValue)).status()).toBe(401);
  });
});

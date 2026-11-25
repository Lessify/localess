import { dialog } from '../pages/dialogs';
import { expectToast } from '../pages/notifications';
import { tokensOf, TokensPage } from '../pages/tokens.page';
import type { AppApi } from '../support/app-api';
import { expect, test, uniqueName } from '../support/fixtures';

async function tokenNames(api: AppApi, spaceId: string): Promise<string[]> {
  return (await tokensOf(api, spaceId)).map(it => it.name).sort();
}

test.describe('Space settings → Access Tokens', () => {
  test('the Token Form refuses a name under 3 characters and saves a valid one', async ({ page, api, space }) => {
    const name = uniqueName('Website');
    const tokens = new TokensPage(page);
    const row = (text: string) => tokens.row(text);

    // Pre-check: the space has only its auto-generated preview token, in the UI and the API.
    await tokens.goto(space.id);
    expect(await tokenNames(api, space.id)).toEqual(['Auto Generated Preview Token']);

    await page.getByRole('button', { name: 'Add Token' }).click();
    const form = await dialog(page, 'Token Form');
    const nameInput = form.getByLabel('Name', { exact: true });
    const save = form.getByRole('button', { name: 'Save' });
    // An empty name can not be saved.
    await expect(save).toBeDisabled();

    // Action: a name that is too short.
    await nameInput.fill('ab');
    await nameInput.blur();

    // Post-check: an error, no way to save, nothing stored.
    await expect(form.getByText('Minimum length is 3.')).toBeVisible();
    await expect(save).toBeDisabled();
    expect(await tokenNames(api, space.id)).toEqual(['Auto Generated Preview Token']);

    // Action: a valid name.
    await nameInput.fill(name);

    // Post-check: the error is gone and the token is saved.
    await expect(form.getByText('Minimum length is 3.')).toHaveCount(0);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(form).toBeHidden();
    await expectToast(page, 'Token has been created.');
    await expect(row(name)).toContainText('Public');
    await page.reload();
    await expect(row(name)).toContainText('Public');
    expect(await tokenNames(api, space.id)).toEqual(['Auto Generated Preview Token', name].sort());
  });
});

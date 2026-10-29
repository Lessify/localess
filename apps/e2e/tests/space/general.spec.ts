import { expectToast } from '../pages/notifications';
import { expect, test, uniqueName } from '../support/fixtures';

test.describe('Space settings → General', () => {
  test('renames the space; the space switcher follows', async ({ page, api, space }) => {
    const newName = uniqueName('E2E General');
    await page.goto(`/features/spaces/${space.id}/settings/general`);
    await expect(page.getByLabel('Space ID')).toHaveValue(space.id);
    // The form is filled once the space has loaded; typing before that would be overwritten.
    await expect(page.getByLabel('Space Name')).toHaveValue(space.name);
    await expect(page.getByRole('button', { name: space.name })).toBeVisible();

    await page.getByLabel('Space Name').fill(newName);
    await page.getByRole('button', { name: 'Save' }).click();

    await expectToast(page, 'Space has been updated.');
    await expect(page.getByRole('button', { name: newName })).toBeVisible();
    expect((await api.findSpace(space.id))?.name).toBe(newName);
    await page.reload();
    await expect(page.getByLabel('Space Name')).toHaveValue(newName);
  });
});

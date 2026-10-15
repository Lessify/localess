import { AdminSpacesPage } from '../pages/admin-spaces.page';
import { expect, test, uniqueName } from '../support/fixtures';

test.describe('Admin → Spaces', () => {
  test('creates a space, which then shows up in the space switcher @smoke', async ({ page, api }) => {
    const spaces = new AdminSpacesPage(page);
    const name = uniqueName('E2E Space');
    await spaces.goto();

    await spaces.create(name);
    await expect(spaces.row(name)).toBeVisible();
    const id = await spaces.idOf(name);

    try {
      // The new space opens like any other.
      await page.goto(`/features/spaces/${id}/settings/general`);
      await expect(page.getByRole('button', { name })).toBeVisible();
    } finally {
      await api.deleteSpace(id);
    }
  });

  test('renames a space', async ({ page, space }) => {
    const spaces = new AdminSpacesPage(page);
    const newName = uniqueName('E2E Renamed');
    await spaces.goto();

    await spaces.rename(space.name, newName);
    await expect(spaces.row(newName)).toBeVisible();
    await page.reload();
    await expect(spaces.row(newName)).toBeVisible();
    await expect(spaces.row(space.name)).toHaveCount(0);
  });

  test('deletes a space', async ({ page, api }) => {
    const { name } = await api.createSpace(uniqueName('E2E Delete'));
    const spaces = new AdminSpacesPage(page);
    await spaces.goto();

    await spaces.delete(name);
    await expect(spaces.row(name)).toHaveCount(0);
    await page.reload();
    await expect(spaces.row(name)).toHaveCount(0);
  });
});

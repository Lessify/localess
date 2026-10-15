import { EnvironmentsPage } from '../pages/environments.page';
import { expect, test } from '../support/fixtures';

test.describe('Space settings → Visual Editor environments', () => {
  test('adds, edits and removes an environment', async ({ page, space }) => {
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect(page.getByText('No environments yet.')).toBeVisible();

    await environments.add({ name: 'Staging', url: 'https://staging.example.com/' });
    await expect(environments.item('Staging')).toContainText('https://staging.example.com/');
    await expect(environments.item('Staging')).toContainText('(default)');

    await environments.edit('Staging', { name: 'Production', url: 'https://www.example.com/{locale/}{fullSlug}' });
    await expect(environments.item('Production')).toContainText('https://www.example.com/{locale/}{fullSlug}');
    await expect(environments.item('Staging')).toHaveCount(0);
    await page.reload();
    await expect(environments.item('Production')).toBeVisible();

    await environments.delete('Production');
    await expect(environments.items()).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('No environments yet.')).toBeVisible();
  });
});

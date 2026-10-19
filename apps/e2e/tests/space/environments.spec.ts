import { EnvironmentsPage } from '../pages/environments.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';

async function stored(api: AppApi, spaceId: string): Promise<{ name: string; url: string }[]> {
  return (await api.findSpaceEnvironments(spaceId)).map(({ name, url }) => ({ name, url }));
}

test.describe('Space settings → Visual Editor environments', () => {
  test('adds an environment: the first one is the default', async ({ page, api, space }) => {
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect(page.getByText('No environments yet.')).toBeVisible();
    expect(await stored(api, space.id)).toEqual([]);

    await environments.add({ name: 'Staging', url: 'https://staging.example.com/' });

    await expect(environments.item('Staging')).toContainText('https://staging.example.com/');
    await expect(environments.item('Staging')).toContainText('(default)');
    expect(await stored(api, space.id)).toEqual([{ name: 'Staging', url: 'https://staging.example.com/' }]);
    await page.reload();
    await expect(environments.item('Staging')).toBeVisible();
  });

  test('edits an environment', async ({ page, api, space }) => {
    await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' });
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect(environments.item('Staging')).toBeVisible();

    await environments.edit('Staging', { name: 'Production', url: 'https://www.example.com/{locale/}{fullSlug}' });

    await expect(environments.item('Production')).toContainText('https://www.example.com/{locale/}{fullSlug}');
    await expect(environments.item('Staging')).toHaveCount(0);
    expect(await stored(api, space.id)).toEqual([{ name: 'Production', url: 'https://www.example.com/{locale/}{fullSlug}' }]);
    await page.reload();
    await expect(environments.item('Production')).toBeVisible();
  });

  test('removes an environment', async ({ page, api, space }) => {
    await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' });
    await api.addEnvironment(space.id, { name: 'Production', url: 'https://www.example.com/' });
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect(environments.items()).toHaveCount(2);

    await environments.delete('Staging');

    await expect(environments.item('Staging')).toHaveCount(0);
    // The next one becomes the default.
    await expect(environments.item('Production')).toContainText('(default)');
    expect(await stored(api, space.id)).toEqual([{ name: 'Production', url: 'https://www.example.com/' }]);

    await environments.delete('Production');

    await expect(environments.items()).toHaveCount(0);
    expect(await stored(api, space.id)).toEqual([]);
    await page.reload();
    await expect(page.getByText('No environments yet.')).toBeVisible();
  });

  test('reorders environments by dragging; the first one is the default', async ({ page, api, space }) => {
    await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' });
    await api.addEnvironment(space.id, { name: 'Production', url: 'https://www.example.com/' });
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect.poll(() => environments.names()).toEqual(['Staging', 'Production']);
    await expect(environments.item('Staging')).toContainText('(default)');

    await environments.moveAbove('Production', 'Staging');

    await expect.poll(() => environments.names()).toEqual(['Production', 'Staging']);
    await expect(environments.item('Production')).toContainText('(default)');
    await expect(environments.item('Staging')).not.toContainText('(default)');
    await expect.poll(async () => (await stored(api, space.id)).map(it => it.name)).toEqual(['Production', 'Staging']);
    await page.reload();
    await expect.poll(() => environments.names()).toEqual(['Production', 'Staging']);
  });
});

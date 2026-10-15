import { Shell } from '../pages/shell.page';
import { pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';

// Opens every page of a space with some data in it. The page fixture fails the test on any app error, so this
// catches a page that breaks without a dedicated test.
test.describe('Navigation', () => {
  test('every page of a space opens from the sidebar without errors @smoke', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    const schema = await api.createSchema(space.id, {
      name: uniqueId('page'),
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT' }],
    });
    await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.uploadAsset(space.id, pngFile());
    const shell = new Shell(page);
    await page.goto(`/features/spaces/${space.id}/dashboard`);

    const pages: [string, RegExp, string | RegExp][] = [
      ['Translations', /\/translations$/, 'Add Translation'],
      ['Content', /\/contents$/, 'Add Content'],
      ['Assets', /\/assets$/, 'Upload Assets'],
      ['Schemas', /\/schemas$/, 'Add Schema'],
      ['Settings', /\/settings\/general$/, 'Save'],
      ['Dashboard', /\/dashboard$/, /./],
    ];
    for (const [link, url, button] of pages) {
      await shell.navLink(link).click();
      await expect(page, link).toHaveURL(url);
      if (typeof button === 'string') await expect(page.getByRole('button', { name: button })).toBeVisible();
    }

    await page.goto(`/features/spaces/${space.id}/developers/open-api`);
    await expect(page.locator('elements-api')).toBeAttached();
    await page.goto('/features/admin/users');
    await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();
    await page.goto('/features/admin/spaces');
    await expect(page.getByRole('button', { name: 'Add Space' })).toBeVisible();
    await page.goto('/features/me');
    await expect(page.getByText('Email: admin@e2e.localess.test')).toBeVisible();
  });

  test('switches between spaces with the space switcher', async ({ page, api, space }) => {
    const other = await api.createSpace(`${space.name} B`);
    try {
      await page.goto(`/features/spaces/${space.id}/dashboard`);
      await new Shell(page).switchSpace(other.name);
      await expect(page).toHaveURL(new RegExp(`/spaces/${other.id}/dashboard`));
    } finally {
      await api.deleteSpace(other.id);
    }
  });
});

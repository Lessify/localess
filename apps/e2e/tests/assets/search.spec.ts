import { AssetsPage } from '../pages/assets.page';
import { ContentsPage } from '../pages/contents.page';
import { pageSchema } from '../support/contents';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// The Assets page and the asset picker read one page at a time from the server: a folder, or with "Including
// subfolders" everything under it, searched by name. The tree: logo.png, Images/ (hero.png, 2026/ (hero-2026.png)).
test.describe('Assets → search and scope', () => {
  test('searches the folder, or with "Including subfolders" everything under it, showing where each asset is', async ({
    page,
    api,
    space,
  }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const year = await api.createAssetFolder(space.id, '2026', images.id);
    await api.uploadAsset(space.id, pngFile('logo.png'));
    await api.uploadAsset(space.id, pngFile('hero.png'), images.id);
    await api.uploadAsset(space.id, pngFile('hero-2026.png'), year.id);
    const assets = new AssetsPage(page);

    // Pre-check: the root holds Images and logo.png.
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(2);

    // Action → post-check: a search in the root finds nothing below it.
    await assets.search('hero');
    await expect(page.getByText('No assets match.')).toBeVisible();

    // Action → post-check: including subfolders, every match under the root, each with where it is.
    await assets.scope('Including subfolders');
    await expect(assets.rows).toHaveCount(2);
    await expect(assets.rowAt('hero.png', '~/Images')).toBeVisible();
    await expect(assets.rowAt('hero-2026.png', '~/Images/2026')).toBeVisible();
    await expect(page.getByText('2 total items')).toBeVisible();

    // The grid shows the same page, each card with where it is.
    await assets.layout('Grid Layout');
    await expect(assets.cards).toHaveCount(2);
    await expect(assets.card('hero-2026.png')).toContainText('~/Images/2026');
    await assets.layout('List Layout');

    // Action → post-check: back to the root's own assets.
    await assets.scope('This folder');
    await expect(page.getByText('No assets match.')).toBeVisible();
    await assets.search('');
    await expect(assets.rows).toHaveCount(2);
    await expect(assets.row('logo.png')).toBeVisible();
  });

  test('the picker searches, keeps the field type, and keeps the selection across folders', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('logo.png'));
    await api.uploadAsset(space.id, pngFile('hero.png'), images.id);
    await api.uploadAsset(space.id, { name: 'hero.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }, images.id);
    const schema = await pageSchema(api, space, [{ name: 'gallery', kind: 'ASSETS', displayName: 'Gallery', fileType: 'IMAGE' }]);
    const doc = await api.createDocument(space.id, { name: 'Gallery', slug: 'gallery', schema: schema.name });
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);

    // Pre-check: the picker opens on the root.
    const { picker, row } = await contents.openAssetPicker('Add Assets');
    await expect(row('logo.png')).toBeVisible();

    // Action → post-check: a file at the root, then one in Images; both stay selected.
    await row('logo.png').click();
    await row('Images').click();
    await expect(row('hero.png')).toBeVisible();
    // The field takes images: the text file isn't offered.
    await expect(row('hero.txt')).toHaveCount(0);
    await row('hero.png').click();
    await expect(picker.getByRole('button', { name: 'Add Selected Assets (2)', exact: true })).toBeVisible();

    // Action → post-check: a search including subfolders from the root finds the image, with where it is.
    await picker.getByRole('button', { name: 'Root folder' }).click();
    await picker.getByPlaceholder('Search...').fill('hero');
    await picker.getByPlaceholder('Search...').press('Enter');
    await picker.getByRole('button', { name: /^Scope|This folder|Including subfolders/ }).click();
    await page.getByRole('option', { name: 'Including subfolders', exact: true }).click();
    // The name cell reads `hero.png~/Images…`: the row by its text, not by `row()` (a name then a space).
    await expect(picker.getByRole('row').filter({ hasText: /hero\.png\s*~\/Images/ })).toBeVisible();
    await expect(picker.getByRole('row').filter({ hasText: 'hero.txt' })).toHaveCount(0);

    // Action → post-check: both files are added.
    await picker.getByRole('button', { name: 'Add Selected Assets (2)', exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(contents.pickedAsset('logo.png')).toBeVisible();
    await expect(contents.pickedAsset('hero.png')).toBeVisible();
  });
});

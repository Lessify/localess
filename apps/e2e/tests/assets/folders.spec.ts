import { AssetsPage } from '../pages/assets.page';
import { allAssets, assetNamed, assetsIn } from '../support/assets';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, the breadcrumb, after a reload, the App API).
test.describe('Assets → create folder', () => {
  test('creates a folder and a folder inside it; the breadcrumb leads back @smoke', async ({ page, api, space }) => {
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(0);

    // Action 1: a folder at the root. Post-check.
    await assets.createFolder('Images');
    await expect(assets.row('Images')).toContainText('Folder');
    const images = await assetNamed(api, space.id, 'Images');
    expect(images).toMatchObject({ kind: 'FOLDER' });
    expect(images?.parentId).toBeUndefined();

    // Action 2: a folder inside it. Post-check: inside, and the breadcrumb trail.
    await assets.openFolder('Images');
    await assets.createFolder('Banners');
    await expect(assets.row('Banners')).toBeVisible();
    expect(await assetNamed(api, space.id, 'Banners', images!.id)).toMatchObject({ kind: 'FOLDER', parentId: images!.id });
    await assets.openFolder('Banners');
    await expect(assets.breadcrumb('Images')).toBeVisible();

    // The breadcrumb navigates back: one level, then the root.
    await assets.breadcrumb('Images').click();
    await expect(assets.currentFolder).toHaveText('Images');
    await expect(assets.row('Banners')).toBeVisible();
    await assets.rootFolder.click();
    await expect(assets.row('Images')).toBeVisible();
    await expect(assets.row('Banners')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('Images')).toBeVisible();
  });

  test('refuses a name the folder already has (folder or file); another folder may have it', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('Banner.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('Images')).toBeVisible();

    // Action → post-check: a folder's name, a file's name (without extension), both refused at the root.
    for (const taken of ['Images', 'Banner']) {
      const form = await assets.openCreateFolder(taken);
      await form.getByLabel('Name', { exact: true }).blur();
      await expect(form.getByText('The value is already reserved.')).toBeVisible();
      await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
      await form.getByRole('button', { name: 'Cancel' }).click();
      await expect(form).toBeHidden();
    }
    expect((await assetsIn(api, space.id)).map(it => it.name).sort()).toEqual(['Banner', 'Images']);

    // Action → post-check: the same name inside another folder is fine.
    await assets.openFolder('Images');
    await assets.createFolder('Images');
    expect(await assetNamed(api, space.id, 'Images', images.id)).toMatchObject({ kind: 'FOLDER' });
  });

  test('refuses a name under 3 characters or with spaces around it; cancelling creates nothing', async ({ page, api, space }) => {
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    // Pre-check: a valid name can be saved.
    const form = await assets.openCreateFolder('Valid');
    const name = form.getByLabel('Name', { exact: true });
    await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Action → post-check, for each invalid name.
    for (const invalid of ['ab', ' Leading', 'Trailing ']) {
      await name.fill(invalid);
      await name.blur();
      await expect(form.getByRole('button', { name: 'Save' }), JSON.stringify(invalid)).toBeDisabled();
      await expect(form.locator('hlm-field-error').first(), JSON.stringify(invalid)).toBeVisible();
    }

    // Cancel
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toBeHidden();
    await expect(assets.rows).toHaveCount(0);
    expect(await allAssets(api, space.id)).toEqual([]);
  });
});

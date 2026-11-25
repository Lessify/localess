import { AssetsPage } from '../pages/assets.page';
import { cancel, expectRefused } from '../pages/dialogs';
import { allAssets, assetNamed, assetsIn, listedName } from '../support/assets';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';
import { recordListReads } from '../support/requests';

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

  test('opening a folder or going back asks once for its page, never for the folder left', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const year = await api.createAssetFolder(space.id, '2026', images.id);
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('Images')).toBeVisible();
    const reads = recordListReads(page, 'assets');

    // Action → post-check: down two levels, then back to the root by the breadcrumb; one read each, none cancelled.
    await assets.openFolder('Images');
    await expect(assets.row('2026')).toBeVisible();
    await assets.openFolder('2026');
    await expect(assets.emptyFolder).toBeVisible();
    await assets.rootFolder.click();
    await expect(assets.row('Images')).toBeVisible();
    expect(reads).toEqual([
      { query: `parentId=${images.id}`, failed: false },
      { query: `parentId=${year.id}`, failed: false },
      { query: '', failed: false },
    ]);
  });

  test('accepts a name the folder already has (folder or file): duplicates are allowed', async ({ page, api, space }) => {
    await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('Banner.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('Images')).toBeVisible();
    expect((await assetsIn(api, space.id)).map(listedName).sort()).toEqual(['Banner.png', 'Images']);

    // Action: a folder's name and a file's name (without extension). The folder's list is paged, so the dialog can't
    // know every name; a server check would come with the duplicate rule (docs/roadmap/asset-names.md).
    await assets.createFolder('Images');
    await assets.createFolder('Banner');

    // Post-check
    expect((await assetsIn(api, space.id)).map(listedName).sort()).toEqual(['Banner', 'Banner.png', 'Images', 'Images']);
    await expect(assets.rows).toHaveCount(4);
  });

  test('refuses a name under 3 characters or with spaces around it; cancelling creates nothing', async ({ page, api, space }) => {
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    // Pre-check: a valid name can be saved.
    const form = await assets.openCreateFolder('Valid');
    const name = form.getByLabel('Name', { exact: true });
    await expect(form.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Action → post-check, for each invalid name.
    for (const [invalid, message] of [
      ['ab', 'Minimum length is 3.'],
      [' Leading', 'No spaces at start and end.'],
      ['Trailing ', 'No spaces at start and end.'],
    ]) {
      await name.fill(invalid);
      await test.step(JSON.stringify(invalid), () => expectRefused(form, name, message));
    }

    // Cancel
    await cancel(form);
    await expect(assets.rows).toHaveCount(0);
    expect(await allAssets(api, space.id)).toEqual([]);
  });
});

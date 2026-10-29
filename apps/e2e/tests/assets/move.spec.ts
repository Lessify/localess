import { AssetsPage } from '../pages/assets.page';
import { cancel } from '../pages/dialogs';
import { assetNamed, assetsIn, listedName, original } from '../support/assets';
import { PNG_1X1, pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list in both folders, after a reload, the App API, the CDN).
test.describe('Assets → move', () => {
  test('moves a file into a folder and back to the root; its URL keeps working', async ({ page, api, space, request }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const file = await api.uploadAsset(space.id, pngFile('hero.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('hero.png')).toBeVisible();
    expect(await assetsIn(api, space.id, images.id)).toEqual([]);

    // Action 1: into Images. Post-check: gone from the root (also after a reload), in Images, same id and bytes.
    await assets.move('hero.png', 'Images');
    await expect(assets.row('hero.png')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('Images')).toBeVisible();
    await expect(assets.row('hero.png')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'hero.png', images.id)).toMatchObject({ id: file.id, parentId: images.id });
    expect(await assetNamed(api, space.id, 'hero.png')).toBeUndefined();
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);
    await assets.openFolder('Images');
    await expect(assets.row('hero.png')).toBeVisible();

    // Action 2: back to the root; Images is marked as where the file is.
    const form = await assets.openMove('hero.png');
    await expect(assets.moveTarget('Images')).toContainText('(current)');
    await assets.moveTo(form, 'Root');

    // Post-check: gone from Images, at the root (also after a reload), same id and bytes.
    await expect(assets.row('hero.png')).toHaveCount(0);
    await assets.rootFolder.click();
    await expect(assets.row('hero.png')).toBeVisible();
    await page.reload();
    await expect(assets.row('hero.png')).toBeVisible();
    const atRoot = await assetNamed(api, space.id, 'hero.png');
    expect(atRoot?.id).toBe(file.id);
    expect(atRoot?.parentId).toBeUndefined();
    expect(await assetsIn(api, space.id, images.id)).toEqual([]);
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);
  });

  test('moves a folder with its content; it is not offered itself or what is under it', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const banners = await api.createAssetFolder(space.id, 'Banners', images.id);
    const archive = await api.createAssetFolder(space.id, 'Archive');
    const file = await api.uploadAsset(space.id, pngFile('wide.png'), banners.id);
    const assets = new AssetsPage(page);

    // Pre-check: the tree for Images marks where it is (the root) and leaves out itself and Banners under it.
    await assets.goto(space.id);
    const form = await assets.openMove('Images');
    await expect(assets.moveTarget('Root')).toContainText('(current)');
    await expect(assets.moveTarget('Archive')).toBeVisible();
    await expect(assets.moveTarget('Images')).toHaveCount(0);
    await expect(assets.moveTarget('Banners')).toHaveCount(0);
    await cancel(form);
    expect((await assetsIn(api, space.id)).map(listedName).sort()).toEqual(['Archive', 'Images']);

    // Action: Images into Archive.
    await assets.move('Images', 'Archive');

    // Post-check: the subtree goes along (the list, after a reload, the API).
    await expect(assets.row('Images')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('Archive')).toBeVisible();
    await expect(assets.row('Images')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'Images', archive.id)).toMatchObject({ id: images.id });
    expect(await assetNamed(api, space.id, 'Banners', images.id)).toMatchObject({ id: banners.id });
    expect(await assetNamed(api, space.id, 'wide.png', banners.id)).toMatchObject({ id: file.id });
    await assets.openFolder('Archive');
    await assets.openFolder('Images');
    await assets.openFolder('Banners');
    await expect(assets.row('wide.png')).toBeVisible();
    await expect(assets.breadcrumb('Archive')).toBeVisible();
  });

  test('the API refuses moving a folder into itself or under itself', async ({ api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const banners = await api.createAssetFolder(space.id, 'Banners', images.id);
    for (const parentId of [images.id, banners.id]) {
      // AppApi.send fails on anything but success, with the status in its message.
      await expect(api.send('patch', `/api/app/spaces/${space.id}/assets/${images.id}`, { parentId })).rejects.toThrow(/: 400 /);
    }
    expect((await assetNamed(api, space.id, 'Images'))?.parentId).toBeUndefined();
    expect(await assetNamed(api, space.id, 'Banners', images.id)).toMatchObject({ id: banners.id });
  });

  test('roadmap check: moving into a folder with the same name gives two', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('hero.png'));
    await api.uploadAsset(space.id, pngFile('hero.png'), images.id);
    const assets = new AssetsPage(page);
    await assets.goto(space.id);
    await expect(assets.row('hero.png')).toBeVisible();

    await assets.move('hero.png', 'Images');

    // Today: no check anywhere (docs/roadmap/asset-names.md, N2).
    expect((await assetsIn(api, space.id, images.id)).map(listedName)).toEqual(['hero.png', 'hero.png']);
    await assets.openFolder('Images');
    await expect(assets.row('hero.png')).toHaveCount(2);
  });
});

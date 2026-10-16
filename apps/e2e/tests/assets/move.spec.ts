import { AssetsPage } from '../pages/assets.page';
import { assetNamed, assetsIn, original } from '../support/assets';
import { PNG_1X1, pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list in both folders, the App API, the CDN).
test.describe('Assets → move', () => {
  test('moves a file into a folder and back to the root; its URL keeps working', async ({ page, api, space, request }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const file = await api.uploadAsset(space.id, pngFile('hero.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('hero.png')).toBeVisible();
    expect(await assetsIn(api, space.id, images.id)).toEqual([]);

    // Action 1: into Images. Post-check: gone from the root, in Images, same id and bytes.
    await assets.move('hero.png', 'Images');
    await expect(assets.row('hero.png')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'hero', images.id)).toMatchObject({ id: file.id, parentId: images.id });
    expect(await assetNamed(api, space.id, 'hero')).toBeUndefined();
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);
    await assets.openFolder('Images');
    await expect(assets.row('hero.png')).toBeVisible();

    // Action 2: back to the root (Images itself is not offered: the file is there).
    await assets.move('hero.png', 'Root');
    await expect(assets.row('hero.png')).toHaveCount(0);
    expect((await assetNamed(api, space.id, 'hero'))?.parentId).toBeUndefined();
    await assets.rootFolder.click();
    await expect(assets.row('hero.png')).toBeVisible();
  });

  test('moves a folder with its content; it is not offered itself or what is under it', async ({ page, api, space }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const banners = await api.createAssetFolder(space.id, 'Banners', images.id);
    await api.createAssetFolder(space.id, 'Archive');
    const file = await api.uploadAsset(space.id, pngFile('wide.png'), banners.id);
    const assets = new AssetsPage(page);

    // Pre-check: the options for Images leave out where it is (the root), itself and Banners under it.
    await assets.goto(space.id);
    const form = await assets.openMove('Images');
    const options = await assets.moveOptions(form);
    expect(options).toEqual(['Archive | Archive']);
    await page.keyboard.press('Escape');
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toBeHidden();

    // Action: Images into Archive. Post-check: the subtree goes along.
    await assets.move('Images', 'Archive');
    await expect(assets.row('Images')).toHaveCount(0);
    const archive = await assetNamed(api, space.id, 'Archive');
    expect(await assetNamed(api, space.id, 'Images', archive!.id)).toMatchObject({ id: images.id });
    expect(await assetNamed(api, space.id, 'wide', banners.id)).toMatchObject({ id: file.id });
    await assets.openFolder('Archive');
    await assets.openFolder('Images');
    await assets.openFolder('Banners');
    await expect(assets.row('wide.png')).toBeVisible();
    await expect(assets.breadcrumb('Archive')).toBeVisible();
  });

  test('the API refuses moving a folder into itself or under itself', async ({ api, space, request }) => {
    const images = await api.createAssetFolder(space.id, 'Images');
    const banners = await api.createAssetFolder(space.id, 'Banners', images.id);
    for (const parentId of [images.id, banners.id]) {
      const response = await request.put(`/api/app/spaces/${space.id}/assets/${images.id}/parent`, {
        data: { parentId },
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      expect(response.status()).toBe(400);
    }
    expect((await assetNamed(api, space.id, 'Images'))?.parentId).toBeUndefined();
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
    expect((await assetsIn(api, space.id, images.id)).map(it => `${it.name}${it.extension}`)).toEqual(['hero.png', 'hero.png']);
    await assets.openFolder('Images');
    await expect(assets.row('hero.png')).toHaveCount(2);
  });
});

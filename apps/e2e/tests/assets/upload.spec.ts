import { AssetsPage } from '../pages/assets.page';
import { allAssets, assetNamed, assetsIn, original } from '../support/assets';
import { PNG_1X1, pdfFile, pngFile, textFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, after a reload, the App API, the CDN API).
test.describe('Assets → upload', () => {
  test('uploads an image: listed with its type, stored with its extension, served by the CDN @smoke', async ({
    page,
    api,
    space,
    request,
  }) => {
    const assets = new AssetsPage(page);

    // Pre-check: an empty space.
    await assets.goto(space.id);
    await expect(assets.emptyFolder).toBeVisible();
    expect(await allAssets(api, space.id)).toEqual([]);

    // Action
    await assets.upload(pngFile('hero.png'));

    // Post-check
    await expect(assets.row('hero.png')).toContainText('image/png');
    await page.reload();
    await expect(assets.row('hero.png')).toBeVisible();
    const stored = await assetNamed(api, space.id, 'hero');
    expect(stored).toMatchObject({ kind: 'FILE', name: 'hero', extension: '.png', type: 'image/png', size: PNG_1X1.length });
    expect(await original(request, space.id, stored!.id)).toEqual(PNG_1X1);
  });

  test('uploads several files of different types at once', async ({ page, api, space, request }) => {
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(0);

    // Action
    await assets.upload(pngFile('logo.png'), pdfFile('terms.pdf'), textFile('readme.txt', 'Read me'));

    // Post-check: three rows with their types; the text file's bytes; the PDF downloads as an attachment.
    await expect(assets.row('logo.png')).toContainText('image/png');
    await expect(assets.row('terms.pdf')).toContainText('application/pdf');
    await expect(assets.row('readme.txt')).toContainText('text/plain');
    await expect(assets.rows).toHaveCount(3);
    const all = await allAssets(api, space.id);
    expect(all.map(it => `${it.name}${it.extension}`).sort()).toEqual(['logo.png', 'readme.txt', 'terms.pdf']);
    const readme = all.find(it => it.name === 'readme')!;
    expect((await original(request, space.id, readme.id)).toString()).toBe('Read me');
    const terms = all.find(it => it.name === 'terms')!;
    const download = await request.get(`/api/v1/spaces/${space.id}/assets/${terms.id}/download`);
    expect(download.headers()['content-disposition']).toContain('attachment');
    expect(download.headers()['content-disposition']).toContain('terms.pdf');
  });

  test('uploads a file dropped on the page', async ({ page, api, space }) => {
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(0);

    // Action
    await assets.drop(pngFile('dropped.png'));

    // Post-check
    await expect(assets.row('dropped.png')).toBeVisible();
    expect(await assetNamed(api, space.id, 'dropped')).toMatchObject({ extension: '.png', type: 'image/png' });
  });

  test('uploads a file from a link (downloaded by the browser)', async ({ page, api, space, request }) => {
    const url = 'https://images.example.com/photos/linked.png';
    // The link's server, answered here: the run is offline.
    await page.route(url, route =>
      route.fulfill({ body: PNG_1X1, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }),
    );
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(0);

    // Action
    await assets.uploadFromLink(url);

    // Post-check: named after the link's file, the same bytes.
    await expect(assets.row('linked.png')).toBeVisible();
    const stored = await assetNamed(api, space.id, 'linked');
    expect(stored).toMatchObject({ extension: '.png' });
    expect(await original(request, space.id, stored!.id)).toEqual(PNG_1X1);
  });

  test('uploads into the open folder only', async ({ page, api, space }) => {
    const folder = await api.createAssetFolder(space.id, 'Images');
    const assets = new AssetsPage(page);

    // Pre-check: the folder is empty.
    await assets.goto(space.id);
    await assets.openFolder('Images');
    await expect(assets.rows).toHaveCount(0);

    // Action
    await assets.upload(pngFile('inside.png'));

    // Post-check: in the folder, not at the root.
    await expect(assets.row('inside.png')).toBeVisible();
    expect((await assetsIn(api, space.id, folder.id)).map(it => it.name)).toEqual(['inside']);
    expect((await assetsIn(api, space.id)).map(it => it.name)).toEqual(['Images']);
    await assets.rootFolder.click();
    await expect(assets.row('inside.png')).toHaveCount(0);
    await expect(assets.row('Images')).toBeVisible();
  });

  test('a name that exists in the folder can be uploaded again (names may repeat)', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('logo.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('logo.png')).toHaveCount(1);

    // Action
    await assets.upload(pngFile('logo.png'));

    // Post-check: two files, both named logo.png (see docs/roadmap/asset-names.md).
    await expect(assets.row('logo.png')).toHaveCount(2);
    expect((await allAssets(api, space.id)).filter(it => it.name === 'logo')).toHaveLength(2);
  });
});

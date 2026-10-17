import { AssetsPage } from '../pages/assets.page';
import { cancel } from '../pages/dialogs';
import { allAssets, assetNamed, listedName, original } from '../support/assets';
import { PNG_1X1, pngFile, textFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, after a reload, the App API, the CDN API).
test.describe('Assets → delete', () => {
  test('deletes a file: gone from the list, the API and the CDN @smoke', async ({ page, api, space, request }) => {
    const file = await api.uploadAsset(space.id, pngFile('old.png'));
    await api.uploadAsset(space.id, textFile('keep.txt'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('old.png')).toBeVisible();
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);

    // Action
    await assets.delete('old.png', 'Asset', 'old');

    // Post-check: gone; the other file stays.
    await expect(assets.row('old.png')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('keep.txt')).toBeVisible();
    await expect(assets.row('old.png')).toHaveCount(0);
    expect((await allAssets(api, space.id)).map(listedName)).toEqual(['keep.txt']);
    expect(await original(request, space.id, file.id)).toBe(404);
  });

  test('deletes a folder with everything in it', async ({ page, api, space, request }) => {
    const folder = await api.createAssetFolder(space.id, 'Archive');
    const sub = await api.createAssetFolder(space.id, 'Old', folder.id);
    const inFolder = await api.uploadAsset(space.id, pngFile('a.png'), folder.id);
    const inSub = await api.uploadAsset(space.id, pngFile('b.png'), sub.id);
    const outside = await api.uploadAsset(space.id, pngFile('outside.png'));
    const assets = new AssetsPage(page);

    // Pre-check: five assets.
    await assets.goto(space.id);
    await expect(assets.row('Archive')).toBeVisible();
    expect(await allAssets(api, space.id)).toHaveLength(5);

    // Action
    await assets.delete('Archive', 'Folder', 'Archive');

    // Post-check: the folder, its subfolder and both files are gone; the file outside stays.
    await expect(assets.row('Archive')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('outside.png')).toBeVisible();
    await expect(assets.row('Archive')).toHaveCount(0);
    expect((await allAssets(api, space.id)).map(it => it.id)).toEqual([outside.id]);
    expect(await original(request, space.id, inFolder.id)).toBe(404);
    expect(await original(request, space.id, inSub.id)).toBe(404);
    expect(await original(request, space.id, outside.id)).toEqual(PNG_1X1);
  });

  test('deleting a folder three levels deep removes every file under it, originals and thumbnails', async ({
    page,
    api,
    space,
    request,
  }) => {
    // Photos/2026/June with a file at every level; Logos beside it must stay.
    const photos = await api.createAssetFolder(space.id, 'Photos');
    const year = await api.createAssetFolder(space.id, '2026', photos.id);
    const june = await api.createAssetFolder(space.id, 'June', year.id);
    const files = [
      await api.uploadAsset(space.id, pngFile('a.png'), photos.id),
      await api.uploadAsset(space.id, pngFile('b.png'), year.id),
      await api.uploadAsset(space.id, pngFile('c.png'), june.id),
    ];
    const logos = await api.createAssetFolder(space.id, 'Logos');
    const logo = await api.uploadAsset(space.id, pngFile('logo.png'), logos.id);
    const thumbnail = async (id: string) => (await request.get(`/api/v1/spaces/${space.id}/assets/${id}?w=40&thumbnail`)).status();
    const assets = new AssetsPage(page);

    // Pre-check: every file served, original and thumbnail (the thumbnail is stored as a rendition).
    await assets.goto(space.id);
    await expect(assets.row('Photos')).toBeVisible();
    for (const it of [...files, logo]) {
      expect(await original(request, space.id, it.id)).toEqual(PNG_1X1);
      expect(await thumbnail(it.id)).toBe(200);
    }

    // Action
    await assets.delete('Photos', 'Folder', 'Photos');

    // Post-check: the list, after a reload, the API, and nothing served under the deleted folder.
    await expect(assets.row('Photos')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('Logos')).toBeVisible();
    await expect(assets.row('Photos')).toHaveCount(0);
    expect((await allAssets(api, space.id)).map(it => it.id).sort()).toEqual([logos.id, logo.id].sort());
    for (const it of files) {
      expect(await original(request, space.id, it.id)).toBe(404);
      expect(await thumbnail(it.id)).toBe(404);
    }
    expect(await original(request, space.id, logo.id)).toEqual(PNG_1X1);
    expect(await thumbnail(logo.id)).toBe(200);
  });

  test('warns when a content uses the file; the content stays', async ({ page, api, space }) => {
    const file = await api.uploadAsset(space.id, pngFile('used.png'));
    const schema = await api.createSchema(space.id, {
      name: uniqueId('page'),
      type: 'ROOT',
      fields: [{ name: 'image', kind: 'ASSET' }],
    });
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { image: { kind: 'ASSET', uri: file.id } }, [file.id]);
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    expect(await api.get(`/api/app/spaces/${space.id}/assets/${file.id}/usage`)).toEqual({ contents: 1 });

    // Action: the confirmation names the usage.
    const confirm = await assets.openDelete('used.png', 'Asset');
    await expect(confirm).toContainText('It is used by 1 content, which will show it as missing.');
    await assets.confirmDelete(confirm, 'used');

    // Post-check: the file is gone, the content is not.
    await expect(assets.row('used.png')).toHaveCount(0);
    await page.reload();
    await expect(assets.emptyFolder).toBeVisible();
    expect(await assetNamed(api, space.id, 'used.png')).toBeUndefined();
    const contents = await api.get<{ id: string }[]>(`/api/app/spaces/${space.id}/contents?kind=DOCUMENT`);
    expect(contents.map(it => it.id)).toEqual([doc.id]);
  });

  test('cancelling the confirmation keeps the file', async ({ page, api, space, request }) => {
    const file = await api.uploadAsset(space.id, pngFile('keep.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('keep.png')).toBeVisible();
    const before = await assetNamed(api, space.id, 'keep.png');
    expect(before).toMatchObject({ id: file.id });

    // Action
    await cancel(await assets.openDelete('keep.png', 'Asset'));

    // Post-check: still listed (also after a reload), the same asset in the same folder, the same bytes.
    await expect(assets.row('keep.png')).toBeVisible();
    await page.reload();
    await expect(assets.row('keep.png')).toBeVisible();
    expect(await assetNamed(api, space.id, 'keep.png')).toEqual(before);
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);
  });
});

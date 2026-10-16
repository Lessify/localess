import { AssetsPage } from '../pages/assets.page';
import { expectToast } from '../pages/notifications';
import { allAssets, assetNamed, original } from '../support/assets';
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
    expect((await allAssets(api, space.id)).map(it => it.name)).toEqual(['keep']);
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
    expect(await allAssets(api, space.id)).toHaveLength(5);

    // Action
    const confirm = await assets.openDelete('Archive');
    await expect(confirm).toContainText('Delete Folder');
    await confirm.getByRole('button', { name: 'OK' }).click();
    await expectToast(page, "Asset 'Archive' has been deleted.");

    // Post-check: the folder, its subfolder and both files are gone; the file outside stays.
    await expect(assets.row('Archive')).toHaveCount(0);
    expect((await allAssets(api, space.id)).map(it => it.id)).toEqual([outside.id]);
    expect(await original(request, space.id, inFolder.id)).toBe(404);
    expect(await original(request, space.id, inSub.id)).toBe(404);
    expect(await original(request, space.id, outside.id)).toEqual(PNG_1X1);
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
    const confirm = await assets.openDelete('used.png');
    await expect(confirm).toContainText('It is used by 1 content, which will show it as missing.');
    await confirm.getByRole('button', { name: 'OK' }).click();
    await expectToast(page, "Asset 'used' has been deleted.");

    // Post-check: the file is gone, the content is not.
    await expect(assets.row('used.png')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'used')).toBeUndefined();
    const contents = await api.get<{ id: string }[]>(`/api/app/spaces/${space.id}/contents?kind=DOCUMENT`);
    expect(contents.map(it => it.id)).toEqual([doc.id]);
  });

  test('cancelling the confirmation keeps the file', async ({ page, api, space, request }) => {
    const file = await api.uploadAsset(space.id, pngFile('keep.png'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('keep.png')).toBeVisible();

    // Action
    const confirm = await assets.openDelete('keep.png');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();

    // Post-check
    await expect(assets.row('keep.png')).toBeVisible();
    expect(await original(request, space.id, file.id)).toEqual(PNG_1X1);
  });
});

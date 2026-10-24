import { AssetsPage } from '../pages/assets.page';
import { cancel } from '../pages/dialogs';
import { assetNamed, assetsIn, listedName } from '../support/assets';
import { pngFile, textFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, after a reload, the App API, the CDN download name).
test.describe('Assets → rename', () => {
  test('renames a file: the extension stays, the download uses the new name @smoke', async ({ page, api, space, request }) => {
    const file = await api.uploadAsset(space.id, textFile('draft.txt'));
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('draft.txt')).toBeVisible();
    const form = await assets.openEdit('draft.txt', 'File');
    await expect(form.getByLabel('Name', { exact: true })).toHaveValue('draft');
    await expect(form).toContainText('.txt');
    await cancel(form);

    // Action
    await assets.rename('draft.txt', 'File', 'final-notes');

    // Post-check
    await expect(assets.row('final-notes.txt')).toBeVisible();
    await expect(assets.row('draft.txt')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('final-notes.txt')).toBeVisible();
    expect(await assetNamed(api, space.id, 'final-notes.txt')).toMatchObject({ id: file.id, extension: '.txt' });
    const download = await request.get(`/api/v1/spaces/${space.id}/assets/${file.id}/download`);
    expect(download.headers()['content-disposition']).toContain('final-notes.txt');
  });

  test("edits an image's alt text", async ({ page, api, space }) => {
    const file = await api.uploadAsset(space.id, pngFile('hero.png'));
    const assets = new AssetsPage(page);

    // Pre-check: no alt text.
    await assets.goto(space.id);
    expect((await assetNamed(api, space.id, 'hero.png'))?.alt).toBeUndefined();

    // Action
    await assets.editFile('hero.png', { alt: 'A mountain at sunrise' });

    // Post-check: stored, shown when editing again, the name unchanged.
    await expect.poll(async () => (await assetNamed(api, space.id, 'hero.png'))?.alt).toBe('A mountain at sunrise');
    expect(await assetNamed(api, space.id, 'hero.png')).toMatchObject({ id: file.id, name: 'hero', extension: '.png' });
    await page.reload();
    await expect(assets.row('hero.png')).toBeVisible();
    const again = await assets.openEdit('hero.png', 'File');
    await expect(again.getByLabel('Alt Text')).toHaveValue('A mountain at sunrise');
    await expect(again.getByLabel('Name', { exact: true })).toHaveValue('hero');
    // The length counter sits inside the field's frame, at its bottom (the input group), as on the Name field.
    const counter = again.getByTestId('alt-length');
    await expect(counter).toHaveText('21/500');
    const frame = await again.getByLabel('Alt Text').locator('xpath=..').boundingBox();
    const box = await counter.boundingBox();
    expect(box && frame && box.y >= frame.y && box.y + box.height <= frame.y + frame.height).toBe(true);
    await cancel(again);
  });

  test('renames a folder; what is inside stays inside', async ({ page, api, space }) => {
    const folder = await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('inside.png'), folder.id);
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.row('Images')).toBeVisible();

    // Action
    await assets.rename('Images', 'Folder', 'Photos');

    // Post-check: the list, after a reload, the API, and what is inside.
    await expect(assets.row('Photos')).toBeVisible();
    await expect(assets.row('Images')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('Photos')).toBeVisible();
    await expect(assets.row('Images')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'Photos')).toMatchObject({ id: folder.id, kind: 'FOLDER' });
    expect((await assetsIn(api, space.id, folder.id)).map(listedName)).toEqual(['inside.png']);
    await assets.openFolder('Photos');
    await expect(assets.row('inside.png')).toBeVisible();
  });

  test('accepts a name another asset in the folder has; cancelling keeps the name', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('logo.png'));
    await api.uploadAsset(space.id, pngFile('photo.jpg'));
    await api.createAssetFolder(space.id, 'Images');
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(3);

    // Action → post-check: cancel keeps the name.
    const form = await assets.openEdit('logo.png', 'File');
    await form.getByLabel('Name', { exact: true }).fill('not-saved');
    await cancel(form);
    await expect(assets.row('logo.png')).toBeVisible();

    // Action → post-check: a file's name (another extension) and a folder's name are accepted (duplicates are allowed:
    // the folder's list is paged, docs/roadmap/asset-names.md).
    await assets.rename('logo.png', 'File', 'photo');
    await assets.rename('Images', 'Folder', 'photo');
    expect((await assetsIn(api, space.id)).map(listedName).sort()).toEqual(['photo', 'photo.jpg', 'photo.png']);
  });

  test('roadmap check: a file with a short name can only be edited by renaming it', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('ab.png'));
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    const form = await assets.openEdit('ab.png', 'File');
    await form.getByLabel('Alt Text').fill('Only the alt text changes');

    // Today: the 3-character minimum blocks Save (docs/roadmap/asset-names.md, N1).
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await cancel(form);
  });

  test('roadmap check: Edit Folder allows 100 characters, Create Folder 250', async ({ page, api, space }) => {
    await api.createAssetFolder(space.id, 'Images');
    await api.createAssetFolder(space.id, 'y'.repeat(150));
    const assets = new AssetsPage(page);
    await assets.goto(space.id);
    const long = 'x'.repeat(150);

    // Today (docs/roadmap/asset-names.md, N3).
    const create = await assets.openCreateFolder(long);
    await expect(create.getByLabel('Name', { exact: true })).toHaveValue(long);
    await cancel(create);
    const edit = await assets.openEdit('Images', 'Folder');
    await edit.getByLabel('Name', { exact: true }).fill(long);
    await expect(edit.getByLabel('Name', { exact: true })).toHaveValue('x'.repeat(100));
    await cancel(edit);
    // A folder created with a longer name can't be saved unchanged.
    const longFolder = await assets.openEdit('y'.repeat(150), 'Folder');
    await expect(longFolder.getByRole('button', { name: 'Save' })).toBeDisabled();
    await cancel(longFolder);
  });
});

import { AssetsPage } from '../pages/assets.page';
import { assetNamed, assetsIn } from '../support/assets';
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
    await form.getByRole('button', { name: 'Cancel' }).click();

    // Action
    await assets.rename('draft.txt', 'File', 'final-notes');

    // Post-check
    await expect(assets.row('final-notes.txt')).toBeVisible();
    await expect(assets.row('draft.txt')).toHaveCount(0);
    await page.reload();
    await expect(assets.row('final-notes.txt')).toBeVisible();
    expect(await assetNamed(api, space.id, 'final-notes')).toMatchObject({ id: file.id, extension: '.txt' });
    const download = await request.get(`/api/v1/spaces/${space.id}/assets/${file.id}/download`);
    expect(download.headers()['content-disposition']).toContain('final-notes.txt');
  });

  test("edits an image's alt text", async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('hero.png'));
    const assets = new AssetsPage(page);

    // Pre-check: no alt text.
    await assets.goto(space.id);
    expect((await assetNamed(api, space.id, 'hero'))?.alt).toBeUndefined();

    // Action
    const form = await assets.openEdit('hero.png', 'File');
    await form.getByLabel('Alt Text').fill('A mountain at sunrise');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form).toBeHidden();

    // Post-check: stored, shown when editing again, the name unchanged.
    expect(await assetNamed(api, space.id, 'hero')).toMatchObject({ alt: 'A mountain at sunrise' });
    await page.reload();
    const again = await assets.openEdit('hero.png', 'File');
    await expect(again.getByLabel('Alt Text')).toHaveValue('A mountain at sunrise');
    await again.getByRole('button', { name: 'Cancel' }).click();
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

    // Post-check
    await expect(assets.row('Photos')).toBeVisible();
    await expect(assets.row('Images')).toHaveCount(0);
    expect(await assetNamed(api, space.id, 'Photos')).toMatchObject({ id: folder.id, kind: 'FOLDER' });
    expect((await assetsIn(api, space.id, folder.id)).map(it => it.name)).toEqual(['inside']);
    await assets.openFolder('Photos');
    await expect(assets.row('inside.png')).toBeVisible();
  });

  test('refuses a name another asset in the folder has; cancelling keeps the name', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('logo.png'));
    await api.uploadAsset(space.id, pngFile('photo.jpg'));
    await api.createAssetFolder(space.id, 'Images');
    const assets = new AssetsPage(page);

    // Pre-check
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(3);

    // Action → post-check: a file's name (another extension) and a folder's name, both refused.
    const form = await assets.openEdit('logo.png', 'File');
    const name = form.getByLabel('Name', { exact: true });
    for (const taken of ['photo', 'Images']) {
      await name.fill(taken);
      await name.blur();
      await expect(form.getByText('The value is already reserved.'), taken).toBeVisible();
      await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    }

    // Cancel: unchanged.
    await name.fill('not-saved');
    await form.getByRole('button', { name: 'Cancel' }).click();
    await expect(form).toBeHidden();
    await expect(assets.row('logo.png')).toBeVisible();
    expect(await assetNamed(api, space.id, 'logo')).toBeDefined();
    expect(await assetNamed(api, space.id, 'not-saved')).toBeUndefined();
  });

  test('roadmap check: a file with a short name can only be edited by renaming it', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('ab.png'));
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    const form = await assets.openEdit('ab.png', 'File');
    await form.getByLabel('Alt Text').fill('Only the alt text changes');

    // Today: the 3-character minimum blocks Save (docs/roadmap/asset-names.md, N1).
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await form.getByRole('button', { name: 'Cancel' }).click();
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
    await create.getByRole('button', { name: 'Cancel' }).click();
    const edit = await assets.openEdit('Images', 'Folder');
    await edit.getByLabel('Name', { exact: true }).fill(long);
    await expect(edit.getByLabel('Name', { exact: true })).toHaveValue('x'.repeat(100));
    await edit.getByRole('button', { name: 'Cancel' }).click();
    // A folder created with a longer name can't be saved unchanged.
    const longFolder = await assets.openEdit('y'.repeat(150), 'Folder');
    await expect(longFolder.getByRole('button', { name: 'Save' })).toBeDisabled();
    await longFolder.getByRole('button', { name: 'Cancel' }).click();
  });
});

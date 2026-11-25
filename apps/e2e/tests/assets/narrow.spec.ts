import { AssetsPage } from '../pages/assets.page';
import { ContentsPage } from '../pages/contents.page';
import { pageSchema } from '../support/contents';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// A phone-sized window (400 px): what the Assets page, the asset picker and an Asset field must keep within reach.
test.describe('Assets → a narrow window', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('the table keeps the name and the Actions menu; the toolbar keeps Upload on screen', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('a-picture-with-a-rather-long-name.png'));
    const assets = new AssetsPage(page);

    await assets.goto(space.id);
    const row = assets.row('a-picture-with-a-rather-long-name.png');
    await expect(row).toBeVisible();
    // The optional columns step aside, the Actions menu stays on screen.
    await expect(assets.area.getByRole('columnheader', { name: 'Updated At' })).toBeHidden();
    await expect(assets.area.getByRole('columnheader', { name: 'File Size' })).toBeHidden();
    await expect(row.getByRole('button', { name: 'Actions', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Upload Assets' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Create Folder' })).toBeInViewport({ ratio: 1 });

    // The grid: two cards a row, side by side.
    await api.createAssetFolder(space.id, 'Images');
    await assets.layout('Grid Layout');
    await expect(assets.cards).toHaveCount(2);
    // The card's host has no box of its own: measure its picture (the "Open …" button).
    const open = (name: string) =>
      assets
        .card(name)
        .getByRole('button', { name: `Open ${name}`, exact: true })
        .boundingBox();
    const [folder, file] = await Promise.all([open('Images'), open('a-picture-with-a-rather-long-name.png')]);
    expect(file!.y).toBe(folder!.y);
    expect(file!.x).toBeGreaterThan(folder!.x);
  });

  test('the picker keeps its actions and the Add button on screen; an Asset field keeps its Delete', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('hero.png'));
    const schema = await pageSchema(api, space, [{ name: 'image', kind: 'ASSET', displayName: 'Image' }]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);

    const { picker, row } = await contents.openAssetPicker('Add Asset');
    await expect(row('hero.png')).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Upload Assets' })).toBeInViewport({ ratio: 1 });
    await row('hero.png').click();
    await expect(picker.getByRole('button', { name: 'Add Selected Asset', exact: true })).toBeInViewport({ ratio: 1 });
    await picker.getByRole('button', { name: 'Add Selected Asset', exact: true }).click();
    await expect(picker).toBeHidden();

    const picked = contents.pickedAsset('hero.png');
    await expect(picked).toBeVisible();
    await expect(picked.getByRole('button', { name: 'Delete' })).toBeInViewport({ ratio: 1 });
  });
});

import { rowMenu } from '../pages/dialogs';
import { confirmDialog, expectToast } from '../pages/notifications';
import { PNG_1X1, pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

interface AssetDto {
  id: string;
  name: string;
  extension?: string;
  kind: string;
  parentId?: string;
}

test.describe('Assets', () => {
  test('uploads a file, which the CDN API then serves @smoke', async ({ page, api, space, request }) => {
    await page.goto(`/features/spaces/${space.id}/assets`);
    await expect(page.getByText('0 total items')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: PNG_1X1 });
    const row = page.getByRole('row').filter({ hasText: 'hero.png' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('image/png');

    const [asset] = await api.get<AssetDto[]>(`/api/app/spaces/${space.id}/assets`);
    expect(asset).toMatchObject({ name: 'hero', extension: '.png', kind: 'FILE' });
    const original = await request.get(`/api/v1/spaces/${space.id}/assets/${asset.id}/original`);
    expect(Buffer.compare(await original.body(), PNG_1X1)).toBe(0);
  });

  test('creates a folder and uploads into it', async ({ page, api, space }) => {
    await page.goto(`/features/spaces/${space.id}/assets`);

    await page.getByRole('button', { name: 'Create Folder' }).click();
    const form = page.getByRole('dialog').filter({ hasText: 'Create new Folder' });
    await form.getByLabel('Name', { exact: true }).fill('Images');
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Folder has been created.');

    await page.getByRole('row').filter({ hasText: 'Images' }).click();
    await expect(page.locator('nav[hlmBreadcrumb] [aria-current="page"]').last()).toHaveText('Images');
    await page.locator('input[type="file"]').setInputFiles({ name: 'inside.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(page.getByRole('row').filter({ hasText: 'inside.png' })).toBeVisible();

    const assets = await api.get<AssetDto[]>(`/api/app/spaces/${space.id}/assets?parentId=`);
    const folder = assets.find(it => it.name === 'Images');
    const inside = await api.get<AssetDto[]>(`/api/app/spaces/${space.id}/assets?parentId=${folder?.id}`);
    expect(inside.map(it => it.name)).toEqual(['inside']);
  });

  test('deletes a file', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('old.png'));
    await page.goto(`/features/spaces/${space.id}/assets`);
    const row = page.getByRole('row').filter({ hasText: 'old.png' });

    await rowMenu(page, row, 'Delete');
    await confirmDialog(page, 'Delete Asset');
    await expectToast(page, /has been deleted/);
    await expect(row).toHaveCount(0);
    expect(await api.get<AssetDto[]>(`/api/app/spaces/${space.id}/assets`)).toEqual([]);
  });
});

import { AssetsPage } from '../pages/assets.page';
import { pdfFile, pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

test.describe('Assets → grid layout and preview', () => {
  test('the grid shows the same items with their actions; the choice is remembered', async ({ page, api, space }) => {
    await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('hero.png'));
    await api.uploadAsset(space.id, pdfFile('terms.pdf'));
    const assets = new AssetsPage(page);

    // Pre-check: the list layout.
    await assets.goto(space.id);
    await expect(assets.rows).toHaveCount(3);
    await expect(assets.cards).toHaveCount(0);

    // Action: the grid. Post-check: a card per item; a file has Download, a folder not.
    await assets.layout('Grid Layout');
    await expect(assets.cards).toHaveCount(3);
    await expect(assets.rows).toHaveCount(0);
    for (const name of ['Images', 'hero.png', 'terms.pdf']) await expect(assets.card(name)).toBeVisible();
    await expect(assets.card('hero.png').getByRole('button', { name: 'Download' })).toBeVisible();
    await expect(assets.card('Images').getByRole('button', { name: 'Download' })).toHaveCount(0);
    for (const action of ['Edit', 'Move', 'Delete'])
      await expect(assets.card('Images').getByRole('button', { name: action })).toBeVisible();

    // Kept across a reload (local settings).
    await page.reload();
    await expect(assets.cards).toHaveCount(3);

    // A folder card opens the folder.
    await assets.openCard('Images');
    await expect(assets.currentFolder).toHaveText('Images');
    await expect(assets.cards).toHaveCount(0);

    // Back to the list.
    await assets.rootFolder.click();
    await assets.layout('List Layout');
    await expect(assets.rows).toHaveCount(3);
    await expect(assets.cards).toHaveCount(0);
  });

  test('clicking an image opens its preview with name and size; other files open nothing', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('hero.png'));
    await api.uploadAsset(space.id, pdfFile('terms.pdf'));
    const assets = new AssetsPage(page);
    await assets.goto(space.id);
    await expect(assets.preview).toHaveCount(0);

    // List layout: the row opens the preview.
    await assets.row('hero.png').click();
    await expect(assets.preview).toBeVisible();
    await expect(assets.previewOf('hero.png')).toBeVisible();
    await expect(assets.preview.getByRole('img', { name: 'hero.png' })).toBeVisible();
    await expect(assets.preview).toContainText('hero.png');
    await expect(assets.preview).toContainText('W1 x H1');
    // Exact: the corner button is "close".
    await assets.preview.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(assets.preview).toHaveCount(0);

    // A PDF has no preview. Barrier: the image clicked after it opens its preview, the only dialog (a dialog of the
    // PDF would be open first, and would block the click on the image).
    await assets.row('terms.pdf').click();
    await assets.row('hero.png').click();
    await expect(assets.preview).toContainText('hero.png');
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await assets.preview.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Grid layout: the picture opens it too.
    await assets.layout('Grid Layout');
    await assets.openCard('hero.png');
    await expect(assets.preview).toContainText('hero.png');
    await page.keyboard.press('Escape');
    await expect(assets.preview).toHaveCount(0);
  });
});

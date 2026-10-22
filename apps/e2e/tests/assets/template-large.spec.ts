import type { Locator, Page } from '@playwright/test';

import { AssetsPage } from '../pages/assets.page';
import { ContentsPage } from '../pages/contents.page';
import { choose } from '../pages/dialogs';
import { bulkListed, bulkRange, LARGE_ASSETS } from '../support/assets-large';
import { contentById } from '../support/contents';
import { textFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// A prepared space: the "Assets (large)" test template — 1,000 files in `Bulk` (every 10th a PNG, text file N is N
// bytes), `Nested/Deep`, `Empty`, and a `Gallery` document (support/assets-large.ts). Each test gets its own copy.
test.use({ spaceTemplate: LARGE_ASSETS.template });

const FILE_NAME = /file-\d{4}\.(txt|png)/;

/** The file names the current page shows, in order. */
async function names(rows: Locator): Promise<string[]> {
  return (await rows.allInnerTexts()).map(it => it.match(FILE_NAME)?.[0] ?? '').filter(Boolean);
}

/** The paginator under a list or grid. */
function paginator(scope: Page | Locator) {
  return {
    status: scope.getByRole('status').filter({ hasText: /^Page \d+ of \d+$/ }),
    next: scope.getByRole('button', { name: 'Next page' }),
    last: scope.getByRole('button', { name: 'Last page' }),
    first: scope.getByRole('button', { name: 'First page' }),
  };
}

test.describe('Assets → a folder of 1,000 files', () => {
  test('pages through 1,000 files, 20 at a time or 100', async ({ page, space }) => {
    const assets = new AssetsPage(page);
    const pages = paginator(page);

    // Pre-check
    await assets.goto(space.id);
    await assets.openFolder('Bulk');
    await expect(page.getByText(`${LARGE_ASSETS.files} total items`)).toBeVisible();
    await expect(pages.status).toHaveText('Page 1 of 50');
    await expect.poll(() => names(assets.rows)).toEqual(bulkRange(1, 20));

    // Action → post-check: next, last, first.
    await pages.next.click();
    await expect(pages.status).toHaveText('Page 2 of 50');
    await expect.poll(() => names(assets.rows)).toEqual(bulkRange(21, 40));
    await pages.last.click();
    await expect(pages.status).toHaveText('Page 50 of 50');
    await expect.poll(() => names(assets.rows)).toEqual(bulkRange(981, 1000));
    await pages.first.click();
    await expect.poll(() => names(assets.rows)).toEqual(bulkRange(1, 20));

    // Action → post-check: 100 per page.
    await choose(page, page.getByLabel('Rows per page'), '100');
    await expect(pages.status).toHaveText('Page 1 of 10');
    await expect.poll(() => names(assets.rows)).toEqual(bulkRange(1, 100));
  });

  test('sorts by name, size and type', async ({ page, space }) => {
    const assets = new AssetsPage(page);
    const header = (name: string) => assets.area.getByRole('columnheader', { name, exact: true });
    await assets.goto(space.id);
    await assets.openFolder('Bulk');

    // Name: ascending, then descending.
    await header('Name').click();
    await expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(async () => (await names(assets.rows))[0]).toBe(bulkListed(1));
    await header('Name').click();
    await expect(header('Name')).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(async () => (await names(assets.rows))[0]).toBe(bulkListed(1000));

    // Size: file N is N bytes, so file-0001 is the smallest and file-0999 the largest.
    await header('File Size').click();
    await expect.poll(async () => (await names(assets.rows))[0]).toBe(bulkListed(1));
    await header('File Size').click();
    await expect.poll(async () => (await names(assets.rows))[0]).toBe(bulkListed(999));

    // Type: the 100 images together (image/png before text/plain).
    await header('Type').click();
    await expect.poll(async () => (await names(assets.rows)).every(it => it.endsWith('.png'))).toBe(true);
    await choose(page, page.getByLabel('Rows per page'), '100');
    await expect.poll(async () => (await names(assets.rows)).filter(it => it.endsWith('.png'))).toHaveLength(LARGE_ASSETS.images);
  });

  test('the grid pages the same way', async ({ page, space }) => {
    const assets = new AssetsPage(page);
    const pages = paginator(page);
    await assets.goto(space.id);
    await assets.openFolder('Bulk');

    // Action
    await assets.layout('Grid Layout');

    // Post-check: 20 cards, the last page.
    await expect(assets.cards).toHaveCount(LARGE_ASSETS.pageSize);
    await pages.last.click();
    await expect(pages.status).toHaveText('Page 50 of 50');
    await expect.poll(() => names(assets.cards)).toEqual(bulkRange(981, 1000));
  });

  test('navigates Nested/Deep and back; Empty is empty', async ({ page, space }) => {
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    await assets.openFolder('Nested');
    await expect(assets.row('nested-image.png')).toBeVisible();
    await assets.openFolder('Deep');
    await expect(assets.currentFolder).toHaveText('Deep');
    await expect(assets.row('deep-image.png')).toBeVisible();
    await assets.breadcrumb('Nested').click();
    await expect(assets.currentFolder).toHaveText('Nested');
    await assets.rootFolder.click();
    await assets.openFolder('Empty');
    await expect(assets.emptyFolder).toBeVisible();
  });

  test('the picker filters 1,000 files: images only, or all', async ({ page, api, space }) => {
    const all = await api.everyPageOf<{ id: string; name: string }>(`/api/app/spaces/${space.id}/contents?deep=true`);
    const gallery = all.find(it => it.name === 'Gallery')!.id;
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, gallery);

    // The image-only field: 100 images in Bulk, 5 pages.
    const images = await contents.openAssetPicker('Add Assets', 'Bulk', 'Images');
    await expect(images.picker.getByText(`${LARGE_ASSETS.images} total items`)).toBeVisible();
    await expect(paginator(images.picker).status).toHaveText('Page 1 of 5');
    await images.picker.getByRole('button', { name: 'Close', exact: true }).click();

    // The any-file field: all 1,000.
    const files = await contents.openAssetPicker('Add Assets', 'Bulk', 'Files');
    await expect(files.picker.getByText(`${LARGE_ASSETS.files} total items`)).toBeVisible();
    await files.picker.getByRole('button', { name: 'Close', exact: true }).click();

    // Action: pick two images; save.
    await contents.pickAssets('Add Assets', [bulkListed(10), bulkListed(20)], 'Bulk', 'Images');
    await contents.save();

    // Post-check: the API.
    // `?search=` matches anywhere in the name: `file-0001` … `file-0099`, which hold the two picked.
    const firstFiles = await api.everyPageOf<{ id: string; name: string }>(`/api/app/spaces/${space.id}/assets?search=file-00&deep=true`);
    const id = (name: string) => firstFiles.find(it => it.name === name)!.id;
    const data = (await contentById(api, space.id, gallery)).data as { images?: { uri: string }[] };
    expect(data.images?.map(it => it.uri)).toEqual([id('file-0010'), id('file-0020')]);
  });

  test('a new file in the big folder sorts first by name', async ({ page, space, api }) => {
    const assets = new AssetsPage(page);
    await assets.goto(space.id);
    await assets.openFolder('Bulk');

    // Action
    await assets.upload(textFile('file-0000.txt'));

    // Post-check: 1,001 files, first by name, also after a reload.
    await expect(page.getByText('1001 total items')).toBeVisible();
    await assets.area.getByRole('columnheader', { name: 'Name', exact: true }).click();
    await expect.poll(async () => (await names(assets.rows))[0]).toBe('file-0000.txt');
    // A reload opens the root again.
    await page.reload();
    await assets.openFolder('Bulk');
    await expect(page.getByText('1001 total items')).toBeVisible();
    expect((await api.get<{ total: number }>(`/api/app/spaces/${space.id}/assets?search=file-0000&deep=true`)).total).toBe(1);
  });
});

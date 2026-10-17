import type { Locator, Page } from '@playwright/test';

import { ContentsPage } from '../pages/contents.page';
import { choose, dialog } from '../pages/dialogs';
import { Cdn, contentById } from '../support/contents';
import { LARGE_CONTENTS, docName, docRange, postName } from '../support/contents-large';
import { expect, test } from '../support/fixtures';

// A prepared space: the "Contents (large)" test template — 1,000 documents in `Archive`, `Blog/<year>/<month>` with 16
// posts each, 40 pages at the root, English only, nothing published (support/contents-large.ts). Each test gets its
// own copy. Timings of the slow paths are recorded as test annotations, not asserted.
test.use({ spaceTemplate: LARGE_CONTENTS.template });

const DOC = /Doc \d{4}/;

/** The archive document names the current page shows, in order. */
async function docNames(rows: Locator): Promise<string[]> {
  return (await rows.allInnerTexts()).map(it => it.match(DOC)?.[0] ?? '').filter(Boolean);
}

function paginator(scope: Page | Locator) {
  return {
    status: scope.getByRole('status').filter({ hasText: /^Page \d+ of \d+$/ }),
    next: scope.getByRole('button', { name: 'Next page' }),
    last: scope.getByRole('button', { name: 'Last page' }),
  };
}

/** Records how long `action` took, as an annotation of the test. */
async function timed(label: string, action: () => Promise<void>): Promise<void> {
  const started = Date.now();
  await action();
  test.info().annotations.push({ type: 'timing', description: `${label}: ${Date.now() - started} ms` });
}

test.describe('Contents → 2,000 documents', () => {
  test('pages through a folder of 1,000 documents', async ({ page, space }) => {
    const contents = new ContentsPage(page);
    const pages = paginator(page);

    // Pre-check
    await contents.goto(space.id);
    await contents.openFolder('Archive');
    await expect(page.getByText(`${LARGE_CONTENTS.archive} total items`)).toBeVisible();
    await expect(pages.status).toHaveText('Page 1 of 50');
    await expect.poll(() => docNames(contents.rows)).toEqual(docRange(1, 20));

    // Action → post-check
    await pages.next.click();
    await expect.poll(() => docNames(contents.rows)).toEqual(docRange(21, 40));
    await pages.last.click();
    await expect(pages.status).toHaveText('Page 50 of 50');
    await expect.poll(() => docNames(contents.rows)).toEqual(docRange(981, 1000));

    // Action → post-check: 100 per page; the page holding the first row shown stays open (the last one).
    await choose(page, page.getByLabel('Rows per page'), '100');
    await expect(pages.status).toHaveText('Page 10 of 10');
    await expect.poll(() => docNames(contents.rows)).toEqual(docRange(901, 1000));
  });

  test('sorts a folder of 1,000 documents by name', async ({ page, space }) => {
    const contents = new ContentsPage(page);
    const name = page.getByRole('columnheader', { name: 'Name', exact: true });
    await contents.goto(space.id);
    await contents.openFolder('Archive');

    await name.click();
    await expect(name).toHaveAttribute('aria-sort', 'ascending');
    await expect.poll(async () => (await docNames(contents.rows))[0]).toBe(docName(1));
    await name.click();
    await expect(name).toHaveAttribute('aria-sort', 'descending');
    await expect.poll(async () => (await docNames(contents.rows))[0]).toBe(docName(1000));
  });

  test('a month three levels deep holds its 16 posts; the breadcrumb leads back', async ({ page, space }) => {
    const contents = new ContentsPage(page);
    await contents.goto(space.id);

    await contents.openFolder('Blog');
    await contents.openFolder('2024');
    await contents.openFolder('06');
    await expect(page.getByText(`${LARGE_CONTENTS.postsPerMonth} total items`)).toBeVisible();
    await expect(contents.row(postName(2024, 6, 1))).toBeVisible();
    await expect(contents.row(postName(2024, 6, 16))).toBeVisible();
    await contents.folders.getByRole('button', { name: '2024', exact: true }).click();
    await expect(contents.currentFolder).toHaveText('2024');
    await expect(page.getByText('12 total items')).toBeVisible();
    await contents.folders.getByRole('button', { name: 'Blog', exact: true }).click();
    await expect(contents.currentFolder).toHaveText('Blog');
  });

  test('publishes and unpublishes a folder of 192 documents', async ({ page, api, space, request }) => {
    const contents = new ContentsPage(page);
    const cdn = new Cdn(request, api, space.id);
    const published = async () => Object.keys(await cdn.links({ parentSlug: 'blog/2024', kind: 'DOCUMENT' })).length;
    // The published index lists every folder, published or not.
    const months = async () => Object.keys(await cdn.links({ parentSlug: 'blog/2024', kind: 'FOLDER' })).length;

    // Pre-check: nothing published; the 12 months listed.
    expect(await published()).toBe(0);
    expect(await months()).toBe(12);
    await contents.goto(space.id);
    await contents.openFolder('Blog');

    // Action: publish the year.
    await timed('publish 192 documents', () => contents.publishRow('2024', 'Folder'));

    // Post-check: its 192 documents in the published index, one delivered.
    await expect.poll(published).toBe(LARGE_CONTENTS.year);
    expect(await months()).toBe(12);
    const links = await cdn.links({ parentSlug: 'blog/2024/06', kind: 'DOCUMENT' });
    const post = Object.entries(links).find(([, it]) => it.name === postName(2024, 6, 3))![0];
    expect((await cdn.get({ id: post })).body?.data).toMatchObject({ title: postName(2024, 6, 3) });

    // Action → post-check: unpublish; the drafts stay.
    await timed('unpublish 192 documents', () => contents.unpublishRow('2024', 'Folder'));
    await expect.poll(published).toBe(0);
    expect(await months()).toBe(12);
    expect((await cdn.get({ id: post })).status).toBe(404);
    expect((await cdn.get({ id: post }, { version: 'draft' })).status).toBe(200);
  });

  test('/links lists 2,067 entries and filters them', async ({ api, space, request }) => {
    const cdn = new Cdn(request, api, space.id);
    expect(Object.keys(await cdn.links({ version: 'draft' }))).toHaveLength(LARGE_CONTENTS.documents + LARGE_CONTENTS.folders);
    expect(Object.keys(await cdn.links({ version: 'draft', kind: 'DOCUMENT' }))).toHaveLength(LARGE_CONTENTS.documents);
    const years = await cdn.links({ version: 'draft', parentSlug: 'blog', excludeChildren: 'true' });
    expect(
      Object.values(years)
        .map(it => it.name)
        .sort(),
    ).toEqual(['2022', '2023', '2024', '2025', '2026']);
  });

  test('picks a document from the last page of a 1,000-document folder', async ({ page, api, space, request }) => {
    const ids = Object.fromEntries(
      (await api.get<{ id: string; name: string }[]>(`/api/app/spaces/${space.id}/contents?name=`)).map(it => [it.name, it.id]),
    );
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, ids['Page 01']);

    // Action: the reference picker, Archive, its last page, Doc 0999.
    await page.getByRole('button', { name: 'Add Reference', exact: true }).click();
    const picker = await dialog(page, 'Contents');
    await picker
      .getByRole('row')
      .filter({ hasText: /^\s*Archive\s*#archive/ })
      .click();
    // The folder is open once its count shows; paging before that pages the root.
    await expect(picker.getByText(`${LARGE_CONTENTS.archive} total items`)).toBeVisible();
    await paginator(picker).last.click();
    await expect(paginator(picker).status).toHaveText('Page 50 of 50');
    await picker
      .getByRole('row')
      .filter({ hasText: /^\s*Doc 0999\s*#doc-0999/ })
      .click();
    await picker.getByRole('button', { name: 'Add Selected Document', exact: true }).click();
    await expect(picker).toBeHidden();
    await contents.save();

    // Post-check
    const data = (await contentById(api, space.id, ids['Page 01'])).data as { related?: { uri: string } };
    expect(data.related?.uri).toBe(ids[docName(999)]);
    const draft = await new Cdn(request, api, space.id).get({ id: ids['Page 01'] }, { version: 'draft' });
    expect(draft.body?.data).toMatchObject({ related: { uri: ids[docName(999)] } });
  });

  test('the Link field finds one document among 2,000 by typing', async ({ page, api, space }) => {
    const ids = Object.fromEntries(
      (await api.get<{ id: string; name: string }[]>(`/api/app/spaces/${space.id}/contents?name=`)).map(it => [it.name, it.id]),
    );
    const contents = new ContentsPage(page);
    const link = contents.blockField('Link');
    await contents.gotoDocument(space.id, ids['Page 01']);

    // Action: a link to a document; the list holds every document of the space.
    await link.getByRole('button', { name: 'Change link type' }).click();
    await page.getByRole('menuitemradio', { name: 'Internal Reference' }).click();
    await timed('open the document list (2,000 options)', async () => {
      await link.getByRole('combobox').click();
      await expect(page.getByRole('option').first()).toBeVisible();
    });
    await link.getByRole('combobox').fill('Doc 1000');
    await page.getByRole('option', { name: 'Doc 1000 | archive/doc-1000', exact: true }).click();
    await contents.save();

    // Post-check
    const data = (await contentById(api, space.id, ids['Page 01'])).data as { link?: { type: string; uri: string } };
    expect(data.link).toMatchObject({ type: 'content', uri: ids[docName(1000)] });
  });
});

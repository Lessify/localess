import { ContentsPage } from '../pages/contents.page';
import { pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';

// A phone-sized window (400 px): what the Contents page and the document editor must keep within reach.
test.describe('Contents → a narrow window', () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('the table keeps the name and the Actions menu; the editor keeps Save and Publish on screen', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    await api.createDocument(space.id, { name: 'A page with a rather long name', slug: 'long', schema: schema.name });
    const contents = new ContentsPage(page);

    // The table: the optional columns step aside, the Actions menu stays on screen.
    await contents.goto(space.id);
    const row = contents.row('A page with a rather long name');
    await expect(row).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Updated At' })).toBeHidden();
    await expect(row.getByRole('button', { name: 'Actions', exact: true })).toBeInViewport({ ratio: 1 });

    // The editor: the toolbar wraps under the title, Save and Publish stay on screen.
    await contents.openDocument('A page with a rather long name');
    await expect(page.getByRole('button', { name: /^Save/ })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Publish' })).toBeInViewport({ ratio: 1 });
  });
});

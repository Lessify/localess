import { ContentsPage } from '../pages/contents.page';
import { pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';
import { PreviewSite, syncedPage } from '../support/preview-site';

// The Visual Editor previews the customer's site (an environment) next to the form. The site here is served by the
// test on 127.0.0.1 and loads the app's sync script (/scripts/sync-v1.js) like a real site would.
test.describe('Contents → Visual Editor', () => {
  let site: PreviewSite;
  test.beforeEach(async () => {
    site = await PreviewSite.start();
  });
  test.afterEach(async () => {
    await site.close();
  });

  test('previews the environment URL for the document, per locale', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    await api.addEnvironment(space.id, { name: 'Staging', url: site.url });
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const doc = await api.createDocument(space.id, { name: 'Hello', slug: 'hello', schema: schema.name, parentId: blog.id });
    const contents = new ContentsPage(page);
    const preview = page.locator('iframe#previewId');

    // Pre-check: form mode, no preview.
    await contents.gotoDocument(space.id, doc.id);
    await expect(preview).toHaveCount(0);

    // Action: the Visual Editor. Post-check: the environment URL plus the full slug; German adds `de/`.
    await page
      .getByRole('radio', { name: 'Visual Editor' })
      .or(page.getByLabel('Visual Editor', { exact: true }))
      .first()
      .click();
    await expect(preview).toHaveAttribute('src', `${site.url}blog/hello`);
    await expect.poll(() => site.requests).toContain('/blog/hello');
    await contents.editorLocale('German');
    await expect(preview).toHaveAttribute('src', `${site.url}de/blog/hello`);
  });

  test('a synced page shows edits as they are typed, and a click on it selects the field @smoke', async ({ page, api, space, baseURL }) => {
    await api.addEnvironment(space.id, { name: 'Local', url: site.url });
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'Stored title' });
    site.serve(syncedPage(new URL(baseURL!).origin, { id: doc.id, schema: schema.name }, 'Stored title'));
    const contents = new ContentsPage(page);

    // Pre-check: the page loads and connects.
    await contents.gotoDocument(space.id, doc.id);
    await page
      .getByRole('radio', { name: 'Visual Editor' })
      .or(page.getByLabel('Visual Editor', { exact: true }))
      .first()
      .click();
    const frame = page.frameLocator('iframe#previewId');
    await expect(frame.locator('#title')).toHaveText('Stored title');
    await expect(frame.locator('main[data-ll-hook="true"]')).toBeAttached();

    // Action: type in the form. Post-check: the page follows before anything is saved.
    await contents.field('Title').fill('Typed live');
    await expect(frame.locator('#title')).toHaveText('Typed live');

    // Action: click the title on the page. Post-check: the form's field gets the focus.
    await contents.field('Title').blur();
    await frame.locator('#title').click();
    await expect(contents.field('Title')).toBeFocused();
  });
});

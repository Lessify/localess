import { ContentsPage } from '../pages/contents.page';
import { expect, test, type TestSpace, uniqueId } from '../support/fixtures';
import type { AppApi } from '../support/app-api';

/** A ROOT schema with a translatable title, which documents need. */
async function pageSchema(api: AppApi, space: TestSpace): Promise<{ name: string; displayName: string }> {
  const name = uniqueId('page');
  await api.createSchema(space.id, {
    name,
    type: 'ROOT',
    displayName: 'Landing Page',
    fields: [{ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true }],
  });
  return { name, displayName: 'Landing Page' };
}

test.describe('Contents', () => {
  test('creates a folder and a document, edits, saves and publishes it to the CDN API @smoke', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const contents = new ContentsPage(page);
    await contents.goto(space.id);
    await expect(page.getByText('No content yet.')).toBeVisible();

    await contents.addFolder('Blog', 'blog');
    await contents.openFolder('Blog');
    await contents.addDocument('Hello World', 'hello-world', schema.displayName);
    await contents.openDocument('Hello World');

    await contents.field('Title').fill('My first post');
    await contents.save();
    await contents.publish();

    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const cdn = await request.get(`/api/v1/spaces/${space.id}/contents/slugs/blog/hello-world?token=${token}`);
    expect(cdn.status()).toBe(200);
    expect((await cdn.json()).data).toMatchObject({ title: 'My first post', _schema: schema.name });
  });

  test('keeps an edit after a reload, and warns before leaving unsaved changes', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'About', slug: 'about', schema: schema.name });
    const contents = new ContentsPage(page);
    await page.goto(`/features/spaces/${space.id}/contents/${doc.id}`);

    await contents.field('Title').fill('Saved text');
    await contents.save();
    await page.reload();
    await expect(contents.field('Title')).toHaveValue('Saved text');

    await contents.field('Title').fill('Not saved');
    // A native confirm(): answer it from the listener, the click only returns once it is closed.
    let message = '';
    page.once('dialog', dialog => {
      message = dialog.message();
      void dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Back to Contents' }).click();
    expect(message).toContain('unsaved changes');
    await expect(page).toHaveURL(new RegExp(`/contents/${doc.id}$`));
    await expect(contents.field('Title')).toHaveValue('Not saved');
  });

  test('deletes a folder with everything in it', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    const folder = await api.createFolder(space.id, { name: 'Archive', slug: 'archive' });
    await api.createDocument(space.id, { name: 'Old post', slug: 'old', schema: schema.name, parentId: folder.id });
    const contents = new ContentsPage(page);
    await contents.goto(space.id);

    await contents.delete('Archive', 'Folder');
    await expect(page.getByText('No content yet.')).toBeVisible();
    const left = await api.get<unknown[]>(`/api/app/spaces/${space.id}/contents?kind=DOCUMENT`);
    expect(left).toEqual([]);
  });
});

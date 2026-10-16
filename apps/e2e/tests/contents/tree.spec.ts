import { dialog } from '../pages/dialogs';
import { ContentsPage } from '../pages/contents.page';
import { expectToast } from '../pages/notifications';
import { CSRF } from '../support/app-api';
import { Cdn, contentById, contentNamed, contentsIn, pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, the breadcrumb, after a reload, the App API, the CDN API).
test.describe('Contents → folders and documents', () => {
  test('creates folders three levels deep; the breadcrumb leads back to each level', async ({ page, api, space }) => {
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await expect(contents.empty).toBeVisible();

    // Action
    await contents.addFolder('Blog', 'blog');
    await contents.openFolder('Blog');
    await contents.addFolder('News', 'news');
    await contents.openFolder('News');
    await contents.addFolder('Archive', 'archive');

    // Post-check: the API tree, and the breadcrumb.
    const blog = await contentNamed(api, space.id, 'Blog');
    const news = await contentNamed(api, space.id, 'News');
    expect(news?.parentId).toBe(blog?.id);
    expect(await contentNamed(api, space.id, 'Archive')).toMatchObject({ parentId: news?.id, fullSlug: 'blog/news/archive' });
    await contents.openFolder('Archive');
    await contents.breadcrumb('News').click();
    await expect(contents.currentFolder).toHaveText('News');
    await expect(contents.row('Archive')).toBeVisible();
    await contents.breadcrumb('Blog').click();
    await expect(contents.row('News')).toBeVisible();
    await contents.rootFolder.click();
    await expect(contents.row('Blog')).toBeVisible();
    await expect(contents.rows).toHaveCount(1);
  });

  test('creates a document in the open folder; only Root schemas are offered @smoke', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    await api.createSchema(space.id, { name: `Node${schema.name}`, type: 'NODE', displayName: 'A Node' });
    const folder = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await contents.openFolder('Blog');
    await expect(contents.rows).toHaveCount(0);

    // Action: the schema list has the Root only.
    const form = await contents.openAdd('Document', { name: 'Hello World' });
    await form.locator('#schema').click();
    await expect(page.getByRole('option')).toHaveText([schema.displayName]);
    await page.getByRole('option', { name: schema.displayName }).click();
    await expect(form.getByLabel('Slug', { exact: true })).toHaveValue('hello-world');
    await form.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Document has been created.');

    // Post-check
    await expect(contents.row('Hello World')).toContainText('#hello-world');
    await expect(contents.status('Hello World', 'Not published')).toBeVisible();
    expect(await contentNamed(api, space.id, 'Hello World')).toMatchObject({
      kind: 'DOCUMENT',
      parentId: folder.id,
      schema: schema.name,
      fullSlug: 'blog/hello-world',
    });
  });

  test('slug rules: taken in the same folder refused, fine in another; invalid slugs refused', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    await api.createDocument(space.id, { name: 'About', slug: 'about', schema: schema.name });
    const contents = new ContentsPage(page);
    await contents.goto(space.id);

    // A slug taken in this folder: refused in the dialog, and by the server (409).
    const form = await contents.openAdd('Document', { name: 'About again', slug: 'about', schema: schema.displayName });
    await form.getByLabel('Slug', { exact: true }).blur();
    await expect(form.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(form.locator('hlm-field-error').first()).toBeVisible();
    await form.getByRole('button', { name: 'Cancel' }).click();
    const taken = await request.post(`/api/app/spaces/${space.id}/contents`, {
      headers: CSRF,
      data: { kind: 'DOCUMENT', name: 'About again', slug: 'about', schema: schema.name },
    });
    expect(taken.status()).toBe(409);
    expect(await taken.text()).toContain("'about' is already used");
    expect((await contentsIn(api, space.id)).filter(it => it.slug === 'about')).toHaveLength(1);

    // Invalid slugs: Save disabled; Normalize fixes one.
    const invalid = await contents.openAdd('Folder', { name: 'Odd', slug: 'has space' });
    await invalid.getByLabel('Slug', { exact: true }).blur();
    await expect(invalid.getByRole('button', { name: 'Save' })).toBeDisabled();
    await invalid.getByRole('button', { name: 'Normalize Slug' }).click();
    await expect(invalid.getByLabel('Slug', { exact: true })).toHaveValue(/^[a-z0-9][a-z0-9_-]*$/);
    await expect(invalid.getByRole('button', { name: 'Save' })).toBeEnabled();
    await invalid.getByRole('button', { name: 'Cancel' }).click();

    // The same slug in another folder is fine.
    await contents.openFolder('Blog');
    await contents.addDocument('About', 'about', schema.displayName);
    expect((await contentsIn(api, space.id, blog.id)).map(it => it.fullSlug)).toEqual(['blog/about']);
  });

  test('renaming a slug moves the document and the folder contents to their new CDN paths', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const post = await api.createDocument(space.id, { name: 'Post', slug: 'post', schema: schema.name, parentId: blog.id });
    await api.saveDocumentData(space.id, post, { title: 'Hello' });
    await api.publishContent(space.id, post.id);
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check
    expect((await cdn.get({ slug: 'blog/post' })).status).toBe(200);

    // Action: the folder's slug, then the document's.
    await contents.goto(space.id);
    await contents.rename('Blog', { name: 'Journal', slug: 'journal' });
    await contents.openFolder('Journal');
    await contents.rename('Post', { slug: 'first-post' });

    // Post-check: the new path everywhere, the old one gone.
    await expect(contents.row('Post')).toContainText('#first-post');
    await expect.poll(async () => (await contentById(api, space.id, post.id)).fullSlug).toBe('journal/first-post');
    expect((await cdn.get({ slug: 'journal/first-post' })).body?.data).toMatchObject({ title: 'Hello' });
    expect((await cdn.get({ slug: 'blog/post' })).status).toBe(404);
  });

  test('moves a document, and a folder with its contents; a folder can not move into itself', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const news = await api.createFolder(space.id, { name: 'News', slug: 'news', parentId: blog.id });
    const doc = await api.createDocument(space.id, { name: 'Loose', slug: 'loose', schema: schema.name });
    const inNews = await api.createDocument(space.id, { name: 'Item', slug: 'item', schema: schema.name, parentId: news.id });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await expect(contents.row('Loose')).toBeVisible();

    // Action 1: the document into Blog.
    await contents.move('Loose', 'Blog');
    await expect(contents.row('Loose')).toHaveCount(0);
    expect(await contentById(api, space.id, doc.id)).toMatchObject({ parentId: blog.id, fullSlug: 'blog/loose' });

    // Action 2: the News folder (with its document) to the root.
    await contents.openFolder('Blog');
    await contents.move('News', 'Root');
    expect(await contentById(api, space.id, inNews.id)).toMatchObject({ fullSlug: 'news/item' });

    // A folder is not offered as a target inside itself; the server refuses it too.
    await contents.rootFolder.click();
    const form = await contents.openMove('News');
    await form.getByPlaceholder('Search folders...').first().click();
    await expect(page.getByRole('option').filter({ hasText: /^\s*News\b/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await form.getByRole('button', { name: 'Cancel' }).click();
    const self = await request.patch(`/api/app/spaces/${space.id}/contents/${news.id}`, {
      headers: CSRF,
      data: { parentId: news.id },
    });
    expect(self.status()).toBe(400);
  });

  test('clones a document: a copy with a suffix, its data, never published', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'Original', slug: 'original', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'Copied text' });
    await api.publishContent(space.id, doc.id);
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await expect(contents.rows).toHaveCount(1);

    // Action
    await contents.clone('Original');

    // Post-check
    await expect(contents.rows).toHaveCount(2);
    const all = await contentsIn(api, space.id);
    const copy = all.find(it => it.id !== doc.id)!;
    expect(copy.name).toMatch(/^Original /);
    expect(copy.slug).toMatch(/^original-/);
    expect(copy.publishedAt).toBeUndefined();
    expect((await contentById(api, space.id, copy.id)).data).toMatchObject({ title: 'Copied text' });
    expect((await new Cdn(request, api, space.id).get({ id: copy.id })).status).toBe(404);
  });

  test('deletes a document and a folder with everything in it; cancel keeps it', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const folder = await api.createFolder(space.id, { name: 'Archive', slug: 'archive' });
    const inside = await api.createDocument(space.id, { name: 'Old', slug: 'old', schema: schema.name, parentId: folder.id });
    const single = await api.createDocument(space.id, { name: 'Single', slug: 'single', schema: schema.name });
    const keep = await api.createDocument(space.id, { name: 'Keep', slug: 'keep', schema: schema.name });
    for (const it of [inside, single, keep]) await api.publishContent(space.id, it.id);
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await expect(contents.rows).toHaveCount(3);

    // Action: cancel once, then delete the document and the folder.
    await contents.row('Keep').getByRole('button', { name: 'Actions', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    const confirm = await dialog(page, 'Delete Document');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await contents.delete('Single', 'Document');
    await contents.delete('Archive', 'Folder');

    // Post-check
    await page.reload();
    await expect(contents.row('Keep')).toBeVisible();
    await expect(contents.rows).toHaveCount(1);
    expect((await api.get<unknown[]>(`/api/app/spaces/${space.id}/contents`)).length).toBe(1);
    expect((await cdn.get({ id: single.id })).status).toBe(404);
    expect((await cdn.get({ id: inside.id })).status).toBe(404);
    expect((await cdn.get({ id: keep.id })).status).toBe(200);
  });

  test.describe('clipboard', () => {
    test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

    test('copies the slug and the full slug', async ({ page, api, space }) => {
      const schema = await pageSchema(api, space);
      const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
      await api.createDocument(space.id, { name: 'Post', slug: 'post', schema: schema.name, parentId: blog.id });
      const contents = new ContentsPage(page);
      await contents.goto(space.id);
      await contents.openFolder('Blog');

      for (const [item, toast, value] of [
        ['Copy Slug', 'Slug copied to clipboard.', 'post'],
        ['Copy Full Slug', 'Full Slug copied to clipboard.', 'blog/post'],
      ]) {
        await contents.row('Post').getByRole('button', { name: 'Actions', exact: true }).click();
        await page.getByRole('menuitem', { name: item, exact: true }).click();
        await expectToast(page, toast);
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
      }
    });
  });

  test('publishing a folder publishes its documents; unpublishing it takes them off the CDN', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const a = await api.createDocument(space.id, { name: 'A', slug: 'a', schema: schema.name, parentId: blog.id });
    const b = await api.createDocument(space.id, { name: 'B', slug: 'b', schema: schema.name, parentId: blog.id });
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check: nothing published.
    await contents.goto(space.id);
    expect((await cdn.get({ id: a.id })).status).toBe(404);

    // Action: publish the folder. Post-check.
    await contents.publishRow('Blog', 'Folder');
    expect((await cdn.get({ slug: 'blog/a' })).status).toBe(200);
    expect((await cdn.get({ slug: 'blog/b' })).status).toBe(200);
    await contents.openFolder('Blog');
    await expect(contents.status('A', 'Published')).toBeVisible();

    // Action: unpublish it. Post-check.
    await contents.rootFolder.click();
    await contents.unpublishRow('Blog', 'Folder');
    expect((await cdn.get({ id: a.id })).status).toBe(404);
    expect((await cdn.get({ id: b.id })).status).toBe(404);
  });
});

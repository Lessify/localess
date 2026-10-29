import { ContentsPage } from '../pages/contents.page';
import { Cdn, pageSchema } from '../support/contents';
import { expect, test } from '../support/fixtures';
import { WebhookReceiver } from '../support/webhook-receiver';

// What sites and integrations get: the CDN's link index, the publish webhook, live updates, the JSON links.
test.describe('Contents → delivery', () => {
  test('the CDN link index lists folders and published documents; the draft index lists all', async ({ api, space, request }) => {
    const schema = await pageSchema(api, space);
    const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const published = await api.createDocument(space.id, { name: 'Live', slug: 'live', schema: schema.name, parentId: blog.id });
    const draft = await api.createDocument(space.id, { name: 'Draft', slug: 'draft', schema: schema.name, parentId: blog.id });
    const other = await api.createDocument(space.id, { name: 'About', slug: 'about', schema: schema.name });
    for (const it of [published, other]) await api.publishContent(space.id, it.id);
    const cdn = new Cdn(request, api, space.id);

    const links = await cdn.links();
    expect(Object.keys(links).sort()).toEqual([blog.id, published.id, other.id].sort());
    expect(links[published.id]).toMatchObject({ fullSlug: 'blog/live', kind: 'DOCUMENT' });
    expect(links[blog.id]).toMatchObject({ kind: 'FOLDER' });

    expect(Object.keys(await cdn.links({ version: 'draft' }))).toContain(draft.id);
    const inBlog = await cdn.links({ parentSlug: 'blog', kind: 'DOCUMENT' });
    expect(Object.keys(inBlog)).toEqual([published.id]);
  });

  test('publishing sends the content.published webhook with the id and full slug', async ({ page, api, space }) => {
    const receiver = await WebhookReceiver.start();
    try {
      await api.createWebhook(space.id, { name: 'Site rebuild', url: receiver.url, events: ['content.published'] });
      const schema = await pageSchema(api, space);
      const blog = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
      const doc = await api.createDocument(space.id, { name: 'Post', slug: 'post', schema: schema.name, parentId: blog.id });
      const contents = new ContentsPage(page);

      // Action: publish in the editor.
      await contents.gotoDocument(space.id, doc.id);
      await contents.publish();

      // Post-check
      await expect.poll(() => receiver.requests.length).toBe(1);
      expect(JSON.parse(receiver.requests[0].body)).toMatchObject({
        event: 'content.published',
        spaceId: space.id,
        data: { id: doc.id, fullSlug: 'blog/post' },
      });
    } finally {
      await receiver.close();
    }
  });

  test('a document added elsewhere shows in the list without a reload', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.goto(space.id);
    await expect(contents.empty).toBeVisible();

    // Action: a colleague adds one.
    await api.createDocument(space.id, { name: 'From a colleague', slug: 'colleague', schema: schema.name });

    // Post-check
    await expect(contents.row('From a colleague')).toBeVisible();
  });

  test('the Draft and Published JSON links open the CDN documents with the right token', async ({ page, api, space }) => {
    const schema = await pageSchema(api, space);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'Published text' });
    await api.publishContent(space.id, doc.id);
    await api.saveDocumentData(space.id, doc, { title: 'Draft text' });
    await api.createToken(space.id, { name: 'Website', type: 'public' });
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, doc.id);

    for (const [item, version, title] of [
      [/^Draft .* JSON$/, 'draft', 'Draft text'],
      [/^Published .* JSON$/, undefined, 'Published text'],
    ] as const) {
      await page.getByRole('button', { name: 'More', exact: true }).click();
      const popup = page.waitForEvent('popup');
      await page.getByRole('menuitem', { name: item }).click();
      const json = await popup;
      await json.waitForLoadState();
      const url = new URL(json.url());
      expect(url.pathname).toBe(`/api/v1/spaces/${space.id}/contents/${doc.id}`);
      expect(url.searchParams.get('version') ?? undefined).toBe(version);
      expect(url.searchParams.get('token')).toMatch(version ? /^prv_/ : /^pub_/);
      expect(await json.textContent('body')).toContain(title);
      await json.close();
    }
  });
});

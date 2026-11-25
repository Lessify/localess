import { randomUUID } from 'node:crypto';

import { ContentsPage } from '../pages/contents.page';
import { contentById, pageSchema } from '../support/contents';
import { expect, test, uniqueId } from '../support/fixtures';
import { PreviewSite, syncedBlocksPage, syncedPage } from '../support/preview-site';

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
    const preview = contents.preview;

    // Pre-check: form mode, no preview.
    await contents.gotoDocument(space.id, doc.id);
    await expect(preview).toHaveCount(0);

    // Action: the Visual Editor. Post-check: the environment URL plus the full slug; German adds `de/`.
    await contents.openVisualEditor();
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
    await contents.openVisualEditor();
    const frame = contents.previewFrame;
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

  test("the selected block's toolbar on the page moves, duplicates and deletes it; hovering highlights both sides", async ({
    page,
    api,
    space,
    baseURL,
  }) => {
    const card = uniqueId('Card');
    await api.createSchema(space.id, {
      name: card,
      type: 'NODE',
      displayName: 'Card',
      fields: [{ name: 'heading', kind: 'TEXT', displayName: 'Heading' }],
    });
    const schema = await pageSchema(api, space, [{ name: 'body', kind: 'SCHEMAS', displayName: 'Body', schemas: [card] }]);
    const doc = await api.createDocument(space.id, { name: 'Landing', slug: 'landing', schema: schema.name });
    const body = ['First', 'Second', 'Third'].map(heading => ({ _id: randomUUID(), _schema: card, heading }));
    await api.saveDocumentData(space.id, doc, { body });
    await api.addEnvironment(space.id, { name: 'Local', url: site.url });
    site.serve(syncedBlocksPage(new URL(baseURL!).origin, { id: doc.id, schema: schema.name }, body));
    const contents = new ContentsPage(page);
    const frame = contents.previewFrame;
    const sections = frame.locator('section[data-ll-id]');
    const headings = () => sections.locator('h2').allInnerTexts();
    const toolbar = frame.getByRole('toolbar', { name: 'Block actions' });
    const stored = async () => ((await contentById(api, space.id, doc.id)).data!.body as typeof body).map(it => it.heading);

    // Pre-check: the page shows the stored blocks, connected; no toolbar before a block is selected.
    await contents.gotoDocument(space.id, doc.id);
    await contents.openVisualEditor();
    await expect.poll(headings).toEqual(['First', 'Second', 'Third']);
    await expect(frame.locator('main[data-ll-hook="true"]')).toBeAttached();
    await expect(toolbar).toBeHidden();

    // Hover a block in the form: the page highlights it. Hover it on the page: the form marks it.
    // The form's rows show the schema, not the heading: by position.
    const formBlock = (index: number) => contents.blocks(contents.blockField('Body')).nth(index);
    // Highlights are only visual (no accessible state): checked by their classes. A hover that crosses into or out of
    // the preview's frame can be missed by the frame under load, so the pointer is moved there again until it lands:
    // first away (the corner of the editor page), as the page reports `mouseenter`, which a pointer already on the
    // block never fires again.
    await expect(async () => {
      await page.mouse.move(0, 0);
      await formBlock(1).hover();
      await expect(sections.nth(1)).toHaveClass(/ll-hover-highlight/, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(async () => {
      await page.mouse.move(0, 0);
      await sections.nth(2).hover();
      await expect(formBlock(2)).toHaveClass(/border-primary/, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    // Select the first block: no Move up for it.
    await sections.nth(0).click();
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole('button')).toHaveCount(3);
    await expect(toolbar.getByRole('button', { name: 'Move up' })).toHaveCount(0);
    await expect(toolbar.getByRole('button', { name: 'Move down' })).toBeVisible();

    // Action: Move down. Post-check: the page and the form follow; nothing is stored before Save.
    await toolbar.getByRole('button', { name: 'Move down' }).click();
    await expect.poll(headings).toEqual(['Second', 'First', 'Third']);
    await expect(toolbar.getByRole('button', { name: 'Move up' })).toBeVisible();
    expect(await stored()).toEqual(['First', 'Second', 'Third']);

    // Action: Duplicate. Post-check: a copy right after it.
    await toolbar.getByRole('button', { name: 'Duplicate' }).click();
    await expect.poll(headings).toEqual(['Second', 'First', 'First', 'Third']);

    // Action: Delete takes a second click.
    await toolbar.getByRole('button', { name: 'Delete' }).click();
    await expect(toolbar.getByRole('button', { name: 'Confirm delete' })).toBeVisible();
    expect(await headings()).toHaveLength(4);
    await toolbar.getByRole('button', { name: 'Confirm delete' }).click();
    await expect.poll(headings).toHaveLength(3);
    await expect(toolbar).toBeHidden();

    // Post-check: saved, in the page's order, the copy with its own id.
    await contents.save();
    const saved = (await contentById(api, space.id, doc.id)).data!.body as typeof body;
    expect(saved.map(it => it.heading)).toEqual(await headings());
    expect(new Set(saved.map(it => it._id)).size).toBe(3);
  });
});

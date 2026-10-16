import { dialog } from '../pages/dialogs';
import { ContentsPage } from '../pages/contents.page';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';

// Choices from an Enum, links, references to documents and assets. Post-check: the stored shape and what the CDN
// API delivers (with resolveLink / resolveReference / resolveAsset where they apply).
test.describe('Contents → form: choices and relations', () => {
  test('Option stores one enum value, Options a list', async ({ page, api, space, request }) => {
    const sizes = uniqueId('Sizes');
    const enumSchema = await api.createSchema(space.id, { name: sizes, type: 'ENUM' });
    await api.send('put', `/api/app/spaces/${space.id}/schemas/${enumSchema.id}`, {
      values: [
        { name: 'Small', value: 's' },
        { name: 'Medium', value: 'm' },
        { name: 'Large', value: 'l' },
      ],
    });
    const schema = await pageSchema(api, space, [
      { name: 'size', kind: 'OPTION', displayName: 'Size', source: sizes },
      { name: 'available', kind: 'OPTIONS', displayName: 'Available', source: sizes },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Shirt', slug: 'shirt', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    await expect(page.getByLabel('Size')).toContainText('Select a value');

    // Action
    await page.getByLabel('Size').click();
    await page.getByRole('option', { name: 'Medium' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await page.getByLabel('Available').click();
    await page.getByRole('option', { name: 'Small' }).click();
    await page.getByRole('option', { name: 'Large' }).click();
    await page.keyboard.press('Escape');
    await contents.save();
    await contents.publish();

    // Post-check
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.size).toBe('m');
    expect([...(data.available as string[])].sort()).toEqual(['l', 's']);
    expect((await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data).toMatchObject({ size: 'm' });
  });

  test('Link to a URL (new tab) and to a document; the CDN resolves the document link', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space, [
      { name: 'external', kind: 'LINK', displayName: 'External' },
      { name: 'internal', kind: 'LINK', displayName: 'Internal' },
    ]);
    const target = await api.createDocument(space.id, { name: 'Contact', slug: 'contact', schema: schema.name });
    await api.publishContent(space.id, target.id);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    const external = page.locator('fieldset, [hlmField]').filter({ hasText: 'External' }).first();
    const internal = page.locator('fieldset, [hlmField]').filter({ hasText: 'Internal' }).first();

    // Action: a URL opening in a new tab.
    await external.locator('input[type="url"]').fill('https://example.com/docs');
    await external.getByRole('switch', { name: 'Open in a new tab' }).click();
    // A link to a document.
    await internal.getByRole('button', { name: 'Change link type' }).click();
    await page.getByRole('menuitemradio', { name: 'Internal Reference' }).click();
    await internal.getByPlaceholder('Select a document').first().click();
    await page.getByRole('option', { name: /Contact/ }).click();
    await contents.save();
    await contents.publish();

    // Post-check: stored shapes; the CDN resolves the document link.
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.external).toEqual({ kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/docs' });
    expect(data.internal).toMatchObject({ kind: 'LINK', type: 'content', uri: target.id });
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveLink: 'true' })).body;
    expect(cdn?.links?.[target.id]).toMatchObject({ fullSlug: 'contact' });
  });

  test('Reference and References pick documents in a dialog; the CDN resolves them', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space, [
      { name: 'author', kind: 'REFERENCE', displayName: 'Author' },
      { name: 'related', kind: 'REFERENCES', displayName: 'Related' },
    ]);
    const ids: Record<string, string> = {};
    for (const name of ['Ann', 'Post A', 'Post B']) {
      const it = await api.createDocument(space.id, { name, slug: name.toLowerCase().replace(' ', '-'), schema: schema.name });
      await api.publishContent(space.id, it.id);
      ids[name] = it.id;
    }
    const doc = await api.createDocument(space.id, { name: 'Article', slug: 'article', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);

    // Action: one reference, then two.
    await page.getByRole('button', { name: 'Add Reference', exact: true }).click();
    let picker = await dialog(page, 'Contents');
    await picker.getByRole('row').filter({ hasText: 'Ann' }).click();
    await picker.getByRole('button', { name: 'Add Selected Document' }).click();
    await page.getByRole('button', { name: 'Add References', exact: true }).click();
    picker = await dialog(page, 'Contents');
    await picker.getByRole('row').filter({ hasText: 'Post A' }).click();
    await picker.getByRole('row').filter({ hasText: 'Post B' }).click();
    await picker.getByRole('button', { name: 'Add Selected Documents (2)' }).click();
    await contents.save();
    await contents.publish();

    // Post-check
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.author).toEqual({ kind: 'REFERENCE', uri: ids['Ann'] });
    expect((data.related as { uri: string }[]).map(it => it.uri).sort()).toEqual([ids['Post A'], ids['Post B']].sort());
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveReference: 'true' })).body;
    expect(Object.keys(cdn?.references ?? {}).sort()).toEqual([ids['Ann'], ids['Post A'], ids['Post B']].sort());

    // Removing one reference.
    await page.locator('[role="listitem"]').filter({ hasText: 'Post A' }).getByRole('button', { name: 'Delete' }).click();
    await contents.save();
    expect(((await contentById(api, space.id, doc.id)).data!.related as { uri: string }[]).map(it => it.uri)).toEqual([ids['Post B']]);
  });

  test('Asset and Assets pick files in a dialog; the CDN resolves them', async ({ page, api, space, request }) => {
    const hero = await api.uploadAsset(space.id, pngFile('hero.png'));
    const one = await api.uploadAsset(space.id, pngFile('one.png'));
    const two = await api.uploadAsset(space.id, pngFile('two.png'));
    const schema = await pageSchema(api, space, [
      { name: 'image', kind: 'ASSET', displayName: 'Image' },
      { name: 'gallery', kind: 'ASSETS', displayName: 'Gallery' },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Gallery', slug: 'gallery', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);

    // Action
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
    let picker = await dialog(page, 'Assets');
    await picker.getByRole('row').filter({ hasText: 'hero.png' }).click();
    await picker.getByRole('button', { name: 'Add Selected Asset' }).click();
    await page.getByRole('button', { name: 'Add Assets', exact: true }).click();
    picker = await dialog(page, 'Assets');
    await picker.getByRole('row').filter({ hasText: 'one.png' }).click();
    await picker.getByRole('row').filter({ hasText: 'two.png' }).click();
    await picker.getByRole('button', { name: 'Add Selected Assets (2)' }).click();
    await expect(page.locator('[role="listitem"]').filter({ hasText: 'hero.png' })).toBeVisible();
    await contents.save();
    await contents.publish();

    // Post-check
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.image).toEqual({ kind: 'ASSET', uri: hero.id });
    expect((data.gallery as { uri: string }[]).map(it => it.uri).sort()).toEqual([one.id, two.id].sort());
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveAsset: 'true' })).body;
    expect(Object.keys(cdn?.assets ?? {}).sort()).toEqual([hero.id, one.id, two.id].sort());
    expect(await api.get(`/api/app/spaces/${space.id}/assets/${hero.id}/usage`)).toEqual({ contents: 1 });
  });
});

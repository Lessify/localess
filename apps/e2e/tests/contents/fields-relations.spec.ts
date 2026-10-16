import { ContentsPage } from '../pages/contents.page';
import { dialog } from '../pages/dialogs';
import { SchemasPage } from '../pages/schemas.page';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { pdfFile, pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';
import { createEnum, schemaNamed } from '../support/schemas';

// Choices from an Enum, links, references to documents and assets. Post-check: the stored shape, the editor after a
// reload, and what the CDN API delivers (with resolveLink / resolveReference / resolveAsset where they apply).
test.describe('Contents → form: choices and relations', () => {
  test('Option stores one enum value, Options a list', async ({ page, api, space, request }) => {
    const sizes = uniqueId('Sizes');
    await createEnum(api, space.id, sizes, [
      { name: 'Small', value: 's' },
      { name: 'Medium', value: 'm' },
      { name: 'Large', value: 'l' },
    ]);
    const schema = await pageSchema(api, space, [
      { name: 'size', kind: 'OPTION', displayName: 'Size', source: sizes },
      { name: 'available', kind: 'OPTIONS', displayName: 'Available', source: sizes },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Shirt', slug: 'shirt', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    await expect(contents.field('Size')).toContainText('Select a value');

    // Action
    await contents.chooseOption('Size', 'Medium');
    await contents.chooseOptions('Available', ['Small', 'Large']);
    await contents.save();
    await contents.publish();

    // Post-check: stored, delivered, and shown again after a reload.
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.size).toBe('m');
    expect([...(data.available as string[])].sort()).toEqual(['l', 's']);
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id })).body?.data;
    expect(cdn?.size).toBe('m');
    expect([...(cdn?.available as string[])].sort()).toEqual(['l', 's']);
    await page.reload();
    await expect(contents.field('Size')).toContainText('Medium');
    await expect(contents.field('Available')).toContainText('Small');
    await expect(contents.field('Available')).toContainText('Large');
    await expect(contents.field('Available')).not.toContainText('Medium');
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
    const external = contents.blockField('External');
    const internal = contents.blockField('Internal');

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    await expect(external.getByRole('textbox')).toHaveValue('');

    // Action: a URL opening in a new tab.
    await external.getByRole('textbox').fill('https://example.com/docs');
    await external.getByRole('switch', { name: 'Open in a new tab' }).click();
    // A link to a document.
    await internal.getByRole('button', { name: 'Change link type' }).click();
    await page.getByRole('menuitemradio', { name: 'Internal Reference' }).click();
    await internal.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Contact | contact', exact: true }).click();
    await contents.save();
    await contents.publish();

    // Post-check: stored shapes; the CDN delivers both and resolves the document link; the editor after a reload.
    const data = (await contentById(api, space.id, doc.id)).data!;
    const url = { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com/docs' };
    expect(data.external).toEqual(url);
    expect(data.internal).toMatchObject({ kind: 'LINK', type: 'content', uri: target.id });
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveLink: 'true' })).body;
    expect(cdn?.data.external).toEqual(url);
    expect(cdn?.data.internal).toMatchObject({ kind: 'LINK', type: 'content', uri: target.id });
    expect(cdn?.links?.[target.id]).toMatchObject({ fullSlug: 'contact' });
    await page.reload();
    await expect(external.getByRole('textbox')).toHaveValue('https://example.com/docs');
    await expect(external.getByRole('switch', { name: 'Open in a new tab' })).toHaveAttribute('aria-checked', 'true');
    await expect(internal.getByRole('combobox')).toHaveValue('Contact | contact');
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
    await expect(page.getByRole('button', { name: 'Add References', exact: true })).toBeVisible();
    for (const name of ['Ann', 'Post A', 'Post B']) await expect(contents.pickedDocument(name)).toHaveCount(0);

    // Action: one reference, then two.
    await contents.pickDocuments('Add Reference', ['Ann']);
    await contents.pickDocuments('Add References', ['Post A', 'Post B']);
    await contents.save();
    await contents.publish();

    // Post-check
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.author).toEqual({ kind: 'REFERENCE', uri: ids['Ann'] });
    expect((data.related as { uri: string }[]).map(it => it.uri).sort()).toEqual([ids['Post A'], ids['Post B']].sort());
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveReference: 'true' })).body;
    expect(Object.keys(cdn?.references ?? {}).sort()).toEqual([ids['Ann'], ids['Post A'], ids['Post B']].sort());
    await page.reload();
    for (const name of ['Ann', 'Post A', 'Post B']) await expect(contents.pickedDocument(name)).toBeVisible();

    // Removing one reference.
    await contents.pickedDocument('Post A').getByRole('button', { name: 'Delete' }).click();
    await expect(contents.pickedDocument('Post A')).toHaveCount(0);
    await contents.save();
    // The Save toast can still be the first one: the API is the proof.
    await expect
      .poll(async () => ((await contentById(api, space.id, doc.id)).data!.related as { uri: string }[]).map(it => it.uri))
      .toEqual([ids['Post B']]);
    await page.reload();
    await expect(contents.pickedDocument('Post B')).toBeVisible();
    await expect(contents.pickedDocument('Post A')).toHaveCount(0);
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
    await expect(page.getByRole('button', { name: 'Add Assets', exact: true })).toBeVisible();
    for (const name of ['hero.png', 'one.png', 'two.png']) await expect(contents.pickedAsset(name)).toHaveCount(0);

    // Action
    await contents.pickAssets('Add Asset', ['hero.png']);
    await contents.pickAssets('Add Assets', ['one.png', 'two.png']);
    await expect(contents.pickedAsset('hero.png')).toBeVisible();
    await contents.save();
    await contents.publish();

    // Post-check
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.image).toEqual({ kind: 'ASSET', uri: hero.id });
    expect((data.gallery as { uri: string }[]).map(it => it.uri).sort()).toEqual([one.id, two.id].sort());
    const cdn = (await new Cdn(request, api, space.id).get({ id: doc.id }, { resolveAsset: 'true' })).body;
    expect(Object.keys(cdn?.assets ?? {}).sort()).toEqual([hero.id, one.id, two.id].sort());
    expect(await api.get(`/api/app/spaces/${space.id}/assets/${hero.id}/usage`)).toEqual({ contents: 1 });
    await page.reload();
    for (const name of ['hero.png', 'one.png', 'two.png']) await expect(contents.pickedAsset(name)).toBeVisible();
  });

  // The file type set in the schema editor (stored as `fileType`) and the one templates and older schemas carry
  // (`fileTypes`) both narrow the picker; editing such a schema keeps its filter.
  test('an Asset field with a file type offers only those files in the picker', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('photo.png'));
    await api.uploadAsset(space.id, pdfFile('terms.pdf'));
    const schema = await pageSchema(api, space, [{ name: 'image', kind: 'ASSET', displayName: 'Image' }]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const schemas = new SchemasPage(page);
    const contents = new ContentsPage(page);
    const pickerRows = async () => {
      await contents.gotoDocument(space.id, doc.id);
      await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
      const picker = await dialog(page, 'Assets');
      await expect(picker.getByRole('cell').filter({ hasText: 'photo.png' })).toBeVisible();
      const names = await picker
        .getByRole('cell')
        .filter({ hasText: /\.(png|pdf)/ })
        .allInnerTexts();
      await page.keyboard.press('Escape');
      return names.map(it => (it.match(/\S+\.(png|pdf)/) ?? [])[0]);
    };

    // Pre-check: any file.
    expect(await pickerRows()).toEqual(['photo.png', 'terms.pdf']);

    // Action: Images, in the schema editor.
    await schemas.gotoEditor(space.id, schema);
    await schemas.editField('image', { fileType: 'Images' });
    await schemas.save();

    // Post-check: stored, and the picker offers the picture only.
    expect((await schemaNamed(api, space.id, schema.name))?.fields?.[0]).toMatchObject({ fileType: 'IMAGE' });
    expect(await pickerRows()).toEqual(['photo.png']);
  });

  test('a schema whose Asset field carries `fileTypes` (templates) keeps its filter when edited', async ({ page, api, space }) => {
    await api.uploadAsset(space.id, pngFile('photo.png'));
    await api.uploadAsset(space.id, pdfFile('terms.pdf'));
    const schema = await pageSchema(api, space, [{ name: 'image', kind: 'ASSET', displayName: 'Image', fileTypes: ['IMAGE'] } as never]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    const schemas = new SchemasPage(page);

    // Action: an unrelated edit, saved.
    await schemas.gotoEditor(space.id, schema);
    await schemas.editField('image', { displayName: 'Hero image' });
    await schemas.save();

    // Post-check: the filter is now stored as `fileType`, and the picker still offers the picture only.
    expect((await schemaNamed(api, space.id, schema.name))?.fields?.[0]).toMatchObject({ displayName: 'Hero image', fileType: 'IMAGE' });
    await new ContentsPage(page).gotoDocument(space.id, doc.id);
    await page.getByRole('button', { name: 'Add Asset', exact: true }).click();
    const picker = await dialog(page, 'Assets');
    await expect(picker.getByRole('cell').filter({ hasText: 'photo.png' })).toBeVisible();
    await expect(picker.getByRole('cell').filter({ hasText: 'terms.pdf' })).toHaveCount(0);
  });
});

import { ContentsPage } from '../pages/contents.page';
import type { AppApi } from '../support/app-api';
import { Cdn, contentById } from '../support/contents';
import { FIELDS, levelTitle, translated } from '../support/contents-fields';
import { expect, test } from '../support/fixtures';

// A prepared space: the "Contents (all fields)" test template — every field kind in English, German and French, files
// and documents to point to, nothing published (support/contents-fields.ts). Each test gets its own copy.
test.use({ spaceTemplate: FIELDS.template });

type Data = Record<string, unknown>;

/** The space's contents by name. */
async function contentIds(api: AppApi, spaceId: string): Promise<Record<string, string>> {
  const all = await api.everyPageOf<{ id: string; name: string }>(`/api/app/spaces/${spaceId}/contents?deep=true`);
  return Object.fromEntries(all.map(it => [it.name, it.id]));
}

/** The id of the template's `Media` asset folder. */
async function mediaId(api: AppApi, spaceId: string): Promise<string> {
  const root = await api.get<{ id: string; name: string }[]>(`/api/app/spaces/${spaceId}/assets?parentId=`);
  return root.find(it => it.name === 'Media')!.id;
}

/** Follows `child` n times from a block. */
function levelOf(data: Data, n: number): Data {
  let block = data;
  for (let i = 0; i < n; i++) block = block['child'] as Data;
  return block;
}

test.describe('Contents → a prepared space with every field kind', () => {
  test('a new space: every draft follows the rule, nothing is published', async ({ api, space, request }) => {
    const ids = await contentIds(api, space.id);
    const cdn = new Cdn(request, api, space.id);
    for (const locale of FIELDS.locales) {
      const plain = (await cdn.get({ id: ids[FIELDS.documents.plain] }, { version: 'draft', locale })).body?.data;
      expect(plain, `plain ${locale}`).toMatchObject({ ...FIELDS.plain, reference: { kind: 'REFERENCE', uri: ids['Alpha'] } });
      const own = (await cdn.get({ id: ids[FIELDS.documents.translated] }, { version: 'draft', locale })).body?.data;
      expect(own, `translated ${locale}`).toMatchObject(translated(locale));
      const nested = (await cdn.get({ id: ids[FIELDS.documents.nested] }, { version: 'draft', locale })).body?.data as Data;
      expect(levelOf(nested, 5)['title']).toBe(levelTitle(5, locale));
    }
    for (const name of Object.values(FIELDS.documents)) expect((await cdn.get({ id: ids[name] })).status, name).toBe(404);
  });

  test('plain fields are read-only in German and French, editable in English', async ({ page, api, space }) => {
    const ids = await contentIds(api, space.id);
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, ids[FIELDS.documents.plain]);

    // Pre-check: English, the default.
    await expect(contents.field('Text')).toBeEnabled();
    await expect(contents.field('Text')).toHaveValue(FIELDS.plain.text);

    for (const locale of ['German', 'French']) {
      // Action
      await contents.editorLocale(locale);
      // Post-check: the values shown, but locked, inside the block too.
      for (const label of ['Text', 'Textarea', 'Number', 'Color', 'Date', 'Datetime']) {
        await expect(contents.field(label), `${label} in ${locale}`).toBeDisabled();
      }
      await expect(contents.field('Text')).toHaveValue(FIELDS.plain.text);
      await expect(page.getByRole('switch', { name: 'Boolean' })).toBeDisabled();
      await expect(contents.field('Option'), `Option in ${locale}`).toBeDisabled();
      await contents.blocks(contents.blockField('Block')).first().click();
      await expect(contents.openBlock).toHaveText('Card (plain)');
      await expect(contents.field('Title')).toBeDisabled();
      await expect(contents.field('Title')).toHaveValue('Plain block');
      await contents.backToDocumentRoot();
    }
    await contents.editorLocale('English');
    await expect(contents.field('Text')).toBeEnabled();
  });

  test('a German change stays in German', async ({ page, api, space, request }) => {
    const ids = await contentIds(api, space.id);
    const id = ids[FIELDS.documents.translated];
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check
    const before = (await contentById(api, space.id, id)).data as Data;
    await contents.gotoDocument(space.id, id);
    await contents.editorLocale('German');
    await expect(contents.field('Text')).toHaveValue(translated('de').text);
    await expect(contents.blockField('Link').getByRole('combobox')).toHaveValue('Beta | targets/beta');

    // Action: text, number, option, the link's target and one more file, in German only.
    await contents.field('Text').fill('Geändert');
    await contents.field('Number').fill('99');
    await contents.chooseOption('Option', 'Blue');
    await contents.blockField('Link').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Gamma | targets/gamma', exact: true }).click();
    await contents.pickAssets('Add Assets', ['red.png'], 'Media');
    await contents.save();

    // Post-check: the editor after a reload, the API, the draft in each locale.
    await page.reload();
    await contents.editorLocale('German');
    await expect(contents.field('Text')).toHaveValue('Geändert');
    await expect(contents.field('Number')).toHaveValue('99');
    const data = (await contentById(api, space.id, id)).data as Data;
    expect(data).toMatchObject({ text_i18n_de: 'Geändert', number_i18n_de: 99, option_i18n_de: 'blue' });
    expect(data['link_i18n_de']).toMatchObject({ kind: 'LINK', type: 'content', uri: ids['Gamma'] });
    const files = await api.get<{ id: string; name: string }[]>(
      `/api/app/spaces/${space.id}/assets?parentId=${await mediaId(api, space.id)}`,
    );
    const fileId = (name: string) => files.find(it => it.name === name)!.id;
    expect((data['assets_i18n_de'] as { uri: string }[]).map(it => it.uri)).toEqual([fileId('blue'), fileId('red')]);
    // English and French keep their link and files.
    for (const key of ['link', 'link_i18n_fr', 'assets', 'assets_i18n_fr']) expect(data[key], key).toEqual(before[key]);
    expect(data).toMatchObject({ text: translated('en').text, text_i18n_fr: translated('fr').text, number: 10, number_i18n_fr: 30 });
    expect((await cdn.get({ id }, { version: 'draft', locale: 'de' })).body?.data).toMatchObject({
      text: 'Geändert',
      number: 99,
      option: 'blue',
    });
    for (const locale of ['en', 'fr'] as const) {
      expect((await cdn.get({ id }, { version: 'draft', locale })).body?.data, locale).toMatchObject(translated(locale));
    }
  });

  test('edits the fifth nested level', async ({ page, api, space, request }) => {
    const ids = await contentIds(api, space.id);
    const id = ids[FIELDS.documents.nested];
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check: down to level 5, in German.
    await contents.gotoDocument(space.id, id);
    await contents.editorLocale('German');
    for (let n = 1; n <= 5; n++) {
      await contents.blocks(contents.blockField('Child')).first().click();
      await expect(contents.openBlock).toHaveText(`Level ${n}`);
    }
    await expect(contents.field('Title')).toHaveValue(levelTitle(5, 'de'));

    // Action
    await contents.field('Title').fill('Ebene 5');
    await contents.save();

    // Post-check: the API and the German draft at the end of the path; the other levels and locales unchanged.
    const data = (await contentById(api, space.id, id)).data as Data;
    expect(levelOf(data, 5)['title_i18n_de']).toBe('Ebene 5');
    expect(levelOf(data, 4)['title_i18n_de']).toBe(levelTitle(4, 'de'));
    const de = (await cdn.get({ id }, { version: 'draft', locale: 'de' })).body?.data as Data;
    expect(levelOf(de, 5)['title']).toBe('Ebene 5');
    const en = (await cdn.get({ id }, { version: 'draft', locale: 'en' })).body?.data as Data;
    expect(levelOf(en, 5)['title']).toBe(levelTitle(5, 'en'));
  });

  test('publish, then unpublish', async ({ page, api, space, request }) => {
    const ids = await contentIds(api, space.id);
    const id = ids[FIELDS.documents.translated];
    const cdn = new Cdn(request, api, space.id);
    const contents = new ContentsPage(page);

    // Pre-check: not published.
    expect((await cdn.get({ id })).status).toBe(404);

    // Action: Publish in the editor.
    await contents.gotoDocument(space.id, id);
    await contents.publish();

    // Post-check: the published version equals the draft in every locale; listed in the published /links.
    for (const locale of FIELDS.locales) {
      expect((await cdn.get({ id }, { locale })).body?.data, locale).toMatchObject(translated(locale));
    }
    expect(Object.keys(await cdn.links())).toContain(id);

    // Action: Unpublish from the list.
    await contents.goto(space.id);
    await contents.openFolder('Fields');
    await contents.unpublishRow(FIELDS.documents.translated, 'Document');

    // Post-check: no published version, gone from the published /links; the draft stays.
    await expect.poll(async () => (await cdn.get({ id })).status).toBe(404);
    expect(Object.keys(await cdn.links())).not.toContain(id);
    expect((await cdn.get({ id }, { version: 'draft', locale: 'de' })).body?.data).toMatchObject(translated('de'));
  });

  test('creates a document with every field filled', async ({ page, api, space, request }) => {
    const contents = new ContentsPage(page);
    const cdn = new Cdn(request, api, space.id);

    // Pre-check
    await contents.goto(space.id);
    await contents.openFolder('Fields');
    await expect(contents.row('Fresh')).toHaveCount(0);

    // Action: a new document of the plain schema, every field filled.
    await contents.addDocument('Fresh', 'fresh', 'fieldsplain');
    await contents.row('Fresh').click();
    await contents.field('Text').fill('Fresh text');
    await contents.field('Textarea').fill('Fresh textarea');
    await contents.richText('Rich Text').click();
    await page.keyboard.type('Fresh rich text');
    await contents.field('Markdown').fill('# Fresh');
    await contents.field('Number').fill('5');
    await contents.field('Color').fill('#123456');
    await contents.field('Date').fill('2026-05-05');
    await contents.field('Datetime').fill('2026-05-05T10:15');
    await page.getByRole('switch', { name: 'Boolean' }).click();
    await contents.chooseOption('Option', 'Red');
    await contents.chooseOptions('Options', ['Green', 'Blue']);
    await contents.blockField('Link').getByRole('textbox').fill('https://example.com/fresh');
    await contents.pickDocuments('Add Reference', ['Alpha'], 'Targets');
    await contents.pickDocuments('Add References', ['Beta', 'Gamma'], 'Targets');
    // The image-only field's picker hides the text file; the other offers all three.
    const imagesOnly = await contents.openAssetPicker('Add Asset', 'Media');
    await expect(imagesOnly.row('red.png')).toBeVisible();
    await expect(imagesOnly.row('blue.jpg')).toBeVisible();
    await expect(imagesOnly.row('readme.txt')).toHaveCount(0);
    await imagesOnly.picker.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(imagesOnly.picker).toBeHidden();
    const anyFile = await contents.openAssetPicker('Add Assets', 'Media');
    await expect(anyFile.row('readme.txt')).toBeVisible();
    await anyFile.picker.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(anyFile.picker).toBeHidden();
    await contents.pickAssets('Add Asset', ['blue.jpg'], 'Media');
    await contents.pickAssets('Add Assets', ['red.png', 'readme.txt'], 'Media');
    const block = contents.blockField('Block');
    await block.getByRole('button', { name: 'Add Schema', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Card (plain)' }).click();
    await contents.blocks(block).first().click();
    await contents.field('Title').fill('Fresh block');
    await contents.backToDocumentRoot();
    const blocks = contents.blockField('Blocks');
    await blocks.getByRole('button', { name: 'Add Schema at the end' }).click();
    await page.getByRole('menuitem', { name: 'Card (plain)' }).click();
    await contents.blocks(blocks).first().click();
    await contents.field('Title').fill('Fresh blocks 1');
    await contents.backToDocumentRoot();
    await contents.save();

    // Post-check: the API, the draft, and the editor after a reload.
    const ids = await contentIds(api, space.id);
    const expected = {
      text: 'Fresh text',
      textarea: 'Fresh textarea',
      markdown: '# Fresh',
      number: 5,
      color: '#123456',
      date: '2026-05-05',
      datetime: '2026-05-05T10:15',
      boolean: true,
      option: 'red',
      options: ['green', 'blue'],
      link: { kind: 'LINK', type: 'url', uri: 'https://example.com/fresh' },
      reference: { kind: 'REFERENCE', uri: ids['Alpha'] },
      references: [
        { kind: 'REFERENCE', uri: ids['Beta'] },
        { kind: 'REFERENCE', uri: ids['Gamma'] },
      ],
      block: { _schema: 'cardplain', title: 'Fresh block' },
      blocks: [{ _schema: 'cardplain', title: 'Fresh blocks 1' }],
    };
    const data = (await contentById(api, space.id, ids['Fresh'])).data as Data;
    expect(data).toMatchObject(expected);
    expect(data['richtext']).toMatchObject({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fresh rich text' }] }],
    });
    expect((data['asset'] as { kind: string }).kind).toBe('ASSET');
    expect(data['assets']).toHaveLength(2);
    expect((await cdn.get({ id: ids['Fresh'] }, { version: 'draft' })).body?.data).toMatchObject(expected);
    await page.reload();
    await expect(contents.field('Text')).toHaveValue('Fresh text');
    await expect(contents.pickedAsset('blue.jpg')).toBeVisible();
    await expect(contents.pickedDocument('Alpha')).toBeVisible();
  });
});

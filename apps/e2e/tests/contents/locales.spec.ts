import { dialog } from '../pages/dialogs';
import { ContentsPage } from '../pages/contents.page';
import { expectToast } from '../pages/notifications';
import { Cdn, contentById, pageSchema } from '../support/contents';
import { expect, test, uniqueId } from '../support/fixtures';
import { stubTranslation, withThreeLocales } from '../support/translations';

// Space: English (default), German, Romanian. A translatable field has a value per locale (`name_i18n_<locale>`), a
// shared one has one value. Post-check: what is stored, and the CDN API per locale.
test.describe('Contents → locales', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('translatable fields per locale, shared fields once; the CDN falls back to English @smoke', async ({
    page,
    api,
    space,
    request,
  }) => {
    const schema = await pageSchema(api, space, [
      { name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true },
      { name: 'subtitle', kind: 'TEXT', displayName: 'Subtitle', translatable: true },
      { name: 'sku', kind: 'TEXT', displayName: 'SKU' },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Product', slug: 'product', schema: schema.name });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);

    // Action: English, then German and Romanian titles; the shared field is read-only outside English.
    await contents.field('Title').fill('Hello');
    await contents.field('Subtitle').fill('Only in English');
    await contents.field('SKU').fill('SKU-1');
    await contents.editorLocale('German');
    await expect(contents.field('SKU')).toBeDisabled();
    await expect(contents.field('Title')).toHaveAttribute('placeholder', 'Hello');
    await contents.field('Title').fill('Hallo');
    await contents.editorLocale('Romanian');
    await contents.field('Title').fill('Bună');
    await contents.save();
    await contents.publish();

    // Post-check: storage.
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({
      title: 'Hello',
      title_i18n_de: 'Hallo',
      title_i18n_ro: 'Bună',
      subtitle: 'Only in English',
      sku: 'SKU-1',
    });
    // The CDN per locale: own value, English fallback, the shared value everywhere.
    const cdn = new Cdn(request, api, space.id);
    expect((await cdn.get({ id: doc.id }, { locale: 'de' })).body).toMatchObject({
      locale: 'de',
      data: { title: 'Hallo', subtitle: 'Only in English', sku: 'SKU-1' },
    });
    expect((await cdn.get({ id: doc.id }, { locale: 'ro' })).body?.data).toMatchObject({ title: 'Bună', sku: 'SKU-1' });
    expect((await cdn.get({ id: doc.id })).body?.data).toMatchObject({ title: 'Hello' });

    // Post-check: the editor after a reload, per locale.
    await page.reload();
    await expect(contents.field('Title')).toHaveValue('Hello');
    await expect(contents.field('SKU')).toHaveValue('SKU-1');
    await contents.editorLocale('German');
    await expect(contents.field('Title')).toHaveValue('Hallo');
    await expect(contents.field('Subtitle')).toHaveValue('');
    await expect(contents.field('Subtitle')).toHaveAttribute('placeholder', 'Only in English');
    await contents.editorLocale('Romanian');
    await expect(contents.field('Title')).toHaveValue('Bună');
  });

  test("translates one field from the field's menu", async ({ page, api, space }) => {
    const schema = await pageSchema(api, space, [{ name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true }]);
    const doc = await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'Welcome' });
    const contents = new ContentsPage(page);

    // Pre-check: German is empty.
    await contents.gotoDocument(space.id, doc.id);
    await contents.editorLocale('German');
    await expect(contents.field('Title')).toHaveValue('');

    // Action
    await page.getByRole('button', { name: 'Translate the field' }).click();
    await page.getByRole('menuitem', { name: /Translate from English/ }).click();
    await expectToast(page, 'Translated');

    // Post-check: filled, stored only on Save.
    await expect(contents.field('Title')).toHaveValue(stubTranslation('Welcome', 'en', 'de'));
    expect((await contentById(api, space.id, doc.id)).data).not.toHaveProperty('title_i18n_de');
    await contents.save();
    expect((await contentById(api, space.id, doc.id)).data).toMatchObject({
      title_i18n_de: stubTranslation('Welcome', 'en', 'de'),
    });
    await page.reload();
    await contents.editorLocale('German');
    await expect(contents.field('Title')).toHaveValue(stubTranslation('Welcome', 'en', 'de'));
  });

  test('"Translate Locale" translates the whole document, fields inside blocks too', async ({ page, api, space }) => {
    const card = uniqueId('Card');
    await api.createSchema(space.id, {
      name: card,
      type: 'NODE',
      displayName: 'Card',
      fields: [{ name: 'heading', kind: 'TEXT', displayName: 'Heading', translatable: true }],
    });
    const schema = await pageSchema(api, space, [
      { name: 'title', kind: 'TEXT', displayName: 'Title', translatable: true },
      { name: 'cards', kind: 'SCHEMAS', displayName: 'Cards', schemas: [card] },
    ]);
    const doc = await api.createDocument(space.id, { name: 'Landing', slug: 'landing', schema: schema.name });
    await api.saveDocumentData(space.id, doc, {
      title: 'Landing',
      cards: [{ _id: 'card-1', _schema: card, heading: 'First card' }],
    });
    const contents = new ContentsPage(page);

    // Pre-check
    await contents.gotoDocument(space.id, doc.id);
    await contents.editorLocale('Romanian');

    // Action
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Translate Locale' }).click();
    const form = await dialog(page, 'Translate Locale');
    await expect(form.getByLabel('Target Locale')).toContainText('Romanian');
    await form.getByRole('button', { name: 'Translate' }).click();
    await expectToast(page, 'Translated 2 fields. Review them and press Save.');
    await contents.save();

    // Post-check: the title and the block's heading in Romanian.
    const data = (await contentById(api, space.id, doc.id)).data!;
    expect(data.title_i18n_ro).toBe(stubTranslation('Landing', 'en', 'ro'));
    expect((data.cards as Record<string, unknown>[])[0]).toMatchObject({
      heading_i18n_ro: stubTranslation('First card', 'en', 'ro'),
    });
    await page.reload();
    await contents.editorLocale('Romanian');
    await expect(contents.field('Title')).toHaveValue(stubTranslation('Landing', 'en', 'ro'));
    await contents.blocks(contents.blockField('Cards')).first().click();
    await expect(contents.field('Heading')).toHaveValue(stubTranslation('First card', 'en', 'ro'));
  });
});

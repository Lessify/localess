import { pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';

test.describe('Space dashboard', () => {
  test('counts what is in the space @smoke', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'key.a', locales: { en: 'A', de: 'A' } });
    await api.createTranslation(space.id, { key: 'key.b', locales: { en: 'B' } });
    const schema = await api.createSchema(space.id, { name: uniqueId('page'), type: 'ROOT' });
    await api.createDocument(space.id, { name: 'Home', slug: 'home', schema: schema.name });
    await api.createFolder(space.id, { name: 'Folder', slug: 'folder' });
    await api.uploadAsset(space.id, pngFile());

    await page.goto(`/features/spaces/${space.id}/dashboard`);
    const card = (title: string) =>
      page
        .locator('[hlmCard]')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
        .first();
    await expect(card('Locales')).toContainText('2');
    await expect(card('Translation Keys')).toContainText('2');
    await expect(card('Content Documents')).toContainText('1');
    await expect(card('Schemas')).toContainText('1');
    await expect(card('Asset Files')).toContainText('1');
    // Progress per locale: German has one of the two keys.
    await expect(card('German')).toContainText('1 of 2');
  });
});

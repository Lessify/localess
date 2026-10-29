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
    // The number in a card, exactly ("2", not "12"). Asset Files is twice: the count, then the storage.
    const card = (title: string) =>
      page
        .locator('[hlmCard]')
        .filter({ has: page.getByRole('heading', { name: title, exact: true }) })
        .first()
        .locator('[hlmCardContent]');
    await expect(card('Locales')).toHaveText(/^\s*2\s*$/);
    await expect(card('Translation Keys')).toHaveText(/^\s*2\s*$/);
    await expect(card('Content Documents')).toHaveText(/^\s*1\s*$/);
    await expect(card('Schemas')).toHaveText(/^\s*1\s*$/);
    await expect(card('Asset Files')).toHaveText(/^\s*1\s*$/);
    // Progress per locale: German has one of the two keys.
    await expect(card('German')).toHaveText(/^\s*50% - 1 of 2\s*$/);
  });
});

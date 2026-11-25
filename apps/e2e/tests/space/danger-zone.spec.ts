import { confirmDialog, expectToast } from '../pages/notifications';
import { TranslationsPage } from '../pages/translations.page';
import { contentsIn } from '../support/contents';
import { expect, test } from '../support/fixtures';
import { translationsByKey } from '../support/translations';

test.describe('Space settings → Danger Zone', () => {
  test('deletes every translation; the published ones stay until the next publish, contents stay', async ({
    page,
    api,
    space,
    request,
  }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    await api.createTranslation(space.id, { key: 'farewell', locales: { en: 'Bye' } });
    await api.publishTranslations(space.id);
    await api.createFolder(space.id, { name: 'Pages', slug: 'pages' });
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const cdn = async () => (await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`)).json();
    expect((await translationsByKey(api, space.id)).size).toBe(2);
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await expect(translations.item('greeting')).toBeVisible();
    await page.goto(`/features/spaces/${space.id}/settings/danger-zone`);

    await page.getByRole('button', { name: 'Delete All Translations' }).click();
    await confirmDialog(page, 'Delete All Translations');

    await expectToast(page, 'All translations have been deleted.');
    expect((await translationsByKey(api, space.id)).size).toBe(0);
    expect(await contentsIn(api, space.id)).toHaveLength(1);
    expect(await cdn()).toEqual({ greeting: 'Hello', farewell: 'Bye' });
    await translations.goto(space.id);
    await expect(translations.item('greeting')).toHaveCount(0);
    await expect(translations.item('farewell')).toHaveCount(0);

    await api.publishTranslations(space.id);
    expect(await cdn()).toEqual({});
  });
});

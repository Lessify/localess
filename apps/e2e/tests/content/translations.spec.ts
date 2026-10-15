import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';

test.describe('Translations', () => {
  test('adds a translation, publishes it and serves it from the CDN API @smoke', async ({ page, api, space, request }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    await translations.add({ key: 'home.title', value: 'Welcome home', description: 'Hero title' });
    await expect(translations.item('home.title')).toContainText('Welcome home');

    await translations.publish();
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
    const cdn = await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    expect(await cdn.json()).toEqual({ 'home.title': 'Welcome home' });
  });

  test('edits the value of a second locale', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'cta.buy', locales: { en: 'Buy' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    await translations.select('cta.buy');
    await translations.selectTargetLocale('German');
    await translations.saveValue('Kaufen');

    const saved = await api.get<{ key: string; locales: Record<string, string> }[]>(`/api/app/spaces/${space.id}/translations`);
    expect(saved.find(it => it.key === 'cta.buy')?.locales).toEqual({ en: 'Buy', de: 'Kaufen' });
  });

  test('renames a key and deletes a translation', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'old.key', locales: { en: 'Value' } });
    await api.createTranslation(space.id, { key: 'other.key', locales: { en: 'Other' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    await translations.select('old.key');
    await translations.renameKey('new.key');
    await expect(translations.item('new.key')).toBeVisible();
    await expect(translations.item('old.key')).toHaveCount(0);

    await translations.select('new.key');
    await translations.deleteSelected();
    await expect(translations.item('new.key')).toHaveCount(0);
    await page.reload();
    await expect(translations.item('other.key')).toBeVisible();
    await expect(translations.item('new.key')).toHaveCount(0);
  });

  test('searches by key and by value', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'nav.home', locales: { en: 'Home' } });
    await api.createTranslation(space.id, { key: 'nav.about', locales: { en: 'About us' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await expect(translations.item('nav.home')).toBeVisible();

    await translations.search('about');
    await expect(translations.item('nav.about')).toBeVisible();
    await expect(translations.item('nav.home')).toHaveCount(0);

    await translations.search('Home');
    await expect(translations.item('nav.home')).toBeVisible();
    await expect(translations.item('nav.about')).toHaveCount(0);
  });

  test('shows a translation added elsewhere without a reload (live updates)', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'first', locales: { en: 'First' } });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await expect(translations.item('first')).toBeVisible();

    await api.createTranslation(space.id, { key: 'from.elsewhere', locales: { en: 'Pushed by a colleague' } });
    await expect(translations.item('from.elsewhere')).toBeVisible();
  });
});

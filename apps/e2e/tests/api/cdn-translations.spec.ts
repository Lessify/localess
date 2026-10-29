import { expect, test, uniqueName } from '../support/fixtures';

// The CDN API is public (a token in the URL): `request` has no session cookie here, so a refusal can't be hidden by the
// admin's session. Test data goes through `api`, which has its own.
test.use({ storageState: { cookies: [], origins: [] } });

const cdn = (spaceId: string, locale: string) => `/api/v1/spaces/${spaceId}/translations/${locale}`;

test.describe('CDN API → translations', () => {
  test('serves published translations to a public token, with the default locale as fallback @smoke', async ({ api, space, request }) => {
    await api.addLocale(space.id, 'de');
    await api.createTranslation(space.id, { key: 'home.title', locales: { en: 'Hello', de: 'Hallo' } });
    await api.createTranslation(space.id, { key: 'home.subtitle', locales: { en: 'Only English' } });
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });

    // Nothing is delivered before the first publish.
    expect((await request.get(`${cdn(space.id, 'en')}?token=${token}`)).status()).toBe(404);

    await api.publishTranslations(space.id);
    const en = await request.get(`${cdn(space.id, 'en')}?token=${token}`);
    expect(en.status()).toBe(200);
    expect(await en.json()).toEqual({ 'home.title': 'Hello', 'home.subtitle': 'Only English' });

    const de = await request.get(`${cdn(space.id, 'de')}?token=${token}`);
    expect(await de.json()).toEqual({ 'home.title': 'Hallo', 'home.subtitle': 'Only English' });
  });

  test('shows a change only after publishing; the draft needs a preview token', async ({ api, space, request }) => {
    const translation = await api.createTranslation(space.id, { key: 'cta', locales: { en: 'Buy' } });
    await api.publishTranslations(space.id);
    const pub = (await api.createToken(space.id, { name: 'Public', type: 'public' })).token;
    const prv = (await api.createToken(space.id, { name: 'Preview', type: 'preview' })).token;

    await api.send('put', `/api/app/spaces/${space.id}/translations/${translation.id}/locales/en`, { value: 'Buy now' });

    expect(await (await request.get(`${cdn(space.id, 'en')}?token=${pub}`)).json()).toEqual({ cta: 'Buy' });
    expect((await request.get(`${cdn(space.id, 'en')}?token=${pub}&version=draft`)).status()).toBe(403);
    expect(await (await request.get(`${cdn(space.id, 'en')}?token=${prv}&version=draft`)).json()).toEqual({
      cta: 'Buy now',
    });

    await api.publishTranslations(space.id);
    expect(await (await request.get(`${cdn(space.id, 'en')}?token=${pub}`)).json()).toEqual({ cta: 'Buy now' });
  });

  test('refuses a missing, wrong or management token', async ({ api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    const mgt = (await api.createToken(space.id, { name: 'Mgmt', type: 'management' })).token;

    expect((await request.get(cdn(space.id, 'en'))).status()).toBe(401);
    expect((await request.get(`${cdn(space.id, 'en')}?token=pub_not-a-token`)).status()).toBe(401);
    expect((await request.get(`${cdn(space.id, 'en')}?token=${mgt}`)).status()).toBe(401);
  });

  test('a token of one space does not open another space', async ({ api, space, request }) => {
    const other = await api.createSpace(uniqueName('E2E other'));
    try {
      await api.createTranslation(other.id, { key: 'k1', locales: { en: 'v' } });
      await api.publishTranslations(other.id);
      const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });
      expect((await request.get(`${cdn(other.id, 'en')}?token=${token}`)).status()).toBe(401);
    } finally {
      await api.deleteSpace(other.id);
    }
  });
});

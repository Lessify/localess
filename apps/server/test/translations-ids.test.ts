import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/** Every translation route checks its space first, then the translation; ids that aren't UUIDs are 404s. */
describe('app API: translations check their space and ids', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let base: string;
  let otherBase: string;
  let translationId: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    base = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'One' })).json().id}/translations`;
    otherBase = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'Two' })).json().id}/translations`;
    translationId = (await admin.post(base, { key: 'hello', locales: { en: 'Hello' } })).json().id;
  });

  afterAll(() => t?.close());

  /** Every route of a space's translations, for `spaces` and `translationId`. */
  const routes = (spaceBase: string, id: string) => [
    () => admin.get(spaceBase),
    () => admin.get(`${spaceBase}/count`),
    () => admin.get(`${spaceBase}/${id}`),
    () => admin.post(spaceBase, { key: 'other', locales: { en: 'Other' } }),
    () => admin.patch(`${spaceBase}/${id}`, { description: 'x' }),
    () => admin.put(`${spaceBase}/${id}/locales/en`, { value: 'Hi' }),
    () => admin.put(`${spaceBase}/${id}/key`, { key: 'renamed' }),
    () => admin.post(`${spaceBase}/publish`),
    () => admin.post(`${spaceBase}/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'en' }),
    () => admin.delete(`${spaceBase}/${id}`),
    () => admin.delete(spaceBase),
  ];

  it('answers "Space not found" on every route of an unknown space, the list and count included', async () => {
    for (const route of routes(`/api/app/spaces/${newUuid()}/translations`, translationId)) {
      const response = await route();
      expect(response.statusCode, response.body).toBe(404);
      expect(response.json().message).toBe('Space not found');
    }
  });

  it('answers 404 for a space or translation id that is not a UUID (never a 500)', async () => {
    for (const route of routes('/api/app/spaces/not-a-uuid/translations', translationId)) {
      expect((await route()).statusCode).toBe(404);
    }
    for (const response of [
      await admin.get(`${base}/not-a-uuid`),
      await admin.patch(`${base}/not-a-uuid`, { description: 'x' }),
      await admin.put(`${base}/not-a-uuid/locales/en`, { value: 'Hi' }),
      await admin.delete(`${base}/not-a-uuid`),
    ]) {
      expect(response.statusCode).toBe(404);
    }
  });

  it('answers "Translation not found" for a translation of another space, and changes nothing', async () => {
    for (const response of [
      await admin.get(`${otherBase}/${translationId}`),
      await admin.patch(`${otherBase}/${translationId}`, { description: 'x' }),
      await admin.put(`${otherBase}/${translationId}/locales/en`, { value: 'Hi' }),
      await admin.put(`${otherBase}/${translationId}/key`, { key: 'renamed' }),
      await admin.delete(`${otherBase}/${translationId}`),
    ]) {
      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe('Translation not found');
    }
    expect((await admin.get(`${base}/${translationId}`)).json()).toMatchObject({ key: 'hello', locales: { en: 'Hello' } });
  });

  it('refuses an unknown field on every body, naming it, and changes nothing', async () => {
    for (const [call, field] of [
      [() => admin.post(base, { key: 'typo', locales: { en: 'x' }, label: ['a'] }), 'label'],
      [() => admin.patch(`${base}/${translationId}`, { label: ['a'] }), 'label'],
      [() => admin.put(`${base}/${translationId}/locales/en`, { value: 'Hi', locale: 'en' }), 'locale'],
      [() => admin.put(`${base}/${translationId}/key`, { key: 'renamed', id: 'x' }), 'id'],
      [() => admin.post(`${base}/translate-locale`, { sourceLocaleId: 'en', targetLocaleId: 'en', overWrite: true }), 'overWrite'],
      [() => admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'Hi', html: true }), 'html'],
      [
        () => admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', items: [{ id: 'a', content: 'Hi', path: 'x' }] }),
        'path',
      ],
    ] as const) {
      const response = await call();
      expect(response.statusCode, field).toBe(400);
      expect(response.body, field).toContain(field);
    }
    // Both forms of a translate request at once is no form.
    expect((await admin.post('/api/app/translate', { sourceLocale: 'en', targetLocale: 'de', content: 'Hi', items: [] })).statusCode).toBe(
      400,
    );
    expect((await admin.get(`${base}/${translationId}`)).json()).toMatchObject({ key: 'hello', locales: { en: 'Hello' } });
    expect((await admin.get(base)).json().map((it: { key: string }) => it.key)).toEqual(['hello']);
  });
});

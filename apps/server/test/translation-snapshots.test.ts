import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { translations, translationSnapshots } from '../src/infra/database/schema.js';
import { SpacesService } from '../src/modules/spaces/services/spaces.service.js';
import { lockTranslations } from '../src/shared/data-rules/translation-drafts.js';
import { TranslationsService } from '../src/modules/translations/services/translations.service.js';
import { seedSpace, seedTranslations, TOKEN_DEV, TOKEN_DRAFT, TOKEN_V1 } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';
import { S1 } from './ids.js';

/**
 * The maps the public API serves per stage and locale (`translation_snapshots`): each answers to its own `cv`, its
 * `built_at`, so an edit never moves the published `cv` and a publish never moves the draft one.
 */
describe('translation snapshots', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedTranslations(t);
  });

  afterAll(() => t?.close());

  const get = (url: string) => t.request({ method: 'GET', url });
  const draftUrl = (locale: string) => `/api/v1/spaces/${S1}/translations/${locale}?version=draft&token=${TOKEN_DRAFT}`;
  const publishedUrl = (locale: string) => `/api/v1/spaces/${S1}/translations/${locale}?token=${TOKEN_V1}`;
  /** The `cv` the redirect names. */
  const cvOf = async (url: string): Promise<string> => {
    const response = await get(url);
    expect(response.statusCode).toBe(302);
    return new URL(response.headers.location as string, 'https://cms.example.com').searchParams.get('cv')!;
  };
  /** The map at the URL the redirect names. */
  const follow = async (url: string) => {
    const cv = await cvOf(url);
    const response = await get(`${url}&cv=${cv}`);
    expect(response.statusCode).toBe(200);
    return response.json();
  };
  const snapshots = (version: 'draft' | 'published') =>
    t.db
      .select()
      .from(translationSnapshots)
      .where(and(eq(translationSnapshots.spaceId, S1), eq(translationSnapshots.version, version)));
  const push = (values: Record<string, string>, locale = 'de') =>
    t.request({
      method: 'POST',
      url: `/api/v1/spaces/${S1}/translations/${locale}`,
      payload: { type: 'update-existing', values },
      headers: { 'x-api-key': TOKEN_DEV },
    });

  it('builds the draft of every locale at once, all answering to the same cv', async () => {
    expect(await snapshots('draft')).toEqual([]);
    const cv = await cvOf(draftUrl('de'));
    const rows = await snapshots('draft');
    expect(rows.map(it => it.locale).sort()).toEqual(['de', 'en']);
    expect(new Set(rows.map(it => it.builtAt.getTime()))).toEqual(new Set([Number(cv)]));
    expect(await follow(draftUrl('en'))).toEqual({ farewell: 'Bye', greeting: 'Hello', 'new.key': 'New (draft only)' });
  });

  it('answers a stale cv with a redirect to the current one', async () => {
    const cv = await cvOf(draftUrl('de'));
    const stale = await get(`${draftUrl('de')}&cv=1`);
    expect(stale.statusCode).toBe(302);
    expect(stale.headers.location).toContain(`cv=${cv}`);
  });

  it('moves the draft cv on an edit, and leaves the published cv alone', async () => {
    const draft = await cvOf(draftUrl('de'));
    const published = await cvOf(publishedUrl('de'));
    expect((await push({ greeting: 'Servus' })).statusCode).toBe(200);
    expect(await snapshots('draft')).toEqual([]);
    expect(await cvOf(draftUrl('de'))).not.toBe(draft);
    expect(await cvOf(publishedUrl('de'))).toBe(published);
    expect((await follow(draftUrl('de'))).greeting).toBe('Servus');
    expect((await follow(publishedUrl('de'))).greeting).toBe('Hallo');
  });

  it('moves the published cv on a publish, and leaves the draft cv alone', async () => {
    const draft = await cvOf(draftUrl('de'));
    const published = await cvOf(publishedUrl('de'));
    await t.app.get(TranslationsService).publish(S1);
    const rows = await snapshots('published');
    expect(rows.map(it => it.locale).sort()).toEqual(['de', 'en']);
    expect(new Set(rows.map(it => it.builtAt.getTime())).size).toBe(1);
    expect(await cvOf(publishedUrl('de'))).not.toBe(published);
    expect(await cvOf(draftUrl('de'))).toBe(draft);
    const map = await follow(publishedUrl('de'));
    expect(map.greeting).toBe('Servus');
    // Keys in byte order, as stored (json keeps them; jsonb would sort them by length).
    expect(Object.keys(map)).toEqual(['farewell', 'greeting', 'new.key']);
  });

  it('rebuilds the draft when a locale is added, and serves the published default locale until the next publish', async () => {
    const draft = await cvOf(draftUrl('fr'));
    const publishedEn = await cvOf(publishedUrl('en'));
    await t.app.get(SpacesService).addLocale(S1, 'fr');
    expect(await cvOf(draftUrl('fr'))).not.toBe(draft);
    expect((await snapshots('draft')).map(it => it.locale).sort()).toEqual(['de', 'en', 'fr']);
    expect(await follow(draftUrl('fr'))).toEqual({ farewell: 'Bye', greeting: 'Hello', 'new.key': 'New (draft only)' });
    expect(await cvOf(publishedUrl('fr'))).toBe(publishedEn);
  });

  it('rebuilds the draft when the default locale changes', async () => {
    const draft = await cvOf(draftUrl('fr'));
    await t.app.get(SpacesService).setDefaultLocale(S1, 'de');
    expect(await cvOf(draftUrl('fr'))).not.toBe(draft);
    expect((await follow(draftUrl('fr'))).greeting).toBe('Servus');
    await t.app.get(SpacesService).setDefaultLocale(S1, 'en');
  });

  it('drops both snapshots of a removed locale', async () => {
    await t.app.get(TranslationsService).publish(S1);
    await cvOf(draftUrl('fr'));
    await t.app.get(SpacesService).removeLocale(S1, 'fr');
    expect((await snapshots('published')).map(it => it.locale).sort()).toEqual(['de', 'en']);
    expect((await snapshots('draft')).map(it => it.locale)).not.toContain('fr');
  });

  it('keeps only the space locales on publish', async () => {
    await t.db.insert(translationSnapshots).values({ spaceId: S1, version: 'published', locale: 'it', data: {}, builtAt: new Date(5) });
    await t.app.get(TranslationsService).publish(S1);
    expect((await snapshots('published')).map(it => it.locale).sort()).toEqual(['de', 'en']);
  });

  it('builds a draft only after an edit holding the translations lock has committed', async () => {
    // An earlier edit dropped the drafts: the next draft request has to build them.
    await t.db.delete(translationSnapshots).where(and(eq(translationSnapshots.spaceId, S1), eq(translationSnapshots.version, 'draft')));
    let served: Promise<unknown> | undefined;
    let settled = false;
    await t.db.transaction(async tx => {
      await lockTranslations(tx, S1);
      served = follow(draftUrl('de')).finally(() => (settled = true));
      await tx
        .update(translations)
        .set({ locales: { en: 'Hello', de: 'Grüß Gott' } })
        .where(and(eq(translations.spaceId, S1), eq(translations.key, 'greeting')));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(settled).toBe(false);
    });
    expect(((await served) as Record<string, string>).greeting).toBe('Grüß Gott');
  });
});

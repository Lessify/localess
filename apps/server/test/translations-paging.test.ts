import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

type Listed = { items: { key: string }[]; page: number; size: number; total: number };
type Nodes = { items: { name: string; path: string; children: number; translation?: { key: string } }[]; total: number };

/** A space with English and German: each key's values decide its status. */
const KEYS: { key: string; locales: Record<string, string>; labels?: string[] }[] = [
  { key: 'home', locales: { en: 'Home' } },
  { key: 'home.hero.title', locales: { en: 'Welcome', de: 'Willkommen' } },
  { key: 'home.hero.subtitle', locales: { en: 'Start here' } },
  { key: 'home.cta', locales: { en: 'Sign up', de: 'Registrieren' }, labels: ['cta'] },
  { key: 'checkout.title', locales: { en: 'Checkout', de: ' ' } },
  { key: 'checkout.payment.title', locales: {} },
  { key: 'checkout.payment.card', locales: { de: 'Kartennummer' }, labels: ['cta', 'form'] },
  { key: 'Zebra', locales: { en: 'Z' } },
];

describe('app API: translations, one page or one tree level at a time', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let base: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    const spaceId = (await admin.post('/api/app/spaces', { name: 'Tree' })).json().id;
    expect((await admin.post(`/api/app/spaces/${spaceId}/locales`, { localeId: 'de' })).statusCode).toBe(201);
    base = `/api/app/spaces/${spaceId}/translations`;
    for (const it of KEYS) expect((await admin.post(base, it)).statusCode, it.key).toBe(201);
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await admin.get(`${base}${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const keys = async (query = '') => (await list(query)).items.map(it => it.key);
  const nodes = async (query = ''): Promise<Nodes> => {
    const response = await admin.get(`${base}/nodes${query}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const level = async (query = '') => (await nodes(query)).items.map(it => `${it.name}${it.translation ? '*' : ''}:${it.children}`);

  describe('the list', () => {
    it('pages by key, with the total', async () => {
      expect(await list('?size=3')).toMatchObject({ page: 0, size: 3, total: 8 });
      const all: string[] = [];
      for (let page = 0; page < 3; page++) all.push(...(await keys(`?size=3&page=${page}`)));
      expect(all).toHaveLength(8);
      expect(new Set(all).size).toBe(8);
    });

    it('searches the key, or the value in the locale shown', async () => {
      expect(await keys('?search=TITLE')).toEqual(['checkout.payment.title', 'checkout.title', 'home.hero.subtitle', 'home.hero.title']);
      expect(await keys('?search=willkommen')).toEqual([]);
      expect(await keys('?search=willkommen&locale=de')).toEqual(['home.hero.title']);
      expect(await keys('?search=%25')).toEqual([]);
    });

    it('finds one key exactly (the add and rename check)', async () => {
      expect(await list('?key=home.cta&size=1')).toMatchObject({ total: 1 });
      expect(await list('?key=home.ct&size=1')).toMatchObject({ total: 0 });
      expect(await list('?key=HOME.Cta&size=1')).toMatchObject({ total: 1 });
    });

    it('filters by labels (any of them)', async () => {
      expect(await keys('?label=form')).toEqual(['checkout.payment.card']);
      expect(await keys('?label=cta&label=form')).toEqual(['checkout.payment.card', 'home.cta']);
    });

    it('filters by status across the locales (a blank value counts, as the page shows it)', async () => {
      expect(await keys('?status=TRANSLATED')).toEqual(['checkout.title', 'home.cta', 'home.hero.title']);
      expect(await keys('?status=UNTRANSLATED')).toEqual(['checkout.payment.title']);
      expect(await keys('?status=PARTIALLY_TRANSLATED')).toEqual(['checkout.payment.card', 'home', 'home.hero.subtitle', 'Zebra']);
    });

    it('filters by the status in one locale, where a blank value is none', async () => {
      expect(await keys('?locale=de&localeStatus=UNTRANSLATED')).toEqual([
        'checkout.payment.title',
        'checkout.title',
        'home',
        'home.hero.subtitle',
        'Zebra',
      ]);
      expect(await keys('?locale=de&localeStatus=TRANSLATED&label=cta')).toEqual(['checkout.payment.card', 'home.cta']);
    });

    it('refuses a sort, status or size outside the contract', async () => {
      for (const query of ['?sort=locales', '?status=DONE', '?localeStatus=PARTIAL', '?size=101']) {
        expect((await admin.get(`${base}${query}`)).statusCode, query).toBe(400);
      }
    });
  });

  describe('the tree', () => {
    it('resolves the top level: each segment once, ordered as the list, keys marked, matching keys below counted', async () => {
      expect(await level()).toEqual(['checkout:3', 'home*:3', 'Zebra*:0']);
      expect(await nodes()).toMatchObject({ total: 3 });
    });

    it('resolves a level below a parent, with the translation of a node that is a key', async () => {
      expect(await level('?parent=home')).toEqual(['cta*:0', 'hero:2']);
      expect(await level('?parent=home.hero')).toEqual(['subtitle*:0', 'title*:0']);
      const [hero] = (await nodes('?parent=home.hero')).items;
      expect(hero).toMatchObject({ path: 'home.hero.subtitle', translation: { key: 'home.hero.subtitle' } });
      expect(await level('?parent=nothing')).toEqual([]);
    });

    it('applies the filter first: a group without a match is gone, counts are matches', async () => {
      expect(await level('?search=title')).toEqual(['checkout:2', 'home:2']);
      expect(await level('?search=title&parent=checkout')).toEqual(['payment:1', 'title*:0']);
      expect(await level('?status=UNTRANSLATED')).toEqual(['checkout:1']);
      expect(await level('?label=cta')).toEqual(['checkout:1', 'home:1']);
    });

    it('pages a level, and takes a prefix literally', async () => {
      expect(await nodes('?size=2')).toMatchObject({ items: [{ name: 'checkout' }, { name: 'home' }], total: 3 });
      expect(await nodes('?size=2&page=1')).toMatchObject({ items: [{ name: 'Zebra' }], total: 3 });
      expect(await level('?parent=h_me')).toEqual([]);
    });
  });

  it('answers every label once, in byte order', async () => {
    expect((await admin.get(`${base}/labels`)).json()).toEqual(['cta', 'form']);
  });
});

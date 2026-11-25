import type { APIRequestContext } from '@playwright/test';

import { tokenValue } from '../pages/tokens.page';
import { TranslationsPage } from '../pages/translations.page';
import type { AppApi } from '../support/app-api';
import { expect, test } from '../support/fixtures';
import { LARGE, largeKey, largePageKeys, largeValue } from '../support/large-translations';
import { translationByKey, translationCount } from '../support/translations';

// A prepared space: the "Translations (large)" test template, 10,000 keys in English, German and French, nothing
// published (support/large-translations.ts). Each test gets its own copy. Pre-check → action (UI) → post-check (the
// UI, after a reload, the API, and the CDN with the space's own Auto Generated Preview Token).
test.use({ spaceTemplate: LARGE.template });

const sortedKeys = (translations: TranslationsPage) => async () => (await translations.visibleKeys()).sort();

/** The CDN translations of a locale, published or draft, read with the space's preview token. */
async function cdn(request: APIRequestContext, api: AppApi, spaceId: string, locale: string, version?: 'draft') {
  const token = await tokenValue(api, spaceId, 'Auto Generated Preview Token');
  const response = await request.get(
    `/api/v1/spaces/${spaceId}/translations/${locale}?token=${token}${version ? `&version=${version}` : ''}`,
  );
  return { status: response.status(), body: response.ok() ? ((await response.json()) as Record<string, string>) : undefined };
}

test.describe('Translations → a large prepared space', () => {
  test('a new space has drafts and nothing published', async ({ api, space, request }) => {
    const key = largeKey(7, 12, 'title');
    for (const locale of Object.keys(LARGE.locales)) {
      const published = await cdn(request, api, space.id, locale);
      expect(published.status, `published ${locale}`).toBe(404);
      const draft = await cdn(request, api, space.id, locale, 'draft');
      expect(draft.status, `draft ${locale}`).toBe(200);
      expect(draft.body?.[key]).toBe(largeValue(7, 12, 'title', locale));
    }
    expect(await translationCount(api, space.id)).toBe(LARGE.keys);
  });

  test('searches values in the chosen locale only', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check: English, the default.
    await translations.goto(space.id);
    await expect(translations.items.first()).toBeVisible();

    // Action → post-check: a German value, searched in German, then in English.
    await translations.filterLocale('German');
    await translations.search('section 7, page 12 (de)');
    await expect.poll(sortedKeys(translations)).toEqual(largePageKeys(7, 12).sort());
    await expect(translations.valueOf(largeKey(7, 12, 'title'))).toHaveText(largeValue(7, 12, 'title', 'de'));
    await translations.filterLocale('English');
    await expect(translations.items).toHaveCount(0);
  });

  test('filters by label and by status', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    // Label: the `cta` key of one page (searching by key narrows the 1,000 `cta` keys to one page).
    await translations.search('section03.page04');
    await expect.poll(sortedKeys(translations)).toEqual(largePageKeys(3, 4).sort());
    await translations.filterLabel('cta');
    await expect.poll(sortedKeys(translations)).toEqual([largeKey(3, 4, 'button')]);
    await translations.resetFilters();

    // Status: the gaps of the template (page 49 `hint` has no value; page 50 has no French).
    await translations.search('section01.page49');
    await translations.filterStatus('Translation', 'Untranslated');
    await expect.poll(sortedKeys(translations)).toEqual([largeKey(1, 49, 'hint')]);
    await translations.resetFilters();
    await translations.search('section02.page50');
    await translations.filterStatus('Translation', 'Partially Translated');
    await expect.poll(sortedKeys(translations)).toEqual(largePageKeys(2, 50).sort());
    await translations.resetFilters();
    await translations.search('section02.page50');
    await translations.filterStatus('Translation', 'Translated');
    await expect(translations.items).toHaveCount(0);
  });

  test('the tree branches by section, then page', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);

    // Action: the tree layout of all 10,000 keys.
    await translations.useLayout('Tree');

    // Post-check: the 20 sections at the top.
    const sections = Array.from({ length: LARGE.sections }, (_, i) => `section${String(i + 1).padStart(2, '0')}`);
    await expect.poll(async () => translations.treeRoots()).toEqual(sections);

    // One page's branch: the search opens the matching branches, section → page → its 10 keys.
    await translations.search('section07.page12');
    await expect.poll(async () => translations.treeRoots()).toEqual(['section07']);
    await expect(translations.treeNode('section07')).toHaveAttribute('aria-expanded', 'true');
    await expect(translations.treeNode('page12')).toHaveAttribute('aria-expanded', 'true');
    for (const field of LARGE.fields) await expect(translations.treeRow(field)).toBeVisible();

    // Collapsing the section hides its pages.
    await translations.treeRow('section07').click();
    await expect(translations.treeNode('section07')).toHaveAttribute('aria-expanded', 'false');
    await expect(translations.treeRow('page12')).toBeHidden();
  });

  test('adds, edits and removes one key among 10,000', async ({ page, api, space }) => {
    const translations = new TranslationsPage(page);
    const key = largeKey(7, 12, 'title');
    await translations.goto(space.id);

    // Add
    await translations.add({ key: 'extra.key', value: 'Extra' });
    await translations.search('extra.key');
    await expect(translations.item('extra.key')).toBeVisible();
    await page.reload();
    await translations.search('extra.key');
    await expect(translations.item('extra.key')).toBeVisible();
    await expect.poll(() => translationCount(api, space.id)).toBe(LARGE.keys + 1);

    // Edit one German value
    await translations.search(key);
    await translations.select(key);
    await translations.selectTargetLocale('German');
    await expect(translations.valueEditor).toHaveValue(largeValue(7, 12, 'title', 'de'));
    await translations.saveValue('Geändert');
    await page.reload();
    await translations.filterLocale('German');
    await translations.search(key);
    await expect(translations.valueOf(key)).toHaveText('Geändert');
    expect((await translationByKey(api, space.id, key))?.locales).toEqual({
      en: largeValue(7, 12, 'title', 'en'),
      de: 'Geändert',
      fr: largeValue(7, 12, 'title', 'fr'),
    });

    // Remove the added key
    await translations.search('extra.key');
    await translations.select('extra.key');
    await translations.deleteSelected();
    await expect(translations.item('extra.key')).toHaveCount(0);
    await page.reload();
    await translations.search('extra.key');
    await expect(translations.items).toHaveCount(0);
    await expect.poll(() => translationCount(api, space.id)).toBe(LARGE.keys);
  });

  test('draft and published follow one English change', async ({ page, api, space, request }) => {
    const translations = new TranslationsPage(page);
    const key = largeKey(7, 12, 'title');
    const original = largeValue(7, 12, 'title', 'en');

    // Pre-check: published, so both versions agree.
    await translations.goto(space.id);
    await translations.publish();
    expect((await cdn(request, api, space.id, 'en')).body?.[key]).toBe(original);
    expect((await cdn(request, api, space.id, 'en', 'draft')).body?.[key]).toBe(original);

    // Action: change the English value.
    await translations.search(key);
    await translations.select(key);
    await translations.saveValue('Changed');

    // Post-check: the draft has it, the published version not yet.
    await expect.poll(async () => (await cdn(request, api, space.id, 'en', 'draft')).body?.[key]).toBe('Changed');
    expect((await cdn(request, api, space.id, 'en')).body?.[key]).toBe(original);

    // Action → post-check: publish, and the published version has it too.
    await translations.publish();
    await expect.poll(async () => (await cdn(request, api, space.id, 'en')).body?.[key]).toBe('Changed');
  });
});

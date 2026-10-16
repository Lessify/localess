import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import type { AppApi } from '../support/app-api';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// An automated accessibility scan (axe-core, WCAG 2 A and AA) of the main pages, with data in them. Fails on serious
// and critical violations; the report lists every one with the elements it found.

/**
 * Known contrast findings, left to a theme decision (TEST-PLAN "Open findings"): keyboard hints (`kbd`, the theme's
 * muted text on muted, 4.34:1) and the inactive Danger Zone tab (destructive at 60 %, 3.06:1). Only their contrast is
 * skipped; every other rule still applies to them.
 */
const KNOWN_CONTRAST = [/^kbd$/, /#brn-tabs-label-danger-zone$/];

async function scan(page: Page): Promise<string[]> {
  // Wait for enter animations (the logo fades in): a half-faded element fails contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().map(it => it.finished.catch(() => undefined))));
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations
    .filter(it => it.impact === 'serious' || it.impact === 'critical')
    .map(it => ({
      ...it,
      nodes:
        it.id === 'color-contrast' ? it.nodes.filter(node => !KNOWN_CONTRAST.some(known => known.test(node.target.join(' ')))) : it.nodes,
    }))
    .filter(it => it.nodes.length > 0)
    .map(
      it =>
        `${it.id} (${it.impact}): ${it.help} — ${it.nodes
          .map(node => node.target.join(' '))
          .slice(0, 5)
          .join(', ')}`,
    );
}

interface SpaceData {
  documentId: string;
  schemaId: string;
}

/** Something on every page: a second locale, a translation, a schema and a document, an image, an environment, a webhook. */
async function withData(api: AppApi, spaceId: string): Promise<SpaceData> {
  await api.addLocale(spaceId, 'de');
  await api.createTranslation(spaceId, { key: 'home.title', locales: { en: 'Hello', de: 'Hallo' } });
  const schema = await api.createSchema(spaceId, {
    name: 'page',
    type: 'ROOT',
    displayName: 'Page',
    fields: [{ name: 'title', kind: 'TEXT', displayName: 'Title' }],
  });
  const doc = await api.createDocument(spaceId, { name: 'Home', slug: 'home', schema: 'page' });
  await api.uploadAsset(spaceId, pngFile('hero.png'));
  await api.addEnvironment(spaceId, { name: 'Staging', url: 'https://staging.example.com/' });
  await api.createWebhook(spaceId, { name: 'Deploy', url: 'https://hooks.example.com/deploy', events: ['translation.published'] });
  return { documentId: doc.id, schemaId: schema.id };
}

test.describe('Accessibility', () => {
  test('the sign-in page', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
    expect(await scan(page)).toEqual([]);
    await context.close();
  });

  // One test per page (each with its own space and data): a scan takes a few seconds.
  const SPACE_PAGES: { name: string; path: (data: SpaceData) => string; ready: string }[] = [
    { name: 'Dashboard', path: () => 'dashboard', ready: 'Translations' },
    { name: 'Translations', path: () => 'translations', ready: 'home.title' },
    { name: 'Contents', path: () => 'contents', ready: 'Home' },
    { name: 'Document editor', path: data => `contents/${data.documentId}`, ready: 'Title' },
    { name: 'Schemas', path: () => 'schemas', ready: '#page' },
    { name: 'Schema editor', path: data => `schemas/comp/${data.schemaId}`, ready: '#title' },
    { name: 'Assets', path: () => 'assets', ready: 'hero.png' },
    { name: 'Settings → General', path: () => 'settings/general', ready: 'Space Name' },
    { name: 'Settings → Locales', path: () => 'settings/locales', ready: 'German' },
    { name: 'Settings → Visual Editor', path: () => 'settings/visual-editor', ready: 'Staging' },
    { name: 'Settings → Access Tokens', path: () => 'settings/tokens', ready: 'Auto Generated Preview Token' },
    { name: 'Developers → Webhooks', path: () => 'developers/webhooks', ready: 'Deploy' },
  ];
  for (const { name, path, ready } of SPACE_PAGES) {
    test(`a space: ${name}`, async ({ page, api, space }) => {
      const data = await withData(api, space.id);
      await page.goto(`/features/spaces/${space.id}/${path(data)}`);
      await expect(page.getByText(ready).first()).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });
  }

  for (const [name, path, ready] of [
    ['Admin → Users', '/features/admin/users', 'admin@e2e.localess.test'],
    ['Admin → Spaces', '/features/admin/spaces', 'Hello World'],
    ['Me', '/features/me', 'admin@e2e.localess.test'],
  ]) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });
  }
});

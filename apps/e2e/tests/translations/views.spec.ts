import { TranslationsPage } from '../pages/translations.page';
import { expect, test } from '../support/fixtures';
import { withThreeLocales } from '../support/translations';

// Pre-check → action (UI) → post-check. Space: English, German, Romanian.
test.describe('Translations → list view', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
  });

  test('a row shows the key and its value; clicking it opens the key', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' } });
    await api.createTranslation(space.id, { key: 'farewell', locales: { en: 'Bye' } });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(2);

    // Action → post-check
    await expect(translations.valueOf('greeting')).toHaveText('Hello');
    await translations.select('farewell');
    await expect(translations.detail('Key')).toContainText('farewell');
    await translations.select('greeting');
    await expect(translations.detail('Key')).toContainText('greeting');
    await expect(translations.valueEditor).toHaveValue('Hello');
  });

  test('loads more keys as the list scrolls to its end, rendering only what is visible', async ({ page, api, space }) => {
    for (let i = 0; i < 120; i++) {
      await api.createTranslation(space.id, { key: `bulk.key${String(i).padStart(3, '0')}`, locales: { en: `Value ${i}` } });
    }
    const translations = new TranslationsPage(page);

    // Pre-check: the count of every key, the first ones rendered, not the last; no paginator.
    await translations.goto(space.id);
    await expect(page.getByTestId('list-count')).toHaveText('120 keys');
    await expect(translations.item('bulk.key000')).toBeVisible();
    await expect(translations.item('bulk.key119')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next page' })).toHaveCount(0);
    expect(await translations.items.count()).toBeLessThan(50);

    // Action: scroll to the end until the last key is there (50 more each time the end comes into view).
    await expect(async () => {
      await translations.scrollToEnd();
      await expect(translations.item('bulk.key119')).toBeVisible({ timeout: 1_000 });
    }).toPass();

    // Post-check: the last key opens; the end marker is gone.
    await translations.select('bulk.key119');
    await expect(translations.valueEditor).toHaveValue('Value 119');
    await expect(page.getByText('Loading more…')).toHaveCount(0);
  });

  test('shows a key added elsewhere without a reload (live updates)', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'first', locales: { en: 'First' } });
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.item('first')).toBeVisible();
    await expect(translations.item('from.elsewhere')).toHaveCount(0);

    // Action: a colleague adds one.
    await api.createTranslation(space.id, { key: 'from.elsewhere', locales: { en: 'Pushed by a colleague' } });

    // Post-check
    await expect(translations.item('from.elsewhere')).toBeVisible();
  });
});

test.describe('Translations → tree view', () => {
  test.beforeEach(async ({ api, space }) => {
    await withThreeLocales(api, space);
    for (const [key, en] of [
      ['home.title', 'Welcome'],
      ['home.subtitle', 'Nice to see you'],
      ['nav.about', 'About'],
      ['nav.contact', 'Contact'],
      ['footer', 'Footer'],
    ]) {
      await api.createTranslation(space.id, { key, locales: { en } });
    }
  });

  test('groups keys by their dots; expanding a group shows its keys', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check: list layout.
    await translations.goto(space.id);
    await expect(translations.items).toHaveCount(5);

    // Action
    await translations.useLayout('Tree');

    // Post-check: top level, then the children of "home".
    expect((await translations.treeRoots()).sort()).toEqual(['footer', 'home', 'nav']);
    await expect(translations.treeNode('title')).toBeHidden();
    await translations.treeRow('home').click();
    await expect(translations.treeNode('home')).toHaveAttribute('aria-expanded', 'true');
    await expect(translations.treeRow('title')).toBeVisible();
    await expect(translations.treeRow('subtitle')).toBeVisible();
    await expect(translations.treeRow('about')).toBeHidden();

    // Action → post-check: collapse again.
    await translations.treeRow('home').click();
    await expect(translations.treeNode('home')).toHaveAttribute('aria-expanded', 'false');
    await expect(translations.treeRow('title')).toBeHidden();
  });

  test('selecting a key opens it, and the tree shows it as selected', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.useLayout('Tree');

    // Pre-check
    await translations.treeRow('nav').click();
    await expect(translations.treeNode('about')).not.toHaveAttribute('aria-selected', 'true');

    // Action
    await translations.treeRow('about').click();

    // Post-check: the detail panel, and the selection in the tree.
    await expect(translations.detail('Key')).toContainText('nav.about');
    await expect(translations.valueEditor).toHaveValue('About');
    await expect(translations.treeNode('about')).toHaveAttribute('aria-selected', 'true');
  });

  test('opened in the tree, the first key it shows is selected, not one in a closed group', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.useLayout('Tree');

    // Action: a fresh start in the tree (the list selected its own first key).
    await page.reload();

    // Post-check: "footer" is a key at the top level; "home" and "nav" are closed groups.
    await expect(translations.detail('Key')).toContainText('footer');
    await expect(translations.treeNode('footer')).toHaveAttribute('aria-selected', 'true');
  });

  test('a selected key outside the search stays open, marked as such', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.useLayout('Tree');
    await translations.treeRow('nav').click();
    await translations.treeRow('about').click();

    // Pre-check
    await expect(translations.detail('Key')).toContainText('nav.about');
    await expect(page.getByTestId('outside-filter')).toBeHidden();

    // Action
    await translations.search('home.');

    // Post-check: still nav.about, with the note; selecting a key of the result removes it.
    await expect(page.getByTestId('outside-filter')).toBeVisible();
    await expect(translations.detail('Key')).toContainText('nav.about');
    await translations.treeRow('title').click();
    await expect(translations.detail('Key')).toContainText('home.title');
    await expect(page.getByTestId('outside-filter')).toBeHidden();
  });

  test('the search filters the tree', async ({ page, space }) => {
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.useLayout('Tree');

    // Pre-check
    expect((await translations.treeRoots()).sort()).toEqual(['footer', 'home', 'nav']);

    // Action
    await translations.search('nav.');

    // Post-check: only the "nav" branch.
    await expect.poll(async () => (await translations.treeRoots()).sort()).toEqual(['nav']);
  });

  test('the chosen layout is kept after a reload', async ({ page, space }) => {
    const translations = new TranslationsPage(page);

    // Pre-check
    await translations.goto(space.id);
    await expect(translations.tree).toHaveCount(0);

    // Action
    await translations.useLayout('Tree');
    await page.reload();

    // Post-check: still the tree; back to the list on request.
    await expect(translations.tree).toBeVisible();
    await translations.useLayout('List');
    await page.reload();
    await expect(translations.items).toHaveCount(5);
  });
});

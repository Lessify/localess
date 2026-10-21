import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

import { AdminSpacesPage } from '../pages/admin-spaces.page';
import { AdminUsersPage } from '../pages/admin-users.page';
import { AssetsPage } from '../pages/assets.page';
import { ContentsPage } from '../pages/contents.page';
import { cancel, dialog, rowMenu } from '../pages/dialogs';
import { EnvironmentsPage } from '../pages/environments.page';
import { LocalesPage } from '../pages/locales.page';
import { MePage } from '../pages/me.page';
import { SchemasPage } from '../pages/schemas.page';
import { TokensPage } from '../pages/tokens.page';
import { TranslationsPage } from '../pages/translations.page';
import { WebhooksPage } from '../pages/webhooks.page';
import type { AppApi } from '../support/app-api';
import { ADMIN } from '../support/env';
import { pngFile } from '../support/files';
import { expect, test } from '../support/fixtures';

// An automated accessibility scan (axe-core, WCAG 2 A and AA) of the main pages, with data in them. Fails on serious
// and critical violations; the report lists every one with the elements it found.

/**
 * Known contrast findings, left to a theme decision (TEST-PLAN "Open findings"): keyboard hints (`kbd`, the theme's
 * muted text on muted, 4.34:1), the inactive Danger Zone tab (destructive at 60 %, 3.06:1), choice-card descriptions
 * and destructive buttons. Only their contrast is
 * skipped; every other rule still applies to them.
 */
const KNOWN_CONTRAST = [
  /^kbd$/,
  /#brn-tabs-label-danger-zone$/,
  // The description of a choice card (token type, space template) on the selected card's background: 4.27:1.
  /^#(token-type-\w+|EMPTY|blog|ecommerce|marketing)-description$/,
  // The destructive button: white on the destructive colour (a confirmation's OK, the Danger Zone's button).
  /\.spartan-button-variant-destructive$/,
  /^#deleteTranslations$/,
];

/** The serious and critical violations on the page, or only inside `scope` (an open dialog). */
async function scan(page: Page, scope?: string, exclude?: string): Promise<string[]> {
  // Wait for enter animations (the logo fades in): a half-faded element fails contrast. Only finite ones: an endless
  // animation (a spinner) never finishes, and waiting for it would hang the test.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(it => it.effect?.getComputedTiming().iterations !== Infinity)
        .map(it => it.finished.catch(() => undefined)),
    ),
  );
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (scope) builder.include(scope);
  if (exclude) builder.exclude(exclude);
  const { violations } = await builder.analyze();
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
  webhookId: string;
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
  const webhook = await api.createWebhook(spaceId, {
    name: 'Deploy',
    url: 'https://hooks.example.com/deploy',
    events: ['translation.published'],
  });
  return { documentId: doc.id, schemaId: schema.id, webhookId: webhook.id };
}

test.describe('Accessibility', () => {
  test('the sign-in page', async ({ signedOutPage }) => {
    const page = await signedOutPage();
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  // One test per page (each with its own space and data): a scan takes a few seconds.
  const SPACE_PAGES: { name: string; path: (data: SpaceData) => string; ready: string }[] = [
    { name: 'Dashboard', path: () => 'dashboard', ready: 'Translation Keys' }, // a card: shown once the overview loaded
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
    { name: 'Developers → Webhooks → a webhook', path: data => `developers/webhooks/${data.webhookId}`, ready: 'Logs' },
    { name: 'Settings → Danger Zone', path: () => 'settings/danger-zone', ready: 'Delete All Translations' },
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
    ['Admin → Users', '/features/admin/users', ADMIN.email],
    ['Admin → Spaces', '/features/admin/spaces', 'Hello World'],
    ['Me', '/features/me', ADMIN.email],
  ]) {
    test(name, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(ready).first()).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });
  }
});

test.describe('Accessibility of other views', () => {
  test('the Visual Editor (the preview of the customer site is not scanned)', async ({ page, api, space }) => {
    const data = await withData(api, space.id);
    const contents = new ContentsPage(page);
    await contents.gotoDocument(space.id, data.documentId);
    await contents.openVisualEditor();
    await expect(page.getByTitle('Preview')).toBeVisible();
    expect(await scan(page, undefined, 'iframe')).toEqual([]);
  });

  test('Forgot password and the page a reset link opens', async ({ signedOutPage }) => {
    const page = await signedOutPage();
    await page.goto('/auth/reset');
    await expect(page.getByRole('button', { name: 'Reset Password' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
    await page.goto('/auth/reset/confirm?token=scan');
    await expect(page.getByRole('button', { name: 'Change password' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});

// Dialogs: each opened from its page, then scanned on its own (the page behind is scanned above). A dialog also needs
// a name (its title), which axe checks only as best practice.
test.describe('Accessibility of dialogs', () => {
  const DIALOG = '[role="dialog"]';

  async function expectAccessible(page: Page, dialog: Locator): Promise<void> {
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleName(/\S/);
    expect(await scan(page, DIALOG)).toEqual([]);
  }

  const SPACE_DIALOGS: { name: string; open: (page: Page, spaceId: string) => Promise<Locator> }[] = [
    {
      name: 'Add Translation',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/translations`, () => new TranslationsPage(page).openAdd({ key: 'new.key', value: 'New' })),
    },
    {
      name: 'Add Document',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/contents`, () => new ContentsPage(page).openAdd('Document', { name: 'About' })),
    },
    {
      name: 'Add Folder',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/contents`, () => new ContentsPage(page).openAdd('Folder', { name: 'Blog' })),
    },
    {
      name: 'Create new Schema',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/schemas`, () => new SchemasPage(page).openCreate({ displayName: 'Card' })),
    },
    {
      name: 'Create new Folder (assets)',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/assets`, () => new AssetsPage(page).openCreateFolder('Images')),
    },
    {
      name: 'Edit File (assets)',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/assets`, () => new AssetsPage(page).openEdit('hero.png', 'File')),
    },
    {
      name: 'Image preview',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/assets`, async () => {
          await new AssetsPage(page).row('hero.png').click();
          return new AssetsPage(page).preview;
        }),
    },
    {
      name: 'Token Form',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/settings/tokens`, () => new TokensPage(page).openAdd('Website')),
    },
    {
      name: 'Copy your token',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/settings/tokens`, async () => {
          const tokens = new TokensPage(page);
          await tokens.create('CI pipeline', 'Management');
          return tokens.copiedDialog();
        }),
    },
    {
      name: 'Add Locale',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/settings/locales`, () => new LocalesPage(page).openAdd('Romanian')),
    },
    {
      name: 'Delete Locale (confirmation)',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/settings/locales`, async () => {
          await rowMenu(page, new LocalesPage(page).row('de'), 'Delete');
          return dialog(page, 'Delete Locale');
        }),
    },
    {
      name: 'Edit Environment',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/settings/visual-editor`, () =>
          new EnvironmentsPage(page).openEdit('Staging', { name: 'Staging', url: 'https://staging.example.com/' }),
        ),
    },
    {
      name: 'Edit Webhook',
      open: (page, id) => gotoThen(page, `/features/spaces/${id}/developers/webhooks`, () => new WebhooksPage(page).openEdit('Deploy', {})),
    },
    {
      name: 'Copy the signing secret',
      open: (page, id) =>
        gotoThen(page, `/features/spaces/${id}/developers/webhooks`, async () => {
          const webhooks = new WebhooksPage(page);
          await webhooks.create({ name: 'Signed', url: 'https://hooks.example.com/signed', events: ['content.published'], signed: true });
          return webhooks.secretDialog();
        }),
    },
  ];
  for (const { name, open } of SPACE_DIALOGS) {
    test(`a space: ${name}`, async ({ page, api, space }) => {
      await withData(api, space.id);
      await expectAccessible(page, await open(page, space.id));
    });
  }

  test('Admin → Users: User Invite and User (edit)', async ({ page, createUser }) => {
    const user = await createUser({ role: 'VIEWER' });
    const users = new AdminUsersPage(page);
    await users.goto(user.email);
    await page.getByRole('button', { name: 'Invite' }).click();
    const invite = await dialog(page, 'User Invite');
    await expectAccessible(page, invite);
    await cancel(invite);
    await users.action(user.email, 'Edit');
    await expectAccessible(page, await dialog(page, 'User'));
  });

  test('Admin → Spaces: Create Space and Edit Space', async ({ page, space }) => {
    const spaces = new AdminSpacesPage(page);
    await spaces.goto(space.name);
    const create = await spaces.openCreate('Scanned');
    await expectAccessible(page, create);
    await cancel(create);
    await expectAccessible(page, await spaces.openRename(space.name, space.name));
  });

  test('Me: Update Profile, Update Email, Update Password', async ({ createUser, signInAs }) => {
    const user = await createUser({ role: 'VIEWER' });
    const page = await signInAs(user);
    const me = new MePage(page);
    await me.goto(user.email);
    for (const open of [() => me.openProfile({}), () => me.openEmail('', ''), () => me.openPassword('', '')]) {
      const form = await open();
      await expectAccessible(page, form);
      await cancel(form);
    }
  });
});

/** Opens a page and waits for it, then opens a dialog on it. */
async function gotoThen(page: Page, path: string, open: () => Promise<Locator>): Promise<Locator> {
  await page.goto(path);
  await page.waitForURL(`**${path}`);
  return open();
}

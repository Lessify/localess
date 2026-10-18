import { AdminUsersPage } from '../pages/admin-users.page';
import { AssetsPage } from '../pages/assets.page';
import { ContentsPage } from '../pages/contents.page';
import { cancel, rowMenu } from '../pages/dialogs';
import { EnvironmentsPage } from '../pages/environments.page';
import { LocalesPage } from '../pages/locales.page';
import { MePage } from '../pages/me.page';
import { dismissConfirmation } from '../pages/notifications';
import { TokensPage, tokensOf } from '../pages/tokens.page';
import { TranslationsPage } from '../pages/translations.page';
import { WebhooksPage } from '../pages/webhooks.page';
import { assetsIn } from '../support/assets';
import { Cdn, contentsIn, pageSchema } from '../support/contents';
import { pngFile } from '../support/files';
import { expect, test, uniqueId } from '../support/fixtures';
import { translationsByKey } from '../support/translations';

// Every destructive action asks first. Cancelling must change nothing: pre-check (UI and API) → open the confirmation,
// Cancel → post-check (the UI, again after a reload, and the API state equal to the pre-check).
test.describe('Cancelling a confirmation changes nothing', () => {
  test('Danger Zone → Delete All Translations', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' } });
    const before = [...(await translationsByKey(api, space.id)).keys()];
    expect(before).toEqual(['greeting']);
    await page.goto(`/features/spaces/${space.id}/settings/danger-zone`);

    await page.getByRole('button', { name: 'Delete All Translations' }).click();
    await dismissConfirmation(page, 'Delete All Translations');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Delete All Translations' })).toBeVisible();
    expect([...(await translationsByKey(api, space.id)).keys()]).toEqual(before);
  });

  test('Access Tokens → Regenerate and Delete', async ({ page, api, space }) => {
    await api.createToken(space.id, { name: 'Website', type: 'public' });
    const before = await tokensOf(api, space.id);
    const tokens = new TokensPage(page);
    await tokens.goto(space.id);
    await expect(tokens.row('Website')).toBeVisible();

    await tokens.row('Website').getByRole('button', { name: 'Regenerate' }).click();
    await dismissConfirmation(page, 'Regenerate Token');
    await tokens.row('Website').getByRole('button', { name: 'Delete' }).click();
    await dismissConfirmation(page, 'Delete Token');

    await page.reload();
    await expect(tokens.row('Website')).toBeVisible();
    // Same tokens, same values (not regenerated).
    expect(await tokensOf(api, space.id)).toEqual(before);
  });

  test('Locales → Delete and Set as Default', async ({ page, api, space }) => {
    await api.addLocale(space.id, 'de');
    const before = await api.findSpace(space.id);
    const locales = new LocalesPage(page);
    await locales.goto(space.id);
    await expect(locales.row('de')).toBeVisible();

    await rowMenu(page, locales.row('de'), 'Delete');
    await dismissConfirmation(page, 'Delete Locale');
    await rowMenu(page, locales.row('de'), 'Set as Default');
    await dismissConfirmation(page, 'Change Default Locale');

    await page.reload();
    await expect(locales.row('de')).toBeVisible();
    await expect(locales.isDefault('en')).toBeVisible();
    const after = await api.findSpace(space.id);
    expect(after?.locales).toEqual(before?.locales);
    expect(after?.defaultLocale).toEqual(before?.defaultLocale);
  });

  test('Visual Editor → Delete Environment', async ({ page, api, space }) => {
    await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' });
    const before = (await api.findSpace(space.id))?.environments;
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);
    await expect(environments.item('Staging')).toBeVisible();

    await environments.item('Staging').getByRole('button', { name: 'Delete' }).click();
    await dismissConfirmation(page, 'Delete Environment');

    await page.reload();
    await expect(environments.item('Staging')).toBeVisible();
    expect((await api.findSpace(space.id))?.environments).toEqual(before);
  });

  test('Webhooks → Delete', async ({ page, api, space }) => {
    await api.createWebhook(space.id, { name: 'Deploy', url: 'https://hooks.example.com/deploy', events: ['translation.published'] });
    const list = () => api.get(`/api/app/spaces/${space.id}/webhooks`);
    const before = await list();
    const webhooks = new WebhooksPage(page);
    await webhooks.goto(space.id);
    await expect(webhooks.row('Deploy')).toBeVisible();

    await rowMenu(page, webhooks.row('Deploy'), 'Delete');
    await dismissConfirmation(page, 'Delete Webhook');

    await page.reload();
    await expect(webhooks.row('Deploy')).toContainText('Enabled');
    expect(await list()).toEqual(before);
  });

  test('Admin → Users → Disable', async ({ page, api, createUser, probe }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const users = new AdminUsersPage(page);
    await users.goto(user.email);
    await expect(users.status(user.email, 'Active')).toBeVisible();

    await users.action(user.email, 'Disable');
    await dismissConfirmation(page, 'Disable User');

    await page.reload();
    await expect(users.status(user.email, 'Active')).toBeVisible();
    expect(await api.findUserByEmail(user.email)).toMatchObject({ disabled: false });
    expect(await probe.canSignIn(user.email, user.password)).toBe(true);
  });

  test('Contents → Delete Folder and Unpublish Document', async ({ page, api, space, request }) => {
    const schema = await pageSchema(api, space);
    const folder = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const doc = await api.createDocument(space.id, { name: 'Hello', slug: 'hello', schema: schema.name, parentId: folder.id });
    await api.saveDocumentData(space.id, doc, { title: 'Hello' });
    await api.publishContent(space.id, doc.id);
    const cdn = new Cdn(request, api, space.id);
    expect((await cdn.get({ id: doc.id })).status).toBe(200);
    const before = await contentsIn(api, space.id, folder.id);
    const contents = new ContentsPage(page);

    // Delete Folder, cancelled.
    await contents.goto(space.id);
    await rowMenu(page, contents.row('Blog'), 'Delete');
    await dismissConfirmation(page, 'Delete Folder');

    // Unpublish Document, cancelled.
    await contents.row('Blog').click();
    await rowMenu(page, contents.row('Hello'), 'Unpublish');
    await dismissConfirmation(page, 'Unpublish Document');

    // After a reload the list is at the root again.
    await page.reload();
    await contents.row('Blog').click();
    await expect(contents.row('Hello')).toBeVisible();
    expect(await contentsIn(api, space.id, folder.id)).toEqual(before);
    expect((await cdn.get({ id: doc.id })).status).toBe(200);
  });

  test('Assets → Delete Folder', async ({ page, api, space }) => {
    const folder = await api.createAssetFolder(space.id, 'Images');
    await api.uploadAsset(space.id, pngFile('hero.png'), folder.id);
    const before = [await assetsIn(api, space.id), await assetsIn(api, space.id, folder.id)];
    const assets = new AssetsPage(page);
    await assets.goto(space.id);

    await assets.openDelete('Images', 'Folder');
    await dismissConfirmation(page, 'Delete Folder');

    await page.reload();
    await expect(assets.row('Images')).toBeVisible();
    expect([await assetsIn(api, space.id), await assetsIn(api, space.id, folder.id)]).toEqual(before);
  });
});

// Edit and add dialogs: changes typed into a dialog are kept only on Save.
test.describe('Cancelling a form dialog saves nothing', () => {
  test('Access Tokens → Edit', async ({ page, api, space }) => {
    await api.createToken(space.id, { name: 'Website', type: 'public' });
    const before = await tokensOf(api, space.id);
    const tokens = new TokensPage(page);
    await tokens.goto(space.id);

    await cancel(await tokens.openEdit('Website', { name: 'Renamed', cacheTtl: '0' }));

    await page.reload();
    await expect(tokens.row('Website')).toContainText('Default (60s)');
    expect(await tokensOf(api, space.id)).toEqual(before);
  });

  test('Webhooks → Edit', async ({ page, api, space }) => {
    await api.createWebhook(space.id, { name: 'Deploy', url: 'https://hooks.example.com/deploy', events: ['translation.published'] });
    const list = () => api.get(`/api/app/spaces/${space.id}/webhooks`);
    const before = await list();
    const webhooks = new WebhooksPage(page);
    await webhooks.goto(space.id);

    await cancel(
      await webhooks.openEdit('Deploy', { name: 'Renamed', url: 'https://other.example.com/', events: ['translation.changed'] }),
    );

    await page.reload();
    await expect(webhooks.row('Deploy')).toContainText('https://hooks.example.com/deploy');
    expect(await list()).toEqual(before);
  });

  test('Visual Editor → Edit Environment', async ({ page, api, space }) => {
    await api.addEnvironment(space.id, { name: 'Staging', url: 'https://staging.example.com/' });
    const before = (await api.findSpace(space.id))?.environments;
    const environments = new EnvironmentsPage(page);
    await environments.goto(space.id);

    await cancel(await environments.openEdit('Staging', { name: 'Production', url: 'https://www.example.com/' }));

    await page.reload();
    await expect(environments.item('Staging')).toBeVisible();
    expect((await api.findSpace(space.id))?.environments).toEqual(before);
  });

  test('Locales → Add Locale', async ({ page, api, space }) => {
    const before = (await api.findSpace(space.id))?.locales;
    const locales = new LocalesPage(page);
    await locales.goto(space.id);

    await cancel(await locales.openAdd('German'));

    await page.reload();
    await expect(locales.row('en')).toBeVisible();
    await expect(locales.row('de')).toHaveCount(0);
    expect((await api.findSpace(space.id))?.locales).toEqual(before);
  });

  test("Admin → Users → Edit (a user's role)", async ({ page, api, createUser }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const users = new AdminUsersPage(page);
    await users.goto(user.email);

    await cancel(await users.openEditAccess(user.email, { role: 'Admin' }));

    await page.reload();
    await expect(await users.roleCell(user.email)).toHaveText('CUSTOM');
    expect(await api.findUserByEmail(user.email)).toMatchObject({ role: 'CUSTOM', permissions: ['TRANSLATION_READ'] });
  });

  test('Me → Update Email', async ({ api, createUser, signInAs }) => {
    const user = await createUser({ permissions: ['TRANSLATION_READ'] });
    const page = await signInAs(user);
    const me = new MePage(page);
    await me.goto(user.email);

    await cancel(await me.openEmail(user.password, `${uniqueId('changed-')}@e2e.localess.test`));

    await page.reload();
    await expect(me.field('Email')).toHaveText(`Email: ${user.email}`);
    expect(await api.findUserByEmail(user.email)).toBeDefined();
  });

  test('Translations → Edit Translation', async ({ page, api, space }) => {
    await api.createTranslation(space.id, { key: 'greeting', locales: { en: 'Hello' }, description: 'Kept' });
    const translations = new TranslationsPage(page);
    await translations.goto(space.id);
    await translations.select('greeting');

    const form = await translations.openEdit();
    await form.getByLabel('Description').fill('Not saved');
    await cancel(form);

    await page.reload();
    await expect(translations.item('greeting')).toBeVisible();
    expect((await translationsByKey(api, space.id)).get('greeting')).toMatchObject({ description: 'Kept' });
  });
});

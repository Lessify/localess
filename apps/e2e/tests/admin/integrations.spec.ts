import { AdminSettingsPage } from '../pages/admin-settings.page';
import { AssetsPage } from '../pages/assets.page';
import { expectToast } from '../pages/notifications';
import { expect, test } from '../support/fixtures';

const INTEGRATIONS = '/api/app/admin/integrations';
/** The key the e2e server's fake Unsplash accepts (scripts/start-server.mjs); any other one is refused. */
const GOOD_KEY = 'e2e-unsplash-good';

interface IntegrationDto {
  id: string;
  source: string;
  status?: string;
  hints: Record<string, string>;
}

// The integrations are install-wide: these tests run one after the other and leave Unsplash disconnected, as every other
// spec expects it. Pre-check (UI and API) → action (UI) → post-check (UI, after a reload, API, an editor's open page).
test.describe('Admin → Settings → Integrations', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async ({ api }) => {
    await api.delete(`${INTEGRATIONS}/unsplash`);
  });

  const unsplashOf = async (api: { get<T>(path: string): Promise<T> }) =>
    (await api.get<{ integrations: IntegrationDto[] }>(INTEGRATIONS)).integrations.find(it => it.id === 'unsplash');

  test('connecting Unsplash: a wrong key is refused, the right one turns the picker on for an editor at once @smoke', async ({
    page,
    api,
    space,
    createUser,
    signInAs,
  }) => {
    const settings = new AdminSettingsPage(page);
    const editorPage = await signInAs(await createUser({ role: 'EDITOR' }));
    const assets = new AssetsPage(editorPage);

    // Pre-check: not connected, and the editor's Upload menu has no Unsplash.
    await settings.goto();
    await expect(settings.badge('Unsplash', 'Not connected')).toBeVisible();
    expect(await unsplashOf(api)).toMatchObject({ source: 'none' });
    await assets.goto(space.id);
    await assets.openUploadMenu();
    await expect(assets.fromUnsplash).toHaveCount(0);

    // A wrong key: refused with what to fix, nothing saved.
    await settings.connect('Unsplash', { 'Access Key': 'wrong' });
    await expect(settings.result('Unsplash')).toContainText('Access Key, not the Secret Key');
    expect(await unsplashOf(api)).toMatchObject({ source: 'none' });

    // The right key.
    await settings.connect('Unsplash', { 'Access Key': GOOD_KEY });
    await expectToast(page, 'Unsplash is connected.');

    // Post-check: the card, after a reload, the API (only the hint), and the editor's open menu, without a reload.
    await expect(settings.badge('Unsplash', 'Connected')).toBeVisible();
    await expect(settings.card('Unsplash')).toContainText('••••good');
    await page.reload();
    await expect(settings.badge('Unsplash', 'Connected')).toBeVisible();
    const saved = await unsplashOf(api);
    expect(saved).toMatchObject({ source: 'ui', status: 'verified', hints: { apiKey: '••••good' } });
    expect(JSON.stringify(saved)).not.toContain(GOOD_KEY);
    await expect(assets.fromUnsplash).toBeVisible();
  });

  test('disconnecting Unsplash deletes the key and hides the picker for an editor at once', async ({
    page,
    api,
    space,
    createUser,
    signInAs,
  }) => {
    await api.send('put', `${INTEGRATIONS}/unsplash`, { values: { apiKey: GOOD_KEY } });
    const settings = new AdminSettingsPage(page);
    const editorPage = await signInAs(await createUser({ role: 'EDITOR' }));
    const assets = new AssetsPage(editorPage);

    // Pre-check
    await settings.goto();
    await expect(settings.badge('Unsplash', 'Connected')).toBeVisible();
    await assets.goto(space.id);
    await assets.openUploadMenu();
    await expect(assets.fromUnsplash).toBeVisible();

    // Action
    await settings.disconnect('Unsplash');

    // Post-check
    await expect(settings.badge('Unsplash', 'Not connected')).toBeVisible();
    await page.reload();
    await expect(settings.badge('Unsplash', 'Not connected')).toBeVisible();
    expect(await unsplashOf(api)).toMatchObject({ source: 'none' });
    await expect(assets.fromUnsplash).toHaveCount(0);
  });
});

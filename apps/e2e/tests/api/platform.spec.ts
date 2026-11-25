import { CSRF } from '../support/app-api';
import { expect, test, uniqueName } from '../support/fixtures';

test.describe('Platform', () => {
  test('health endpoint reports ok @smoke', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('runtime config is public and lists the OAuth providers', async ({ request }) => {
    const config = await (await request.get('/api/config')).json();
    // Set by playwright.config.ts (a mock OpenID provider stands in for both).
    expect(config.auth.providers).toEqual(['GOOGLE', 'MICROSOFT']);
    // Set by playwright.config.ts (LOCALESS_TRANSLATE_PROVIDER=stub).
    expect(config.translate.enabled).toBe(true);
  });

  test('the SPA is served at the root and on deep links @smoke', async ({ request }) => {
    for (const path of ['/', '/features/admin/spaces', '/auth/login']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'], path).toContain('text/html');
      expect(await response.text(), path).toContain('<ll-root');
    }
  });

  test('the App API needs a session', async ({ newClient }) => {
    const anonymous = await newClient();
    expect((await anonymous.get('/api/app/spaces')).status()).toBe(401);
    expect((await anonymous.get('/api/auth/me')).status()).toBe(401);
  });

  test('state-changing App API calls need the X-Requested-With header (CSRF)', async ({ request, api, cleanup }) => {
    const refused = uniqueName('CSRF');
    const accepted = uniqueName('CSRF check');
    cleanup.space(refused);
    cleanup.space(accepted);
    const withoutHeader = await request.post('/api/app/spaces', { data: { name: refused } });
    expect(withoutHeader.status()).toBe(403);
    expect((await api.listSpaces()).map(it => it.name)).not.toContain(refused);
    const withHeader = await request.post('/api/app/spaces', { data: { name: accepted }, headers: CSRF });
    expect(withHeader.ok()).toBeTruthy();
  });
});

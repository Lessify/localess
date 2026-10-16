import { CSRF } from '../support/app-api';
import { anonymousRequest, expect, test } from '../support/fixtures';

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

  test('the App API needs a session', async ({ playwright, baseURL }) => {
    const anonymous = await anonymousRequest(playwright, baseURL);
    expect((await anonymous.get('/api/app/spaces')).status()).toBe(401);
    expect((await anonymous.get('/api/auth/me')).status()).toBe(401);
    await anonymous.dispose();
  });

  test('state-changing App API calls need the X-Requested-With header (CSRF)', async ({ request }) => {
    const withoutHeader = await request.post('/api/app/spaces', { data: { name: 'CSRF' } });
    expect(withoutHeader.status()).toBe(403);
    const withHeader = await request.post('/api/app/spaces', { data: { name: 'CSRF check' }, headers: CSRF });
    expect(withHeader.ok()).toBeTruthy();
    await request.delete(`/api/app/spaces/${(await withHeader.json()).id}`, { headers: CSRF });
  });
});

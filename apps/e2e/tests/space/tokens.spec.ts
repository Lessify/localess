import { tokensOf, TokensPage, tokenValue } from '../pages/tokens.page';
import { expect, test } from '../support/fixtures';

// Pre-check → action (UI) → post-check (the list, again after a reload, the App API, and the CDN API with the value).
test.describe('Space settings → Access Tokens', () => {
  test('creates a public token that opens the CDN API @smoke', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    const tokens = new TokensPage(page);

    // Pre-check: only the auto-generated preview token.
    await tokens.goto(space.id);
    expect((await tokensOf(api, space.id)).map(it => it.name)).toEqual(['Auto Generated Preview Token']);

    // Action
    await tokens.create('Website', 'Public');

    // Post-check
    await expect(tokens.row('Website')).toContainText('Public');
    await page.reload();
    await expect(tokens.row('Website')).toContainText('Public');
    expect((await tokensOf(api, space.id)).find(it => it.name === 'Website')).toMatchObject({ type: 'public' });
    const token = await tokenValue(api, space.id, 'Website');
    const cdn = await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    expect(await cdn.json()).toEqual({ k1: 'v' });
  });

  test('shows a management token once, in a dialog that must be acknowledged', async ({ page, api, space }) => {
    const tokens = new TokensPage(page);
    await tokens.goto(space.id);

    await tokens.create('CI pipeline', 'Management');
    const secret = await tokens.copiedDialog();
    const shown = secret.getByText(/^mgt_/);
    await expect(shown).toBeVisible();
    const value = (await shown.innerText()).trim();
    await expect(secret.getByText(/localess login/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(secret).toBeVisible();
    await secret.getByRole('button', { name: "I've copied it" }).click();
    await expect(secret).toBeHidden();

    // Once: the API lists the token without its value, and the page doesn't show it, also after a reload.
    await expect(tokens.row('CI pipeline')).toContainText('Management');
    const listed = (await tokensOf(api, space.id)).find(it => it.name === 'CI pipeline');
    expect(listed).toMatchObject({ type: 'management' });
    expect(listed).not.toHaveProperty('token');
    await page.reload();
    await expect(tokens.row('CI pipeline')).toContainText('Management');
    await expect(page.getByText(value)).toHaveCount(0);
  });

  test('regenerating a token cuts off the old value; deleting removes it', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    const { id, token: oldValue } = await api.createToken(space.id, { name: 'Rotate me', type: 'public' });
    const cdn = (token: string) => request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`);
    const tokens = new TokensPage(page);

    // Pre-check
    await tokens.goto(space.id);
    await expect(tokens.row('Rotate me')).toBeVisible();
    expect((await cdn(oldValue)).status()).toBe(200);

    // Action: regenerate. Post-check: the same token (id), a new value; only the new one opens the CDN.
    await tokens.regenerate('Rotate me');
    const newValue = await tokenValue(api, space.id, 'Rotate me');
    expect(newValue).not.toBe(oldValue);
    expect((await tokensOf(api, space.id)).find(it => it.name === 'Rotate me')?.id).toBe(id);
    expect((await cdn(oldValue)).status()).toBe(401);
    expect((await cdn(newValue)).status()).toBe(200);

    // Action: delete. Post-check: gone from the list (also after a reload) and the API; its value no longer works.
    await tokens.delete('Rotate me');
    await expect(tokens.row('Rotate me')).toHaveCount(0);
    await page.reload();
    await expect(tokens.row('Auto Generated Preview Token')).toBeVisible();
    await expect(tokens.row('Rotate me')).toHaveCount(0);
    expect((await tokensOf(api, space.id)).map(it => it.name)).toEqual(['Auto Generated Preview Token']);
    expect((await cdn(newValue)).status()).toBe(401);
  });

  test('edits a token name and its Cache TTL, which sets the CDN redirect cache', async ({ page, api, space, request }) => {
    await api.createTranslation(space.id, { key: 'k1', locales: { en: 'v' } });
    await api.publishTranslations(space.id);
    const { token } = await api.createToken(space.id, { name: 'Website', type: 'public' });
    // The redirect to the current `cv`: its Cache-Control comes from the token.
    const redirectCache = async () => {
      const response = await request.get(`/api/v1/spaces/${space.id}/translations/en?token=${token}`, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      return response.headers()['cache-control'];
    };
    const tokens = new TokensPage(page);

    // Pre-check
    await tokens.goto(space.id);
    await expect(tokens.row('Website')).toContainText('Default (60s)');
    expect(await redirectCache()).toBe('public, max-age=60, s-maxage=60');

    // Action → post-check: a name and 300 s.
    await tokens.edit('Website', { name: 'Website EU', cacheTtl: '300' });
    await expect(tokens.row('Website EU')).toContainText('300s');
    expect(await redirectCache()).toBe('public, max-age=300, s-maxage=300');
    // The value is unchanged: only the name and the TTL can be edited.
    expect(await tokenValue(api, space.id, 'Website EU')).toBe(token);

    // Action → post-check: no cache.
    await tokens.edit('Website EU', { name: 'Website EU', cacheTtl: '0' });
    await expect(tokens.row('Website EU')).toContainText('No Cache');
    await expect.poll(redirectCache).toBe('no-cache');
    await page.reload();
    await expect(tokens.row('Website EU')).toContainText('No Cache');
  });
});

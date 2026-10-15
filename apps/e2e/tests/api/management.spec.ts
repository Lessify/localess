import { anonymousRequest, expect, test } from '../support/fixtures';

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

test.describe('Management API', () => {
  test('reads the space and pushes translations with a management token @smoke', async ({ api, space, playwright, baseURL }) => {
    const { token } = await api.createToken(space.id, { name: 'CI', type: 'management' });
    expect(token).toMatch(/^mgt_/);
    // No session cookie: the token alone authenticates.
    const client = await anonymousRequest(playwright, baseURL, bearer(token));
    const base = `/api/manage/v1/spaces/${space.id}`;

    const info = await client.get(base);
    expect(info.status()).toBe(200);
    expect(await info.json()).toMatchObject({ id: space.id, name: space.name });

    const push = await client.post(`${base}/translations/en`, {
      data: { type: 'add-missing', values: { 'cli.pushed': 'From the CLI' } },
    });
    expect(push.status(), await push.text()).toBe(200);

    const values = await client.get(`${base}/translations/en`);
    expect(await values.json()).toMatchObject({ 'cli.pushed': 'From the CLI' });
    await client.dispose();
  });

  test('refuses a missing, public or foreign token', async ({ api, space, playwright, baseURL }) => {
    const pub = (await api.createToken(space.id, { name: 'Public', type: 'public' })).token;
    const other = await api.createSpace('E2E other space');
    const foreign = (await api.createToken(other.id, { name: 'CI', type: 'management' })).token;
    const client = await anonymousRequest(playwright, baseURL);
    const url = `/api/manage/v1/spaces/${space.id}`;
    try {
      expect((await client.get(url)).status()).toBe(401);
      expect((await client.get(url, { headers: bearer(pub) })).status()).toBe(401);
      expect((await client.get(url, { headers: bearer(foreign) })).status()).toBe(401);
    } finally {
      await client.dispose();
      await api.deleteSpace(other.id);
    }
  });
});

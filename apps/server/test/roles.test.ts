import type { UserRole } from '@localess/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/**
 * One route per role list (`@localess/shared` roles.ts), tried by every role: who gets in and who gets 403. The other
 * suites test what each route does; this one that the lists are the ones the docs promise.
 */
describe('app API: roles', () => {
  let t: TestApp;
  const as: Partial<Record<UserRole | 'none', ReturnType<typeof api>>> = {};
  let base: string;
  let translationId: string;

  const ROLES: (UserRole | 'none')[] = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER', 'none'];

  beforeAll(async () => {
    t = await createTestApp();
    for (const role of ROLES) {
      as[role] = api(t, await userWithAccess(t, `${role.toLowerCase()}@example.com`, { role: role === 'none' ? null : role }));
    }
    const spaceId = (await as.ADMIN!.post('/api/app/spaces', { name: 'Roles' })).json().id;
    base = `/api/app/spaces/${spaceId}`;
    translationId = (await as.ADMIN!.post(`${base}/translations`, { key: 'hello', locales: { en: 'Hello' } })).json().id;
  });

  afterAll(() => t?.close());

  /** The roles that got past the role check (anything but 403) for `request`. */
  const allowed = async (request: (client: ReturnType<typeof api>, index: number) => Promise<{ statusCode: number }>) => {
    const passed: string[] = [];
    for (const [index, role] of ROLES.entries()) if ((await request(as[role]!, index)).statusCode !== 403) passed.push(role);
    return passed;
  };

  it('ANY_ROLE reads a space and what is in it; a user without a role, nothing', async () => {
    const readers = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER'];
    expect(await allowed(client => client.get(`${base}/contents`))).toEqual(readers);
    expect(await allowed(client => client.get(`${base}/translations`))).toEqual(readers);
    expect(await allowed(client => client.get(`${base}/schemas`))).toEqual(readers);
    expect(await allowed(client => client.get(`${base}/assets`))).toEqual(readers);
  });

  it('TRANSLATORS edit a translation value', async () => {
    expect(await allowed(client => client.put(`${base}/translations/${translationId}/locales/en`, { value: 'Hi' }))).toEqual([
      'ADMIN',
      'DEVELOPER',
      'EDITOR',
      'TRANSLATOR',
    ]);
  });

  it('CONTENT_WRITERS add translation keys and assets, and publish', async () => {
    const writers = ['ADMIN', 'DEVELOPER', 'EDITOR'];
    expect(await allowed((client, i) => client.post(`${base}/translations`, { key: `key-${i}`, locales: {} }))).toEqual(writers);
    expect(await allowed((client, i) => client.post(`${base}/assets/folders`, { name: `folder-${i}` }))).toEqual(writers);
    expect(await allowed(client => client.post(`${base}/translations/publish`))).toEqual(writers);
  });

  it('DEVELOPERS change schemas, Space Settings and tokens', async () => {
    const developers = ['ADMIN', 'DEVELOPER'];
    expect(await allowed((client, i) => client.post(`${base}/schemas`, { name: `schema${i}`, type: 'ROOT' }))).toEqual(developers);
    expect(await allowed(client => client.patch(base, { name: 'Roles' }))).toEqual(developers);
    expect(await allowed(client => client.get(`${base}/tokens`))).toEqual(developers);
    expect(await allowed(client => client.get(`${base}/webhooks`))).toEqual(developers);
  });

  it('ADMINS create spaces and manage users', async () => {
    expect(await allowed((client, i) => client.post('/api/app/spaces', { name: `Space ${i}` }))).toEqual(['ADMIN']);
    expect(await allowed(client => client.get('/api/app/users'))).toEqual(['ADMIN']);
  });
});

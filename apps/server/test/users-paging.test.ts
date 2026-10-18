import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { users } from '../src/infra/database/schema.js';
import { UsersService } from '../src/modules/users/services/users.service.js';
import { createTestApp, login, TestApp, XHR } from './test-app.js';

type Listed = { items: { email: string; role: string | null; disabled: boolean }[]; page: number; size: number; total: number };

describe('app API: users, one page at a time', () => {
  let t: TestApp;
  let cookie: string;
  const emails: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
    const service = t.app.get(UsersService);
    await service.create({ email: 'admin@example.com', password: 'secret1', role: 'ADMIN' });
    // 25 more: every third one an admin (roles tie), two disabled, two with display names to search.
    for (let i = 0; i < 25; i++) {
      const email = `user-${String(i).padStart(2, '0')}@example.com`;
      const displayName = i === 7 ? 'Alice Smith' : i === 12 ? 'Malice Jones' : undefined;
      await service.create({ email, password: 'secret1', role: i % 3 === 0 ? 'ADMIN' : 'CUSTOM', permissions: [], displayName });
      emails.push(email);
    }
    await t.db.update(users).set({ disabled: true }).where(inArray(users.email, ['user-03@example.com', 'user-04@example.com']));
    cookie = await login(t, 'admin@example.com', 'secret1');
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Listed> => {
    const response = await t.request({ method: 'GET', url: `/api/app/users${query}`, headers: { ...XHR, cookie } });
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const status = async (query: string) => (await t.request({ method: 'GET', url: `/api/app/users${query}`, headers: { ...XHR, cookie } })).statusCode;
  const all = () => ['admin@example.com', ...emails];

  it('answers the first 20 by email, with the total', async () => {
    const page = await list();
    expect(page).toMatchObject({ page: 0, size: 20, total: 26 });
    expect(page.items.map(it => it.email)).toEqual(all().slice(0, 20));
  });

  it('answers the rest on the next page, and nothing past the end with the real total', async () => {
    expect((await list('?page=1')).items.map(it => it.email)).toEqual(all().slice(20));
    expect(await list('?page=9')).toEqual({ items: [], page: 9, size: 20, total: 26 });
  });

  it('pages through tied sort values without repeating or skipping a user', async () => {
    const seen: string[] = [];
    for (let page = 0; page < 6; page++) seen.push(...(await list(`?size=5&page=${page}&sort=role&direction=desc`)).items.map(it => it.email));
    expect(seen).toHaveLength(26);
    expect(new Set(seen).size).toBe(26);
    const roles = (await list('?size=100&sort=role&direction=desc')).items.map(it => it.role);
    expect(roles).toEqual([...roles].sort().reverse());
  });

  it('searches email and display name, case-insensitive, anywhere in them', async () => {
    expect((await list('?search=ALICE')).items.map(it => it.email)).toEqual(['user-07@example.com', 'user-12@example.com']);
    expect((await list('?search=-2')).items.map(it => it.email)).toEqual(['user-20@example.com', 'user-21@example.com', 'user-22@example.com', 'user-23@example.com', 'user-24@example.com']);
    expect(await list('?search=ali&size=1')).toMatchObject({ total: 2 });
  });

  it('matches a search with LIKE wildcards literally', async () => {
    expect(await list('?search=%25')).toMatchObject({ items: [], total: 0 });
    expect(await list('?search=user_0')).toMatchObject({ items: [], total: 0 });
  });

  it('filters active or inactive users', async () => {
    expect((await list('?active=inactive')).items.map(it => it.email)).toEqual(['user-03@example.com', 'user-04@example.com']);
    expect(await list('?active=active')).toMatchObject({ total: 24 });
  });

  it('refuses a size outside 1…100, a bad page, an unknown sort field or direction, an unknown filter value', async () => {
    for (const query of ['?size=0', '?size=101', '?page=-1', '?sort=password', '?direction=up', '?active=maybe']) {
      expect(await status(query), query).toBe(400);
    }
  });

  it('keeps the disabled flag in what it lists', async () => {
    const [row] = await t.db.select().from(users).where(eq(users.email, 'user-03@example.com'));
    expect(row.disabled).toBe(true);
    expect((await list('?search=user-03')).items[0]).toMatchObject({ email: 'user-03@example.com', disabled: true });
  });
});

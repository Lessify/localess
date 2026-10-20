import type { APIRequestContext } from '@playwright/test';

import { CSRF } from '../support/app-api';
import { type AppRoute, appRoutes } from '../support/app-routes';
import { expect, test, type TestUser } from '../support/fixtures';

// Every App API route × every role, read from the server's `@RequireRole` (and the role lists of `@localess/shared`), so
// a new route is covered as soon as it exists. Requests use ids that match nothing: a let-through request answers
// 400 / 404 and changes no data; the guard answers before validation, so a refusal is always 403.
const ROLES = ['ADMIN', 'DEVELOPER', 'EDITOR', 'TRANSLATOR', 'VIEWER'] as const;

/** A UUID no row has. */
const NO_ID = '01890000-0000-7000-8000-000000000000';

function urlOf(route: AppRoute): string {
  return route.path.replace(/:(\w+)/g, (_, param: string) => (/^locale/.test(param) ? 'de' : NO_ID));
}

function call(client: APIRequestContext, route: AppRoute) {
  const url = urlOf(route);
  if (route.method === 'GET') return client.get(url);
  return client.fetch(url, { method: route.method, headers: CSRF, data: {} });
}

interface Principal {
  label: string;
  role: (typeof ROLES)[number] | null;
  client: APIRequestContext;
}

/** Whether the server should let this principal through (as `auth.guard.ts` decides): its role is in the route's list. */
function allowed(route: AppRoute, who: Principal): boolean {
  return who.role !== null && route.access.roles.includes(who.role);
}

async function inPool<T>(items: T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
    }),
  );
}

test.describe('App API role matrix', () => {
  test.setTimeout(120_000);

  test('the routes are read from the server and each names known roles, admins always among them', () => {
    const routes = appRoutes();
    expect(routes.length).toBeGreaterThan(80);
    for (const route of routes) {
      expect(route.access.roles.length, route.source).toBeGreaterThan(0);
      for (const role of route.access.roles) expect(ROLES, route.source).toContain(role);
      expect(route.access.roles, route.source).toContain('ADMIN');
    }
  });

  test('each route answers 401 without a session, 403 to a role it does not list, and lets the others through', async ({
    createUser,
    newClient,
  }) => {
    const routes = appRoutes();
    // One user per role, and one without a role.
    const specs: Omit<Principal, 'client'>[] = [...ROLES.map(role => ({ label: role, role })), { label: 'no role', role: null }];
    const principals: Principal[] = [];
    const anonymous = await newClient();
    await inPool(specs, 8, async spec => {
      const user: TestUser = await createUser({ role: spec.role });
      const client = await newClient();
      const login = await client.post('/api/auth/login', { headers: CSRF, data: { email: user.email, password: user.password } });
      expect(login.ok(), `sign in as ${spec.label}`).toBeTruthy();
      principals.push({ ...spec, client });
    });

    const wrong: string[] = [];
    await inPool(routes, 8, async route => {
      const name = `${route.method} ${route.path} (${route.source})`;
      const unauthenticated = await call(anonymous, route);
      if (unauthenticated.status() !== 401) wrong.push(`${name}: no session → ${unauthenticated.status()}, expected 401`);
      for (const who of principals) {
        const status = (await call(who.client, route)).status();
        const expectAllowed = allowed(route, who);
        if (expectAllowed && (status === 401 || status === 403)) wrong.push(`${name}: ${who.label} → ${status}, expected to pass`);
        // 501: a plugin that is not configured (Unsplash without a key).
        if (expectAllowed && status >= 500 && status !== 501)
          wrong.push(`${name}: ${who.label} → ${status} for an unknown id or an empty body`);
        if (!expectAllowed && status !== 403) wrong.push(`${name}: ${who.label} → ${status}, expected 403`);
      }
    });
    expect(wrong).toEqual([]);
  });
});

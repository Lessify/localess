import type { APIRequestContext } from '@playwright/test';

import { CSRF } from '../support/app-api';
import { type AppRoute, appRoutes } from '../support/app-routes';
import { expect, test, type TestUser } from '../support/fixtures';

// Every App API route × every permission, read from the server's access decorators (`@RequirePermission` and co.), so
// a new route is covered as soon as it exists. Requests use ids that match nothing: a let-through request answers
// 400 / 404 and changes no data; the guard answers before validation, so a refusal is always 403.
const PERMISSIONS = [
  'USER_MANAGEMENT',
  'SPACE_MANAGEMENT',
  'TRANSLATION_READ',
  'TRANSLATION_CREATE',
  'TRANSLATION_UPDATE',
  'TRANSLATION_DELETE',
  'TRANSLATION_PUBLISH',
  'TRANSLATION_EXPORT',
  'TRANSLATION_IMPORT',
  'SCHEMA_READ',
  'SCHEMA_CREATE',
  'SCHEMA_UPDATE',
  'SCHEMA_DELETE',
  'SCHEMA_EXPORT',
  'SCHEMA_IMPORT',
  'CONTENT_READ',
  'CONTENT_CREATE',
  'CONTENT_UPDATE',
  'CONTENT_DELETE',
  'CONTENT_PUBLISH',
  'CONTENT_EXPORT',
  'CONTENT_IMPORT',
  'ASSET_READ',
  'ASSET_CREATE',
  'ASSET_UPDATE',
  'ASSET_DELETE',
  'ASSET_EXPORT',
  'ASSET_IMPORT',
  'DEV_OPEN_API',
  'DEV_WEBHOOK',
];

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
  role: 'ADMIN' | 'CUSTOM' | null;
  permissions: string[];
  client: APIRequestContext;
}

/** Whether the server should let this principal through (as `auth.guard.ts` decides). */
function allowed(route: AppRoute, who: Principal): boolean {
  const { access } = route;
  if (who.role === 'ADMIN') return true;
  if (access.kind === 'admin') return false;
  if (who.role !== 'CUSTOM') return false;
  if (access.kind === 'anyRole') return true;
  if (access.kind === 'anyOf') return access.permissions.some(it => who.permissions.includes(it));
  return access.permissions.every(it => who.permissions.includes(it));
}

async function inPool<T>(items: T[], size: number, run: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
    }),
  );
}

test.describe('App API permission matrix', () => {
  test.setTimeout(120_000);

  test('the routes are read from the server and each declares a known permission', () => {
    const routes = appRoutes();
    expect(routes.length).toBeGreaterThan(80);
    for (const route of routes) {
      if (route.access.kind === 'anyOf' || route.access.kind === 'allOf') {
        expect(route.access.permissions.length, route.source).toBeGreaterThan(0);
        for (const permission of route.access.permissions) expect(PERMISSIONS, route.source).toContain(permission);
      }
    }
  });

  test('each route answers 401 without a session, 403 without its permission, and lets the others through', async ({
    createUser,
    newClient,
  }) => {
    const routes = appRoutes();
    // One user per permission, one holding both of translate's (the only "all of" route), no role, an admin.
    const specs: Omit<Principal, 'client'>[] = [
      ...PERMISSIONS.map(permission => ({ label: permission, role: 'CUSTOM' as const, permissions: [permission] })),
      { label: 'TRANSLATION_UPDATE + CONTENT_UPDATE', role: 'CUSTOM', permissions: ['TRANSLATION_UPDATE', 'CONTENT_UPDATE'] },
      { label: 'no role', role: null, permissions: [] },
      { label: 'admin', role: 'ADMIN', permissions: [] },
    ];
    const principals: Principal[] = [];
    const anonymous = await newClient();
    await inPool(specs, 8, async spec => {
      const user: TestUser = await createUser({ role: spec.role, permissions: spec.permissions });
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

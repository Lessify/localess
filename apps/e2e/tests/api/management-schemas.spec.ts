import type { APIRequestContext } from '@playwright/test';

import type { AppApi } from '../support/app-api';
import { anonymousRequest, expect, test } from '../support/fixtures';

// The CLI's schema pull / push and the OpenAPI document. Pre-check → action (Management API) → post-check (what the
// App API stores, what the next export returns).
interface SchemaExportDto {
  id: string;
  type: 'ROOT' | 'NODE' | 'ENUM';
  displayName?: string;
  fields?: { name: string; kind: string; displayName?: string; schemas?: string[] }[];
  [key: string]: unknown;
}

async function managementClient(api: AppApi, spaceId: string, playwright: Parameters<typeof anonymousRequest>[0], baseURL?: string) {
  const { token } = await api.createToken(spaceId, { name: 'CLI', type: 'management' });
  return anonymousRequest(playwright, baseURL, { Authorization: `Bearer ${token}` });
}

async function stored(
  api: AppApi,
  spaceId: string,
): Promise<Map<string, { name: string; displayName?: string; fields?: { name: string }[] }>> {
  const all = await api.get<{ name: string; displayName?: string; fields?: { name: string }[] }[]>(`/api/app/spaces/${spaceId}/schemas`);
  return new Map(all.map(it => [it.name, it]));
}

async function exported(client: APIRequestContext, spaceId: string): Promise<SchemaExportDto[]> {
  const response = await client.get(`/api/manage/v1/spaces/${spaceId}/schemas`);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  return response.json();
}

function push(client: APIRequestContext, spaceId: string, data: { type: 'upsert' | 'sync'; dryRun?: boolean; schemas: SchemaExportDto[] }) {
  return client.post(`/api/manage/v1/spaces/${spaceId}/schemas`, { data });
}

const page = (fields: SchemaExportDto['fields'] = [{ name: 'title', kind: 'TEXT', displayName: 'Title' }]): SchemaExportDto => ({
  id: 'page',
  type: 'ROOT',
  displayName: 'Page',
  fields,
});

test.describe('Management API → schemas', () => {
  test('exports the schemas by name, without row ids or timestamps', async ({ api, space, playwright, baseURL }) => {
    await api.createSchema(space.id, { name: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT' }] });
    await api.createSchema(space.id, { name: 'colors', type: 'ENUM' });
    const client = await managementClient(api, space.id, playwright, baseURL);
    try {
      const schemas = await exported(client, space.id);
      expect(schemas.map(it => it.id).sort()).toEqual(['colors', 'page']);
      const pageExport = schemas.find(it => it.id === 'page')!;
      expect(pageExport).toMatchObject({ type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT' }] });
      for (const key of ['name', 'createdAt', 'updatedAt']) expect(pageExport).not.toHaveProperty(key);
      expect(pageExport.id).not.toMatch(/^[0-9a-f-]{36}$/);
    } finally {
      await client.dispose();
    }
  });

  test('a dry run reports the plan and changes nothing; the push then creates and updates', async ({ api, space, playwright, baseURL }) => {
    await api.createSchema(space.id, { name: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT' }] });
    await api.createSchema(space.id, { name: 'footer', type: 'NODE', displayName: 'Footer' });
    const client = await managementClient(api, space.id, playwright, baseURL);
    try {
      const before = await exported(client, space.id);
      const footer = before.find(it => it.id === 'footer')!;
      const schemas = [
        page([
          { name: 'title', kind: 'TEXT' },
          { name: 'summary', kind: 'TEXTAREA' },
        ]),
        footer,
        { id: 'card', type: 'NODE', displayName: 'Card' } as SchemaExportDto,
      ];

      // Action 1: dry run. Post-check: counts and ids, nothing stored.
      const dry = await push(client, space.id, { type: 'upsert', dryRun: true, schemas });
      expect(dry.status(), await dry.text()).toBe(200);
      expect(await dry.json()).toMatchObject({
        dryRun: true,
        counts: { created: 1, updated: 1, deleted: 0, unchanged: 1 },
        ids: { created: ['card'], updated: ['page'], deleted: [] },
      });
      expect([...(await stored(api, space.id)).keys()].sort()).toEqual(['footer', 'page']);
      expect((await stored(api, space.id)).get('page')?.fields?.map(it => it.name)).toEqual(['title']);

      // Action 2: the push. Post-check: the App API and the next export.
      const real = await push(client, space.id, { type: 'upsert', schemas });
      expect(real.status(), await real.text()).toBe(200);
      expect(await real.json()).toMatchObject({ counts: { created: 1, updated: 1, deleted: 0, unchanged: 1 } });
      expect((await real.json()).dryRun).toBeUndefined();
      const after = await stored(api, space.id);
      expect([...after.keys()].sort()).toEqual(['card', 'footer', 'page']);
      expect(after.get('page')?.fields?.map(it => it.name)).toEqual(['title', 'summary']);
      expect((await exported(client, space.id)).find(it => it.id === 'card')).toMatchObject({ type: 'NODE', displayName: 'Card' });

      // The same push again changes nothing.
      expect(await (await push(client, space.id, { type: 'upsert', schemas })).json()).toMatchObject({
        counts: { created: 0, updated: 0, deleted: 0, unchanged: 3 },
      });
    } finally {
      await client.dispose();
    }
  });

  test('sync deletes the schemas the push leaves out, but not one that contents use', async ({ api, space, playwright, baseURL }) => {
    await api.createSchema(space.id, { name: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT' }] });
    await api.createSchema(space.id, { name: 'legacy', type: 'NODE' });
    await api.createSchema(space.id, { name: 'article', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] });
    await api.createDocument(space.id, { name: 'News', slug: 'news', schema: 'article' });
    const client = await managementClient(api, space.id, playwright, baseURL);
    try {
      // Action 1: sync without legacy and article. Post-check: refused (article is used), nothing deleted.
      const refused = await push(client, space.id, { type: 'sync', schemas: [page()] });
      expect(refused.status()).toBe(400);
      expect(await refused.json()).toMatchObject({
        status: 'FAILED_PRECONDITION',
        details: { errors: ["Cannot delete schema 'article': used by 1 content"] },
      });
      expect([...(await stored(api, space.id)).keys()].sort()).toEqual(['article', 'legacy', 'page']);

      // Action 2: keep article. Post-check: only legacy goes.
      const article = (await exported(client, space.id)).find(it => it.id === 'article')!;
      const synced = await push(client, space.id, { type: 'sync', schemas: [page(), article] });
      expect(synced.status(), await synced.text()).toBe(200);
      expect(await synced.json()).toMatchObject({ counts: { deleted: 1 }, ids: { deleted: ['legacy'] } });
      expect([...(await stored(api, space.id)).keys()].sort()).toEqual(['article', 'page']);
    } finally {
      await client.dispose();
    }
  });

  test('refuses an invalid push: a body that does not parse, a block field without schemas, a missing reference', async ({
    api,
    space,
    playwright,
    baseURL,
  }) => {
    const client = await managementClient(api, space.id, playwright, baseURL);
    try {
      expect((await client.post(`/api/manage/v1/spaces/${space.id}/schemas`, { data: { type: 'merge', schemas: [] } })).status()).toBe(400);
      const noBlocks = await push(client, space.id, { type: 'upsert', schemas: [page([{ name: 'body', kind: 'SCHEMAS', schemas: [] }])] });
      expect(noBlocks.status()).toBe(400);
      const missing = await push(client, space.id, {
        type: 'upsert',
        schemas: [page([{ name: 'body', kind: 'SCHEMAS', schemas: ['gone'] }])],
      });
      expect(missing.status()).toBe(400);
      expect(await missing.text()).toContain('gone');
      expect((await stored(api, space.id)).size).toBe(0);
    } finally {
      await client.dispose();
    }
  });

  test("the OpenAPI document describes the space's schemas", async ({ api, space, playwright, baseURL }) => {
    await api.createSchema(space.id, { name: 'card', type: 'NODE', fields: [{ name: 'heading', kind: 'TEXT' }] });
    await api.createSchema(space.id, {
      name: 'landing',
      type: 'ROOT',
      fields: [
        { name: 'title', kind: 'TEXT', required: true },
        { name: 'body', kind: 'SCHEMAS', schemas: ['card'] },
      ],
    });
    const client = await managementClient(api, space.id, playwright, baseURL);
    try {
      const response = await client.get(`/api/manage/v1/spaces/${space.id}/open-api`);
      expect(response.status()).toBe(200);
      const document = (await response.json()) as {
        openapi: string;
        components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
      };
      expect(document.openapi).toMatch(/^3\.0\./);
      expect(document.components.schemas).toHaveProperty('Landing');
      expect(document.components.schemas).toHaveProperty('Card');
      expect(Object.keys(document.components.schemas['Landing'].properties ?? {})).toEqual(expect.arrayContaining(['title', 'body']));
      expect(JSON.stringify(document.components.schemas['Landing'])).toContain('#/components/schemas/Card');
    } finally {
      await client.dispose();
    }
  });
});

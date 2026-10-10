import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashMigrationToken } from './utils/migration-token';

type Doc = { id: string; data: Record<string, unknown> };
let collections: Record<string, Doc[]>;
let config: Record<string, unknown> | undefined;
let MIGRATION: express.Router;
let firestoreService: { doc: (path: string) => unknown; collection: (path: string) => unknown };

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

/** A Firestore stand-in for the queries the router makes: doc get, collection orderBy/startAfter/limit/get. */
function fakeCollection(path: string) {
  const query = (startAfter?: string, limit?: number) => ({
    orderBy: () => query(startAfter, limit),
    startAfter: (id: string) => query(id, limit),
    limit: (n: number) => query(startAfter, n),
    get: async () => {
      const all = [...(collections[path] ?? [])].sort((a, b) => (a.id < b.id ? -1 : 1));
      const from = startAfter ? all.filter(it => it.id > startAfter) : all;
      const docs = (limit ? from.slice(0, limit) : from).map(it => ({ id: it.id, data: () => it.data }));
      return { docs, empty: docs.length === 0 };
    },
  });
  return query();
}

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const cfg = await import('./config');
  firestoreService = cfg.firestoreService as never;
  MIGRATION = (await import('./migration')).MIGRATION;
});

beforeEach(() => {
  vi.restoreAllMocks();
  config = { tokenHash: hashMigrationToken('secret') };
  collections = {
    spaces: [{ id: 's1', data: { name: 'Site', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' }, createdAt: ts('2025-01-01T00:00:00Z') } }],
    'spaces/s1/tokens': [{ id: 'TOKEN000000000000001', data: { name: 'web', createdAt: ts('2025-01-02T00:00:00Z') } }],
    'spaces/s1/webhooks': [],
    'spaces/s1/schemas': [{ id: 'page', data: { type: 'ROOT', fields: [] } }],
    'spaces/s1/translations': Array.from({ length: 501 }, (_, i) => ({ id: `k${String(i).padStart(4, '0')}`, data: { type: 'STRING', locales: { en: 'x' } } })),
    'spaces/s1/assets': [],
    'spaces/s1/contents': [{ id: 'c1', data: { kind: 'DOCUMENT', data: '{"_id":"r"}' } }],
  };
  vi.spyOn(firestoreService, 'doc').mockImplementation(((path: string) => ({
    get: async () => {
      if (path === 'configs/migration') return { exists: !!config, data: () => config };
      const [, id] = path.split('/');
      const found = collections['spaces'].find(it => it.id === id);
      return { exists: !!found, id, data: () => found?.data };
    },
  })) as never);
  vi.spyOn(firestoreService, 'collection').mockImplementation(((path: string) => fakeCollection(path)) as never);
});

const app = () => express().use(MIGRATION);
const get = (url: string, token: string | null = 'secret') => {
  const req = request(app()).get(url);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('migration API', () => {
  it('answers 404 everywhere while no token is configured', async () => {
    config = undefined;
    expect((await get('/api/migration/spaces')).status).toBe(404);
  });

  it('answers 401 without or with a wrong token', async () => {
    expect((await get('/api/migration/spaces', null)).status).toBe(401);
    expect((await get('/api/migration/spaces', 'wrong')).status).toBe(401);
  });

  it('lists spaces and returns one with ISO timestamps', async () => {
    expect((await get('/api/migration/spaces')).body).toEqual([{ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' }]);
    expect((await get('/api/migration/spaces/s1')).body).toMatchObject({ id: 's1', name: 'Site', createdAt: '2025-01-01T00:00:00.000Z' });
    expect((await get('/api/migration/spaces/nope')).status).toBe(404);
  });

  it('returns small collections whole, with ids', async () => {
    expect((await get('/api/migration/spaces/s1/tokens')).body).toEqual([{ id: 'TOKEN000000000000001', name: 'web', createdAt: '2025-01-02T00:00:00.000Z' }]);
    expect((await get('/api/migration/spaces/s1/schemas')).body).toEqual([{ id: 'page', type: 'ROOT', fields: [] }]);
    expect((await get('/api/migration/spaces/s1/webhooks')).body).toEqual([]);
  });

  it('pages large collections by 500, cursor = last id, null at the end', async () => {
    const first = (await get('/api/migration/spaces/s1/translations')).body;
    expect(first.items).toHaveLength(500);
    expect(first.cursor).toBe('k0499');
    const second = (await get('/api/migration/spaces/s1/translations?cursor=k0499')).body;
    expect(second.items.map((it: { id: string }) => it.id)).toEqual(['k0500']);
    expect(second.cursor).toBeNull();
  });

  it('returns contents as stored, data string included', async () => {
    expect((await get('/api/migration/spaces/s1/contents')).body).toEqual({ items: [{ id: 'c1', kind: 'DOCUMENT', data: '{"_id":"r"}' }], cursor: null });
  });
});

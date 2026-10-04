import type { Express } from 'express';
import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The `cv` redirects re-insert request values Express has already decoded. Against the real `CDN`
 * router, with Firestore and Storage spied on the real exported objects (see `cdn-assets.test.ts`
 * for why the module graph is imported dynamically).
 */
const TOKEN = 'aaaaaaaaaaaaaaaaaaaa';

let CDN: express.Router;
let bucket: { file: (path: string) => unknown };
let firestoreService: { doc: (path: string) => unknown };

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const config = await import('../config');
  bucket = config.bucket as never;
  firestoreService = config.firestoreService as never;
  CDN = (await import('./cdn')).CDN;
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(firestoreService, 'doc').mockImplementation(((path: string) => ({
    get: vi.fn().mockResolvedValue(
      path.includes('/tokens/')
        ? // A legacy TokenV1 implicitly grants published translation and content reads.
          { exists: true, id: TOKEN, data: () => ({ name: 'token' }) }
        : { exists: true, id: 's1', data: () => ({ locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } }) },
    ),
  })) as never);
  vi.spyOn(bucket, 'file').mockReturnValue({ getMetadata: vi.fn().mockResolvedValue([{ generation: '42' }]) } as never);
});

function app(): Express {
  // eslint-disable-next-line new-cap
  const instance = express();
  instance.use(CDN);
  return instance;
}

describe('cv redirects', () => {
  it('keeps a decoded value that contains & and = inside its own parameter', async () => {
    const res = await request(app()).get(`/api/v1/spaces/s1/translations/en?token=${TOKEN}&version=x%26token%3Dinjected`);

    expect(res.status).toBe(302);
    const location = new URL(res.headers['location'], 'https://cms.example.com');
    expect(location.searchParams.getAll('token')).toEqual([TOKEN]);
    expect(location.searchParams.get('version')).toBe('x&token=injected');
  });

  it('leaves ordinary values unchanged', async () => {
    const res = await request(app()).get(`/api/v1/spaces/s1/translations/en?token=${TOKEN}`);

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe(`/api/v1/spaces/s1/translations/en?cv=42&token=${TOKEN}`);
  });
});

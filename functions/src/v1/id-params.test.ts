import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Malformed IDs must be refused by `validateIdParams` before any handler, permission check or path
 * builder runs — in particular `X%2Fdraft`, which Express decodes to `X/draft` and which would
 * otherwise read the unpublished draft file under a public token. The routers are the real ones;
 * none of these requests may reach Firestore or Storage, so nothing is stubbed.
 */
let app: express.Express;

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const { CDN } = await import('./cdn');
  const { DEV_TOOLS } = await import('./dev-tools');
  const { MANAGE } = await import('./manage');
  app = express();
  app.use(express.json());
  app.use('/', CDN);
  app.use('/', DEV_TOOLS);
  app.use('/', MANAGE);
});

describe('v1 route id validation', () => {
  it.each([
    ['content id with an encoded slash (draft path)', '/api/v1/spaces/S1/contents/X%2Fdraft?locale=en&cv=1&token=aaaaaaaaaaaaaaaaaaaa'],
    ['content id containing a dot', '/api/v1/spaces/S1/contents/a.json?cv=1'],
    ['space id with an encoded slash', '/api/v1/spaces/S1%2Fcontents%2FX/contents/C1'],
    ['asset id with an encoded slash', '/api/v1/spaces/S1/assets/A1%2Fx'],
    ['asset id on /original', '/api/v1/spaces/S1/assets/A1%2Fx/original'],
    ['space id on the translations route', '/api/v1/spaces/S1%2Fx/translations/en'],
    ['space id on the dev-tools route', '/api/v1/spaces/S1%2Fx'],
    ['space id on the translation values route', '/api/v1/spaces/S1%2Fx/translations/en/values'],
  ])('rejects a %s with 400', async (_name, url) => {
    const res = await request(app).get(url);

    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('public, max-age=3600, s-maxage=3600');
  });

  it('rejects a malformed space id on the manage router', async () => {
    const res = await request(app).post('/api/v1/spaces/S1%2Fx/translations/en').set('X-API-KEY', 'aaaaaaaaaaaaaaaaaaaa').send({});

    expect(res.status).toBe(400);
  });

  it('lets a well-formed id through to the permission check', async () => {
    // No token: the request passes id validation and is stopped by auth instead.
    const res = await request(app).get('/api/v1/spaces/S1/contents/C1');

    expect(res.status).toBe(401);
  });
});

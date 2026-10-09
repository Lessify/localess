import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.factory.js';
import { loadConfig } from '../src/infra/config/config.js';
import { createTestDatabase, TestDatabase } from './database.js';

describe('HTTP app', () => {
  let db: TestDatabase;
  let staticDir: string;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    db = await createTestDatabase();
    staticDir = await mkdtemp(join(tmpdir(), 'localess-static-'));
    await writeFile(join(staticDir, 'index.html'), '<html><body>localess</body></html>');
    await writeFile(join(staticDir, 'main-ABCDEF12.js'), 'console.log(1)');
    await writeFile(join(staticDir, 'ngsw-worker.js'), '// sw');
    await writeFile(join(staticDir, 'favicon.ico'), 'icon');

    app = await createApp(loadConfig({ DATABASE_URL: db.url, LOCALESS_STATIC_DIR: staticDir, LOCALESS_LOG_LEVEL: 'error' }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    await db?.drop();
    await rm(staticDir, { recursive: true, force: true });
  });

  const get = (url: string, method: 'GET' | 'POST' | 'HEAD' = 'GET') => app.getHttpAdapter().getInstance().inject({ method, url });

  it('migrates the database on boot', async () => {
    const response = await get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('serves index.html at the root with no-cache and security headers', async () => {
    const response = await get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('localess');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy-report-only']).toContain("default-src 'self'");
  });

  it('falls back to index.html for client-side routes', async () => {
    const response = await get('/features/spaces/abc/contents');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('localess');
  });

  it('serves hashed bundles as immutable and the service worker as no-cache', async () => {
    const bundle = await get('/main-ABCDEF12.js');
    expect(bundle.statusCode).toBe(200);
    expect(bundle.headers['cache-control']).toBe('public,max-age=31536000,immutable');

    const worker = await get('/ngsw-worker.js');
    expect(worker.headers['cache-control']).toBe('no-cache');

    const plain = await get('/favicon.ico');
    expect(plain.statusCode).toBe(200);
    expect(plain.headers['cache-control']).toBeUndefined();
  });

  it('keeps JSON 404s for unknown API routes, without SPA security headers', async () => {
    const response = await get('/api/v1/does-not-exist');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ statusCode: 404 });
    expect(response.headers['content-security-policy-report-only']).toBeUndefined();
  });

  it('does not answer non-GET client routes with index.html', async () => {
    const response = await get('/features', 'POST');
    expect(response.statusCode).toBe(404);
  });
});

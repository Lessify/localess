import { randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemas, spaces, taskLogs, tokens, webhookLogs } from '../src/database/schema.js';
import { api, createTestApp, TestApp, userWithAccess, XHR } from './test-app.js';

function multipart(fields: Record<string, string>, file: { filename: string; bytes: Buffer }) {
  const boundary = `----localess${randomBytes(8).toString('hex')}`;
  const parts: Buffer[] = Object.entries(fields).map(([name, value]) =>
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`),
  );
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    file.bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { payload: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Polls until `check` passes (events travel through LISTEN/NOTIFY, so effects are asynchronous). */
async function eventually(check: () => Promise<void>, timeoutMs = 3000): Promise<void> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() > until) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

describe('app API: tokens, webhooks, tasks, OpenAPI', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let exporter: ReturnType<typeof api>;
  let exporterCookie: string;
  let nobody: ReturnType<typeof api>;

  beforeAll(async () => {
    t = await createTestApp();
    await t.db
      .insert(spaces)
      .values({ id: 's1', name: 'S', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' } });
    await t.db.insert(schemas).values({ spaceId: 's1', id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'custom', permissions: ['SPACE_MANAGEMENT'] }));
    exporterCookie = await userWithAccess(t, 'exporter@example.com', {
      role: 'custom',
      permissions: ['CONTENT_EXPORT', 'CONTENT_IMPORT', 'DEV_OPEN_API'],
    });
    exporter = api(t, exporterCookie);
    nobody = api(t, await userWithAccess(t, 'nobody@example.com', { role: 'custom', permissions: ['CONTENT_READ'] }));
  });

  afterAll(() => t?.close());

  describe('tokens', () => {
    const base = '/api/app/spaces/s1/tokens';

    it('creates V2 tokens with 20-character secret ids, for SPACE_MANAGEMENT only', async () => {
      const response = await manager.post(base, { name: 'Website', permissions: ['CONTENT_PUBLIC'], cacheTtl: 120 });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        id: expect.stringMatching(/^[A-Za-z0-9]{20}$/),
        version: 2,
        name: 'Website',
        permissions: ['CONTENT_PUBLIC'],
        cacheTtl: 120,
      });
      expect((await nobody.get(base)).statusCode).toBe(403);
      expect((await manager.post(base, { name: 'Bad', permissions: ['EVERYTHING'] })).statusCode).toBe(400);
    });

    it('filters by permission', async () => {
      await manager.post(base, { name: 'CLI', permissions: ['DEV_TOOLS'] });
      expect((await manager.get(`${base}?permission=DEV_TOOLS&limit=1`)).json().map((it: { name: string }) => it.name)).toEqual(['CLI']);
      expect((await manager.get(base)).json()).toHaveLength(2);
    });

    it('regenerates a V1 token as V2 with its implicit permissions, under a new secret', async () => {
      await t.db.insert(tokens).values({ id: 'VVVVVVVVVVVVVVVVVVVV', spaceId: 's1', name: 'Legacy' });
      const response = await manager.post(`${base}/VVVVVVVVVVVVVVVVVVVV/regenerate`);
      expect(response.json()).toMatchObject({
        version: 2,
        name: 'Legacy',
        permissions: ['TRANSLATION_PUBLIC', 'TRANSLATION_DRAFT', 'CONTENT_PUBLIC', 'CONTENT_DRAFT'],
      });
      expect(response.json().id).not.toBe('VVVVVVVVVVVVVVVVVVVV');
      expect((await manager.get(`${base}/VVVVVVVVVVVVVVVVVVVV`)).statusCode).toBe(404);
    });

    it('revokes a token for the public API immediately, despite its 5-minute cache', async () => {
      const token = (await manager.post(base, { name: 'Short-lived', permissions: ['CONTENT_PUBLIC'] })).json();
      const read = () => t.request({ method: 'GET', url: `/api/v1/spaces/s1/links?token=${token.id}` });
      expect((await read()).statusCode).toBe(302); // now cached
      expect((await manager.delete(`${base}/${token.id}`)).statusCode).toBe(204);
      await eventually(async () => expect((await read()).statusCode).toBe(401));
    });

    it('applies permission edits immediately too', async () => {
      const token = (await manager.post(base, { name: 'Editable', permissions: ['CONTENT_PUBLIC'] })).json();
      const read = () => t.request({ method: 'GET', url: `/api/v1/spaces/s1/links?token=${token.id}` });
      expect((await read()).statusCode).toBe(302);
      await manager.put(`${base}/${token.id}`, { name: 'Editable', permissions: ['TRANSLATION_PUBLIC'] });
      await eventually(async () => expect((await read()).statusCode).toBe(403));
    });
  });

  describe('webhooks', () => {
    const base = '/api/app/spaces/s1/webhooks';
    let hook: { id: string };

    it('creates enabled webhooks, accepting https and local http only', async () => {
      expect((await manager.post(base, { name: 'Bad', url: 'http://example.com/hook', events: ['content.published'] })).statusCode).toBe(
        400,
      );
      expect((await manager.post(base, { name: 'Bad', url: 'https://example.com/hook', events: ['content.exploded'] })).statusCode).toBe(
        400,
      );
      expect((await manager.post(base, { name: 'Local', url: 'http://localhost:4000/hook', events: ['content.changed'] })).statusCode).toBe(
        201,
      );
      hook = (
        await manager.post(base, {
          name: 'Site',
          url: 'https://example.com/hook',
          events: ['content.published'],
          secret: 's3cret',
          headers: { 'X-Site': 'a' },
        })
      ).json();
      expect(hook).toMatchObject({ enabled: true, secret: 's3cret', headers: { 'X-Site': 'a' } });
    });

    it('keeps the secret and headers when an update leaves them out', async () => {
      const updated = (
        await manager.put(`${base}/${hook.id}`, {
          name: 'Site 2',
          url: 'https://example.com/v2',
          events: ['content.published', 'content.unpublished'],
        })
      ).json();
      expect(updated).toMatchObject({
        name: 'Site 2',
        secret: 's3cret',
        headers: { 'X-Site': 'a' },
        events: ['content.published', 'content.unpublished'],
      });
    });

    it('enables and disables, and lists newest logs first', async () => {
      expect((await manager.patch(`${base}/${hook.id}/status`, { enabled: false })).json().enabled).toBe(false);
      const log = {
        webhookId: hook.id,
        event: 'content.published',
        url: 'https://example.com/v2',
        status: 'success',
        requestSize: 10,
        data: {},
        deliveryId: 'd',
        duration: 5,
      };
      await t.db.insert(webhookLogs).values([
        { ...log, deliveryId: 'old', createdAt: new Date('2026-01-01') },
        { ...log, deliveryId: 'new', createdAt: new Date('2026-02-01') },
      ]);
      const logs = (await manager.get(`${base}/${hook.id}/logs?limit=1`)).json();
      expect(logs).toEqual([expect.objectContaining({ deliveryId: 'new', id: expect.any(String) })]);
      expect(logs[0]).not.toHaveProperty('webhookId');
    });

    it('lists by name and deletes with logs, for SPACE_MANAGEMENT only', async () => {
      expect((await manager.get(base)).json().map((it: { name: string }) => it.name)).toEqual(['Local', 'Site 2']);
      expect((await nobody.get(base)).statusCode).toBe(403);
      expect((await manager.delete(`${base}/${hook.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(webhookLogs)).toEqual([]);
    });
  });

  describe('tasks', () => {
    const base = '/api/app/spaces/s1/tasks';

    it('creates exports for the permission the kind names', async () => {
      const response = await exporter.post(base, { kind: 'CONTENT_EXPORT', path: 'blog' });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ kind: 'CONTENT_EXPORT', status: 'INITIATED', path: 'blog' });
      expect(response.json()).not.toHaveProperty('lockedBy');
      expect((await exporter.post(base, { kind: 'ASSET_EXPORT' })).statusCode).toBe(403);
      expect((await nobody.post(base, { kind: 'CONTENT_EXPORT' })).statusCode).toBe(403);
    });

    it('keeps metadata regeneration admin-only', async () => {
      expect((await exporter.post(base, { kind: 'ASSET_REGEN_METADATA' })).statusCode).toBe(403);
      expect((await admin.post(base, { kind: 'ASSET_REGEN_METADATA' })).statusCode).toBe(201);
    });

    it('stores an import upload as the task file, downloadable with the session', async () => {
      const zip = Buffer.from('PK\u0003\u0004 fake zip');
      const body = multipart({ kind: 'CONTENT_IMPORT' }, { filename: 'content.llc.zip', bytes: zip });
      const response = await t.request({
        method: 'POST',
        url: `${base}/import`,
        headers: { ...XHR, cookie: exporterCookie, 'content-type': body.contentType },
        payload: body.payload,
      });
      expect(response.statusCode, response.body).toBe(201);
      const task = response.json();
      expect(task).toMatchObject({ kind: 'CONTENT_IMPORT', status: 'INITIATED', file: { name: 'content.llc.zip', size: zip.length } });

      const download = await exporter.get(`${base}/${task.id}/download`);
      expect(download.statusCode).toBe(200);
      expect(download.headers['content-disposition']).toContain('attachment');
      expect(download.rawPayload.equals(zip)).toBe(true);

      const forbidden = multipart({ kind: 'SCHEMA_IMPORT' }, { filename: 's.zip', bytes: zip });
      expect(
        (
          await t.request({
            method: 'POST',
            url: `${base}/import`,
            headers: { ...XHR, cookie: exporterCookie, 'content-type': forbidden.contentType },
            payload: forbidden.payload,
          })
        ).statusCode,
      ).toBe(403);
    });

    it('lists newest first, with logs in order', async () => {
      const list = (await exporter.get(base)).json();
      expect(list.map((it: { kind: string }) => it.kind)).toEqual(['CONTENT_IMPORT', 'ASSET_REGEN_METADATA', 'CONTENT_EXPORT']);
      await t.db.insert(taskLogs).values([
        { taskId: list[0].id, level: 'INFO', message: 'first' },
        { taskId: list[0].id, level: 'INFO', message: 'second' },
      ]);
      expect((await exporter.get(`${base}/${list[0].id}/logs`)).json().map((it: { message: string }) => it.message)).toEqual([
        'first',
        'second',
      ]);
      expect((await exporter.get(`${base}/${list[2].id}/download`)).statusCode).toBe(404);
    });

    it('deletes with the kind permission, removing logs and files', async () => {
      const list = (await exporter.get(base)).json();
      const imported = list.find((it: { kind: string }) => it.kind === 'CONTENT_IMPORT');
      const regen = list.find((it: { kind: string }) => it.kind === 'ASSET_REGEN_METADATA');
      expect((await exporter.delete(`${base}/${regen.id}`)).statusCode).toBe(403);
      expect((await exporter.delete(`${base}/${imported.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(taskLogs)).toEqual([]);
      expect(await readdir(join(t.storageDir, 'spaces/s1/tasks'))).toEqual([]);
    });
  });

  describe('OpenAPI', () => {
    it('generates the document for DEV_OPEN_API', async () => {
      const response = await exporter.post('/api/app/spaces/s1/open-api');
      expect(response.statusCode).toBe(200);
      expect(response.json().openapi).toMatch(/^3\./);
      expect((await nobody.post('/api/app/spaces/s1/open-api')).statusCode).toBe(403);
    });
  });
});

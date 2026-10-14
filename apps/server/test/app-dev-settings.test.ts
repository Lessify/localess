import { SchemaFieldKind, TokenType } from '@localess/shared';
import { eq } from 'drizzle-orm';
import { newApiToken } from '../src/shared/utils/api-token-format.js';
import { tokenRow } from './seed.js';
import { randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { schemas, taskLogs, tokens, webhookLogs } from '../src/infra/database/schema.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess, XHR } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';
import { WebhookLogCleanupService } from '../src/modules/webhooks/services/webhook-log-cleanup.service.js';

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
    // These pin the API; task processing has its own tests (test/tasks.test.ts).
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    await insertSpace(t.db, { id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
    await t.db.insert(schemas).values({ id: newUuid(), spaceId: S1, name: 'page', type: 'ROOT', fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'CUSTOM', permissions: ['SPACE_MANAGEMENT'] }));
    exporterCookie = await userWithAccess(t, 'exporter@example.com', {
      role: 'CUSTOM',
      permissions: ['CONTENT_EXPORT', 'CONTENT_IMPORT', 'DEV_OPEN_API'],
    });
    exporter = api(t, exporterCookie);
    nobody = api(t, await userWithAccess(t, 'nobody@example.com', { role: 'CUSTOM', permissions: ['CONTENT_READ'] }));
  });

  afterAll(() => t?.close());

  describe('tokens', () => {
    const base = `/api/app/spaces/${S1}/tokens`;
    const cdn = (value: string) => t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/links?token=${value}` });

    it('creates typed tokens with a UUIDv7 id and a prefixed value, for SPACE_MANAGEMENT only', async () => {
      const response = await manager.post(base, { name: 'Website', type: 'public', cacheTtl: 120 });
      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toMatchObject({ id: expect.stringMatching(UUID_V7), type: 'public', name: 'Website', cacheTtl: 120 });
      expect(body.token).toMatch(/^pub_[A-Za-z0-9]{38}$/);
      expect(body.hint).toBe(`pub_…${body.token.slice(-4)}`);
      expect(body).not.toHaveProperty('tokenHash');
      expect((await nobody.get(base)).statusCode).toBe(403);
      expect((await manager.post(base, { name: 'Bad', type: 'everything' })).statusCode).toBe(400);
      expect((await manager.post(base, { name: 'Bad', permissions: ['CONTENT_PUBLIC'] })).statusCode).toBe(400);
    });

    it('shows a management token once: in the create response, never in list or get', async () => {
      const created = (await manager.post(base, { name: 'CI', type: 'management' })).json();
      expect(created.token).toMatch(/^mgt_[A-Za-z0-9]{38}$/);
      expect(created.hint).toBe(`mgt_…${created.token.slice(-4)}`);
      const listed = (await manager.get(base)).json().find((it: { id: string }) => it.id === created.id);
      expect(listed).not.toHaveProperty('token');
      expect(listed.hint).toBe(created.hint);
      expect((await manager.get(`${base}/${created.id}`)).json()).not.toHaveProperty('token');
      const [row] = await t.db.select().from(tokens).where(eq(tokens.id, created.id));
      expect(row.token).toBeNull();
      expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('refuses a cache TTL on a management token', async () => {
      expect((await manager.post(base, { name: 'CI', type: 'management', cacheTtl: 10 })).statusCode).toBe(400);
      const created = (await manager.post(base, { name: 'CI2', type: 'management' })).json();
      expect((await manager.put(`${base}/${created.id}`, { name: 'CI2', cacheTtl: 10 })).statusCode).toBe(400);
    });

    it('filters by type', async () => {
      expect((await manager.get(`${base}?type=management&limit=1`)).json().map((it: { type: string }) => it.type)).toEqual(['management']);
      expect((await manager.get(`${base}?type=public`)).json().every((it: { type: string }) => it.type === 'public')).toBe(true);
      expect((await manager.get(`${base}?type=DEV_TOOLS`)).statusCode).toBe(400);
    });

    it('keeps the type on edit: PUT takes a name and a cache TTL only', async () => {
      const created = (await manager.post(base, { name: 'Site', type: 'public' })).json();
      expect((await manager.put(`${base}/${created.id}`, { name: 'Site', type: 'preview' })).statusCode).toBe(400);
      const updated = await manager.put(`${base}/${created.id}`, { name: 'Renamed', cacheTtl: 5 });
      expect(updated.json()).toMatchObject({ id: created.id, type: 'public', name: 'Renamed', cacheTtl: 5 });
    });

    it('regenerates under a new value of the same type; the old value stops working at once', async () => {
      const created = (await manager.post(base, { name: 'Legacy', type: 'public' })).json();
      expect((await cdn(created.token)).statusCode).toBe(302); // now cached
      const response = await manager.post(`${base}/${created.id}/regenerate`);
      expect(response.json()).toMatchObject({ id: created.id, name: 'Legacy', type: 'public' });
      expect(response.json().token).toMatch(/^pub_/);
      expect(response.json().token).not.toBe(created.token);
      await eventually(async () => expect((await cdn(created.token)).statusCode).toBe(401));
      expect((await cdn(response.json().token)).statusCode).toBe(302);
    });

    it('returns a regenerated management value once', async () => {
      const created = (await manager.post(base, { name: 'CI3', type: 'management' })).json();
      const regenerated = (await manager.post(`${base}/${created.id}/regenerate`)).json();
      expect(regenerated.token).toMatch(/^mgt_/);
      expect(regenerated.token).not.toBe(created.token);
      expect((await manager.get(`${base}/${created.id}`)).json()).not.toHaveProperty('token');
    });

    it('answers 404 for an id that is not a UUID, such as a token value', async () => {
      const value = (await manager.post(base, { name: 'X', type: 'public' })).json().token;
      expect((await manager.get(`${base}/${value}`)).statusCode).toBe(404);
      expect((await manager.post(`${base}/${value}/regenerate`)).statusCode).toBe(404);
      expect((await manager.get(`${base}/${newUuid()}`)).statusCode).toBe(404);
    });

    it('revokes a token for the CDN immediately, despite its 5-minute cache', async () => {
      const token = (await manager.post(base, { name: 'Short-lived', type: 'public' })).json();
      expect((await cdn(token.token)).statusCode).toBe(302); // now cached
      expect((await manager.delete(`${base}/${token.id}`)).statusCode).toBe(204);
      await eventually(async () => expect((await cdn(token.token)).statusCode).toBe(401));
    });

    it('enforces token rules in the database', async () => {
      const value = newApiToken(TokenType.MANAGEMENT);
      const insert = (row: object) => t.db.insert(tokens).values({ ...tokenRow(S1, TokenType.MANAGEMENT, value, 'x'), ...row });
      const violates = (constraint: string) => ({ cause: expect.objectContaining({ constraint }) });
      await expect(insert({ token: value })).rejects.toMatchObject(violates('tokens_token_check'));
      await expect(insert({ cacheTtl: 5 })).rejects.toMatchObject(violates('tokens_cache_ttl_check'));
      await expect(insert({ type: 'public', token: null })).rejects.toMatchObject(violates('tokens_token_check'));
      await insert({});
      await expect(insert({ id: newUuid() })).rejects.toMatchObject(violates('tokens_token_hash_unique'));
    });
  });

  describe('webhooks', () => {
    const base = `/api/app/spaces/${S1}/webhooks`;
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
        event: 'content.published' as const,
        url: 'https://example.com/v2',
        status: 'SUCCESS' as const,
        requestSize: 10,
        data: {},
        deliveryId: 'd',
        duration: 5,
      };
      await t.db.insert(webhookLogs).values([
        { ...log, id: newUuid(), deliveryId: 'old', createdAt: new Date('2026-01-01') },
        { ...log, id: newUuid(), deliveryId: 'new', createdAt: new Date('2026-02-01') },
      ]);
      const logs = (await manager.get(`${base}/${hook.id}/logs?limit=1`)).json();
      expect(logs).toEqual([expect.objectContaining({ deliveryId: 'new', id: expect.stringMatching(UUID_V7) })]);
      expect((await manager.get(`${base}/not-a-uuid/logs`)).statusCode).toBe(404);
      expect(logs[0]).not.toHaveProperty('webhookId');
    });

    it('lists at most 100 logs unless asked for more, and deletes those older than the retention', async () => {
      const log = { webhookId: hook.id, event: 'content.published' as const, url: 'https://example.com/v2', status: 'SUCCESS' as const, requestSize: 10, data: {}, duration: 5 };
      const day = 24 * 60 * 60 * 1000;
      await t.db.insert(webhookLogs).values(
        Array.from({ length: 101 }, (_, index) => ({ ...log, id: newUuid(), deliveryId: `bulk-${index}`, createdAt: new Date(Date.now() - day) })),
      );
      await t.db.insert(webhookLogs).values({ ...log, id: newUuid(), deliveryId: 'stale', createdAt: new Date(Date.now() - 31 * day) });
      expect((await manager.get(`${base}/${hook.id}/logs`)).json()).toHaveLength(100);
      expect((await manager.get(`${base}/${hook.id}/logs?limit=500`)).json().length).toBeGreaterThan(101);

      await t.app.get(WebhookLogCleanupService).cleanup();
      const kept = (await manager.get(`${base}/${hook.id}/logs?limit=1000`)).json().map((it: { deliveryId: string }) => it.deliveryId);
      expect(kept).not.toContain('stale');
      expect(kept).toContain('bulk-0');
    });

    it('lists by name and deletes with logs, for SPACE_MANAGEMENT only', async () => {
      expect((await manager.get(base)).json().map((it: { name: string }) => it.name)).toEqual(['Local', 'Site 2']);
      expect((await nobody.get(base)).statusCode).toBe(403);
      expect((await manager.delete(`${base}/${hook.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(webhookLogs)).toEqual([]);
    });
  });

  describe('tasks', () => {
    const base = `/api/app/spaces/${S1}/tasks`;

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
        { id: newUuid(), taskId: list[0].id, level: 'INFO', message: 'first' },
        { id: newUuid(), taskId: list[0].id, level: 'INFO', message: 'second' },
      ]);
      expect((await exporter.get(`${base}/${list[0].id}/logs`)).json().map((it: { message: string }) => it.message)).toEqual([
        'first',
        'second',
      ]);
      expect(list[0].id).toMatch(UUID_V7);
      for (const log of (await exporter.get(`${base}/${list[0].id}/logs`)).json()) expect(log.id).toMatch(UUID_V7);
      expect((await exporter.get(`${base}/not-a-uuid/logs`)).statusCode).toBe(404);
      expect((await exporter.get(`${base}/${list[2].id}/download`)).statusCode).toBe(404);
    });

    it('deletes with the kind permission, removing logs and files', async () => {
      const list = (await exporter.get(base)).json();
      const imported = list.find((it: { kind: string }) => it.kind === 'CONTENT_IMPORT');
      const regen = list.find((it: { kind: string }) => it.kind === 'ASSET_REGEN_METADATA');
      expect((await exporter.delete(`${base}/${regen.id}`)).statusCode).toBe(403);
      expect((await exporter.delete(`${base}/${imported.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(taskLogs)).toEqual([]);
      expect(await readdir(join(t.storageDir, `spaces/${S1}/tasks`))).toEqual([]);
    });
  });

  describe('OpenAPI', () => {
    it('generates the document for DEV_OPEN_API', async () => {
      const response = await exporter.post(`/api/app/spaces/${S1}/open-api`);
      expect(response.statusCode).toBe(200);
      expect(response.json().openapi).toMatch(/^3\./);
      expect((await nobody.post(`/api/app/spaces/${S1}/open-api`)).statusCode).toBe(403);
    });
  });
});

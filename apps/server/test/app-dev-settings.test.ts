import { randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { SchemaFieldKind, TokenType } from '@localess/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { schemas, taskLogs, tokens, webhookLogs, webhooks } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { WebhookLogCleanupService } from '../src/modules/webhooks/services/webhook-log-cleanup.service.js';
import { newApiToken } from '../src/shared/utils/api-token-format.js';
import { S1, S2, UUID_V7 } from './ids.js';
import { tokenRow } from './seed.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess, XHR } from './test-app.js';

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
    await t.db
      .insert(schemas)
      .values({ id: newUuid(), spaceId: S1, name: 'page', type: 'ROOT', fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
    // An editor: content tasks, not schema tasks (a developer's).
    exporterCookie = await userWithAccess(t, 'exporter@example.com', {
      role: 'EDITOR',
    });
    exporter = api(t, exporterCookie);
    nobody = api(t, await userWithAccess(t, 'nobody@example.com', { role: 'VIEWER' }));
  });

  afterAll(() => t?.close());

  describe('tokens', () => {
    const base = `/api/app/spaces/${S1}/tokens`;
    const cdn = (value: string) => t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/links?token=${value}` });

    it('creates typed tokens with a UUIDv7 id and a prefixed value, for developers only', async () => {
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
      const listed = (await manager.get(base)).json().items.find((it: { id: string }) => it.id === created.id);
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
      expect((await manager.get(`${base}?type=management&size=1`)).json().items.map((it: { type: string }) => it.type)).toEqual([
        'management',
      ]);
      expect((await manager.get(`${base}?type=public`)).json().items.every((it: { type: string }) => it.type === 'public')).toBe(true);
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
    const headersOf = async (id: string) =>
      (await t.db.select({ headers: webhooks.headers }).from(webhooks).where(eq(webhooks.id, id)))[0].headers;
    const secretOf = async (id: string) =>
      (await t.db.select({ secret: webhooks.secret }).from(webhooks).where(eq(webhooks.id, id)))[0].secret;

    it('creates enabled webhooks, refusing a URL delivery would refuse', async () => {
      expect((await manager.post(base, { name: 'Bad', url: 'http://example.com/hook', events: ['content.published'] })).statusCode).toBe(
        400,
      );
      expect((await manager.post(base, { name: 'Bad', url: 'https://example.com/hook', events: ['content.exploded'] })).statusCode).toBe(
        400,
      );
      // Local http only with LOCALESS_WEBHOOK_ALLOW_INTERNAL (off here): the same rule as delivery, said when saving.
      const local = await manager.post(base, { name: 'Local', url: 'http://localhost:4000/hook', events: ['content.changed'] });
      expect(local.statusCode).toBe(400);
      expect(local.json().message).toBe('Webhook URL is not allowed: only https URLs are allowed');
      const internal = await manager.post(base, { name: 'Internal', url: 'https://10.0.0.5/hook', events: ['content.changed'] });
      expect(internal.statusCode).toBe(400);
      expect(internal.json().message).toBe('Webhook URL is not allowed: private address');
      expect(
        (await manager.post(base, { name: 'Alpha', url: 'https://alpha.example.com/hook', events: ['content.changed'] })).statusCode,
      ).toBe(201);
      // Unsigned unless asked: no secret, none answered.
      expect((await manager.get(base)).json().items[0]).toMatchObject({ name: 'Alpha', hasSecret: false });
      expect((await manager.get(base)).json().items[0]).not.toHaveProperty('secret');
      // A typed secret is refused: the server makes it.
      const typed = { name: 'Typed', url: 'https://example.com/hook', events: ['content.published'], secret: 's3cret' };
      expect((await manager.post(base, typed)).statusCode).toBe(400);

      const created = await manager.post(base, {
        name: 'Site',
        url: 'https://example.com/hook',
        events: ['content.published'],
        signed: true,
        headers: { 'X-Site': 'a' },
      });
      expect(created.statusCode).toBe(201);
      hook = created.json();
      expect(hook).toMatchObject({ enabled: true, hasSecret: true, headerNames: ['X-Site'], secret: expect.stringMatching(/^whsec_/) });
      expect(hook).not.toHaveProperty('headers');
      expect(await secretOf(hook.id)).toBe(created.json().secret);
      // Shown once: never again.
      expect((await manager.get(`${base}/${hook.id}`)).json()).not.toHaveProperty('secret');
      expect((await manager.get(base)).json().items.find((it: { id: string }) => it.id === hook.id)).not.toHaveProperty('secret');
    });

    it('keeps the secret and headers when an update leaves them out, and refuses a secret in an update', async () => {
      const before = await secretOf(hook.id);
      const body = { name: 'Site 2', url: 'https://example.com/v2', events: ['content.published', 'content.unpublished'] };
      const updated = (await manager.put(`${base}/${hook.id}`, body)).json();
      expect(updated).toMatchObject({ ...body, hasSecret: true, headerNames: ['X-Site'] });
      expect(await headersOf(hook.id)).toEqual({ 'X-Site': 'a' });
      expect(updated).not.toHaveProperty('secret');
      expect(await secretOf(hook.id)).toBe(before);
      expect((await manager.put(`${base}/${hook.id}`, { ...body, secret: 'n3w' })).statusCode).toBe(400);
      expect((await manager.put(`${base}/${hook.id}`, { ...body, secret: null })).statusCode).toBe(400);
    });

    it('never answers a header value; an update keeps (null), replaces or removes each header', async () => {
      const body = { name: 'Headers', url: 'https://example.com/h', events: ['content.published'] };
      const created = await manager.post(base, { ...body, headers: { Authorization: 'Bearer t0k3n', 'X-Site': 'a' } });
      expect(created.json()).toMatchObject({ headerNames: ['Authorization', 'X-Site'] });
      const id = created.json().id;
      for (const answer of [created.body, (await manager.get(`${base}/${id}`)).body, (await manager.get(base)).body]) {
        expect(answer).not.toContain('t0k3n');
      }

      // Kept (null), replaced, and one added; X-Site left out: removed.
      const kept = await manager.put(`${base}/${id}`, { ...body, headers: { authorization: null, 'X-New': 'n' } });
      expect(kept.json().headerNames).toEqual(['authorization', 'X-New']);
      expect(await headersOf(id)).toEqual({ authorization: 'Bearer t0k3n', 'X-New': 'n' });
      await manager.put(`${base}/${id}`, { ...body, headers: { authorization: 'Bearer other', 'X-New': null } });
      expect(await headersOf(id)).toEqual({ authorization: 'Bearer other', 'X-New': 'n' });
      // Without headers: all kept; an empty set: none.
      await manager.put(`${base}/${id}`, body);
      expect(await headersOf(id)).toEqual({ authorization: 'Bearer other', 'X-New': 'n' });
      const none = await manager.put(`${base}/${id}`, { ...body, headers: {} });
      expect(none.json()).not.toHaveProperty('headerNames');
      expect(await headersOf(id)).toBeNull();

      for (const [headers, message] of [
        [{ 'X-Gone': null }, 'Header X-Gone has no value to keep'],
        [{ 'webhook-signature': 'v1,x' }, 'Header webhook-signature is set by Localess'],
        [{ 'X-Webhook-Event': 'x' }, 'Header X-Webhook-Event is set by Localess'],
        [{ Host: 'internal' }, 'Header Host is set by Localess'],
        [{ 'X-A': 'a', 'x-a': 'b' }, 'Header x-a is given twice'],
      ] as const) {
        const response = await manager.put(`${base}/${id}`, { ...body, headers });
        expect(response.statusCode, message).toBe(400);
        expect(response.json().message).toBe(message);
      }
      for (const headers of [
        { 'Bad Name': 'x' },
        { 'X-A': 'line\nbreak' },
        { 'X-A': '' },
        Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`X-${i}`, 'v'])),
      ]) {
        expect((await manager.post(base, { ...body, headers })).statusCode).toBe(400);
      }
      expect((await manager.post(base, { ...body, headers: { 'X-A': null } })).statusCode).toBe(400);
      expect((await manager.delete(`${base}/${id}`)).statusCode).toBe(204);
    });

    it('makes a new secret (shown once, the old one stops) and removes it', async () => {
      const before = await secretOf(hook.id);
      const renewed = await manager.post(`${base}/${hook.id}/secret`);
      expect(renewed.statusCode).toBe(201);
      expect(renewed.json()).toMatchObject({ id: hook.id, hasSecret: true, secret: expect.stringMatching(/^whsec_/) });
      expect(renewed.json().secret).not.toBe(before);
      expect(await secretOf(hook.id)).toBe(renewed.json().secret);

      expect((await manager.delete(`${base}/${hook.id}/secret`)).statusCode).toBe(204);
      expect(await secretOf(hook.id)).toBeNull();
      expect((await manager.get(`${base}/${hook.id}`)).json().hasSecret).toBe(false);
      // An unsigned webhook starts signing the same way; then signed again for the tests below.
      expect((await manager.post(`${base}/${hook.id}/secret`)).json().hasSecret).toBe(true);
      for (const response of [
        await manager.post(`${base}/${S2}/secret`),
        await manager.delete(`${base}/${S2}/secret`),
        await manager.post(`/api/app/spaces/${S2}/webhooks/${hook.id}/secret`),
      ]) {
        expect(response.statusCode).toBe(404);
      }
      expect((await nobody.post(`${base}/${hook.id}/secret`)).statusCode).toBe(403);
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
      const logs = (await manager.get(`${base}/${hook.id}/logs?size=1`)).json().items;
      expect(logs).toEqual([expect.objectContaining({ deliveryId: 'new', id: expect.stringMatching(UUID_V7) })]);
      expect((await manager.get(`${base}/not-a-uuid/logs`)).statusCode).toBe(404);
      expect(logs[0]).not.toHaveProperty('webhookId');
    });

    it('pages through every log kept, and deletes those older than the retention', async () => {
      const log = {
        webhookId: hook.id,
        event: 'content.published' as const,
        url: 'https://example.com/v2',
        status: 'SUCCESS' as const,
        requestSize: 10,
        data: {},
        duration: 5,
      };
      const day = 24 * 60 * 60 * 1000;
      await t.db.insert(webhookLogs).values(
        Array.from({ length: 101 }, (_, index) => ({
          ...log,
          id: newUuid(),
          deliveryId: `bulk-${index}`,
          createdAt: new Date(Date.now() - day),
        })),
      );
      await t.db.insert(webhookLogs).values({ ...log, id: newUuid(), deliveryId: 'stale', createdAt: new Date(Date.now() - 31 * day) });
      // Every delivery can be reached, a page at a time: 'old' and 'new' (above), the 101 bulk ones and the stale one.
      expect((await manager.get(`${base}/${hook.id}/logs`)).json()).toMatchObject({ page: 0, size: 20, total: 104 });

      await t.app.get(WebhookLogCleanupService).cleanup();
      // 'old', 'new' (January, February) and 'stale' are past the 30 days.
      expect((await manager.get(`${base}/${hook.id}/logs`)).json().total).toBe(101);
      const kept = (await t.db.select({ deliveryId: webhookLogs.deliveryId }).from(webhookLogs)).map(it => it.deliveryId);
      expect(kept).not.toContain('stale');
      expect(kept).toContain('bulk-0');
    });

    it('checks the space first, answers 404 for ids that are not UUIDs, and refuses unknown fields', async () => {
      const unknown = `/api/app/spaces/${S2}/webhooks`;
      const body = { name: 'X', url: 'https://example.com/x', events: ['content.published'] };
      const responses = [
        await manager.get(unknown),
        await manager.post(unknown, body),
        await manager.get(`${unknown}/${hook.id}`),
        await manager.put(`${unknown}/${hook.id}`, body),
        await manager.patch(`${unknown}/${hook.id}/status`, { enabled: true }),
        await manager.delete(`${unknown}/${hook.id}`),
        await manager.get(`${unknown}/${hook.id}/logs`),
      ];
      for (const response of responses) {
        expect(response.statusCode).toBe(404);
        expect(response.json().message).toBe('Space not found');
      }
      expect((await manager.get(`${base}/${S2}`)).json().message).toBe('Webhook not found');
      expect((await manager.get(`${base}/${S2}/logs`)).json().message).toBe('Webhook not found');

      expect((await manager.get('/api/app/spaces/abc/webhooks')).statusCode).toBe(404);
      expect((await manager.get(`${base}/abc`)).statusCode).toBe(404);
      expect((await manager.get(`${base}/abc/logs`)).statusCode).toBe(404);

      expect((await manager.post(base, { ...body, secrets: 'x' })).statusCode).toBe(400);
      expect((await manager.put(`${base}/${hook.id}`, { ...body, enable: true })).statusCode).toBe(400);
      expect((await manager.patch(`${base}/${hook.id}/status`, { enabled: true, name: 'x' })).statusCode).toBe(400);
      expect((await manager.get(`${base}/${hook.id}`)).json()).toMatchObject({ name: 'Site 2', enabled: false });
    });

    it('lists by name and deletes with logs, for developers only', async () => {
      expect((await manager.get(base)).json().items.map((it: { name: string }) => it.name)).toEqual(['Alpha', 'Site 2']);
      expect((await nobody.get(base)).statusCode).toBe(403);
      const publish = vi.spyOn(t.app.get(EventService), 'publish');
      expect((await manager.delete(`${base}/${hook.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(webhookLogs)).toEqual([]);
      // Already gone: 404, and no second event.
      expect((await manager.delete(`${base}/${hook.id}`)).json()).toMatchObject({ statusCode: 404, message: 'Webhook not found' });
      expect(publish.mock.calls.filter(([event]) => event.entity === 'webhooks')).toEqual([
        [{ spaceId: S1, entity: 'webhooks', id: hook.id, op: 'deleted' }, expect.anything()],
      ]);
      publish.mockRestore();
    });
  });

  describe('tasks', () => {
    const base = `/api/app/spaces/${S1}/tasks`;

    it('creates exports for the role the kind names', async () => {
      const response = await exporter.post(base, { kind: 'CONTENT_EXPORT', path: 'blog' });
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ kind: 'CONTENT_EXPORT', status: 'INITIATED', path: 'blog' });
      expect(response.json()).not.toHaveProperty('lockedBy');
      expect((await exporter.post(base, { kind: 'SCHEMA_EXPORT' })).statusCode).toBe(403);
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
      const list = (await exporter.get(base)).json().items;
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

    it('deletes with the role the kind names, removing logs and files', async () => {
      const list = (await exporter.get(base)).json().items;
      const imported = list.find((it: { kind: string }) => it.kind === 'CONTENT_IMPORT');
      const regen = list.find((it: { kind: string }) => it.kind === 'ASSET_REGEN_METADATA');
      expect((await exporter.delete(`${base}/${regen.id}`)).statusCode).toBe(403);
      expect((await exporter.delete(`${base}/${imported.id}`)).statusCode).toBe(204);
      expect(await t.db.select().from(taskLogs)).toEqual([]);
      expect(await readdir(join(t.storageDir, `spaces/${S1}/tasks`))).toEqual([]);
    });
  });

  describe('OpenAPI', () => {
    it('generates the document for a developer, not an editor', async () => {
      const response = await manager.post(`/api/app/spaces/${S1}/open-api`);
      expect(response.statusCode).toBe(200);
      expect(response.json().openapi).toMatch(/^3\./);
      expect((await exporter.post(`/api/app/spaces/${S1}/open-api`)).statusCode).toBe(403);
      expect((await nobody.post(`/api/app/spaces/${S1}/open-api`)).statusCode).toBe(403);
    });
  });
});

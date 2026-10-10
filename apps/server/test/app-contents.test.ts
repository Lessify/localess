import { createHmac } from 'node:crypto';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { contentPublished, contents, schemas, spaces, tokens, webhookLogs, webhooks } from '../src/infra/database/schema.js';
import { WebhookDispatcher } from '../src/modules/webhooks/webhook-dispatcher.service.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';

interface Received {
  headers: IncomingMessage['headers'];
  body: string;
}

describe('app API: contents', () => {
  let t: TestApp;
  let editor: ReturnType<typeof api>;
  let reader: ReturnType<typeof api>;
  let receiver: Server;
  let received: Received[];
  const base = `/api/app/spaces/${S1}/contents`;
  const TOKEN = 'TTTTTTTTTTTTTTTTTTTT';

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true' });
    await t.db.insert(spaces).values({
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      localeFallback: { id: 'en', name: 'English' },
    });
    await t.db
      .insert(schemas)
      .values({ id: newUuid(), spaceId: S1, name: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] });
    await t.db.insert(tokens).values({ id: newUuid(), token: TOKEN, spaceId: S1, name: 't', version: 2, permissions: ['CONTENT_PUBLIC', 'CONTENT_DRAFT'] });
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'custom',
        permissions: ['CONTENT_READ', 'CONTENT_CREATE', 'CONTENT_UPDATE', 'CONTENT_DELETE', 'CONTENT_PUBLISH'],
      }),
    );
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['CONTENT_READ'] }));

    received = [];
    receiver = createServer((request, response) => {
      let body = '';
      request.on('data', chunk => (body += chunk));
      request.on('end', () => {
        received.push({ headers: request.headers, body });
        response.writeHead(200).end('ok');
      });
    });
    await new Promise<void>(resolve => receiver.listen(0, '127.0.0.1', resolve));
    await t.db.insert(webhooks).values({
      id: newUuid(),
      spaceId: S1,
      name: 'site',
      url: `http://127.0.0.1:${(receiver.address() as AddressInfo).port}/hook`,
      events: ['content.published', 'content.unpublished', 'content.changed'],
      secret: 'shh',
    });
  });

  afterAll(async () => {
    await t?.close();
    await new Promise(resolve => receiver?.close(resolve));
  });

  beforeEach(async () => {
    await t.app.get(WebhookDispatcher).whenIdle();
    received = [];
  });

  const deliveries = async () => {
    await t.app.get(WebhookDispatcher).whenIdle();
    return received.map(it => JSON.parse(it.body));
  };
  const version = async () => (await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0].contentVersion;
  const row = async (id: string) =>
    (
      await t.db
        .select()
        .from(contents)
        .where(and(eq(contents.spaceId, S1), eq(contents.id, id)))
    )[0];
  const create = async (body: object) => {
    const response = await editor.post(base, body);
    expect(response.statusCode, response.body).toBe(201);
    return response.json();
  };

  let blog: { id: string };
  let post: { id: string };

  describe('creating', () => {
    it('creates folders and documents with updatedBy from the session, bumping the version', async () => {
      const before = await version();
      blog = await create({ kind: 'FOLDER', parentSlug: '', name: 'Blog', slug: 'blog' });
      post = await create({ kind: 'DOCUMENT', parentSlug: 'blog', name: 'Post', slug: 'post', schema: 'page' });
      expect(post).toMatchObject({
        kind: 'DOCUMENT',
        fullSlug: 'blog/post',
        parentSlug: 'blog',
        schema: 'page',
        updatedBy: { name: 'editor@example.com', email: 'editor@example.com' },
      });
      expect(post).not.toHaveProperty('publishedAt');
      expect(await version()).toBeGreaterThan(before);
    });

    it('refuses a missing parent folder, a taken slug, and slugs with slashes', async () => {
      expect((await editor.post(base, { kind: 'FOLDER', parentSlug: 'nope', name: 'X', slug: 'x' })).statusCode).toBe(400);
      expect((await editor.post(base, { kind: 'FOLDER', parentSlug: 'blog/post', name: 'X', slug: 'x' })).statusCode).toBe(400);
      expect(
        (await editor.post(base, { kind: 'DOCUMENT', parentSlug: 'blog', name: 'Dup', slug: 'post', schema: 'page' })).statusCode,
      ).toBe(409);
      expect((await editor.post(base, { kind: 'FOLDER', parentSlug: '', name: 'X', slug: 'a/b' })).statusCode).toBe(400);
      expect((await reader.post(base, { kind: 'FOLDER', parentSlug: '', name: 'X', slug: 'x' })).statusCode).toBe(403);
    });

    it('lists by parent (folders first, then by name), by name prefix, by ids, and counts', async () => {
      await create({ kind: 'DOCUMENT', parentSlug: '', name: 'About', slug: 'about', schema: 'page' });
      expect((await reader.get(`${base}?parentSlug=`)).json().map((c: { name: string }) => c.name)).toEqual(['Blog', 'About']);
      expect((await reader.get(`${base}?name=ab`)).json().map((c: { name: string }) => c.name)).toEqual(['About']);
      expect((await reader.get(`${base}?ids=${post.id},missing`)).json().map((c: { id: string }) => c.id)).toEqual([post.id]);
      expect((await reader.get(`${base}?kind=DOCUMENT&limit=1`)).json()).toHaveLength(1);
      expect((await reader.get(`${base}/count?kind=DOCUMENT`)).json()).toEqual({ count: 2 });
      expect((await reader.get(`${base}/missing`)).statusCode).toBe(404);
    });

    it('gives documents UUIDv7 ids; `?ids=` matches ids exactly', async () => {
      expect(post.id).toMatch(UUID_V7);
      expect((await reader.get(`${base}?ids=not-a-uuid,${post.id}`)).json().map((c: { id: string }) => c.id)).toEqual([post.id]);
    });
  });

  describe('editing', () => {
    it('saves data with its references and fires content.changed after commit', async () => {
      const response = await editor.put(`${base}/${post.id}/data`, {
        data: { _id: 'r', _schema: 'page', title: 'Hello', title_i18n_de: 'Hallo' },
        assets: ['a1'],
        links: [],
        references: [],
      });
      expect(response.json()).toMatchObject({ data: { title: 'Hello' }, assets: ['a1'] });
      expect(await deliveries()).toEqual([
        { event: 'content.changed', spaceId: S1, timestamp: expect.any(String), data: { id: post.id, fullSlug: 'blog/post' } },
      ]);
    });

    it('signs deliveries with the webhook secret over the exact body, and logs them', async () => {
      await editor.patch(`${base}/${post.id}`, { name: 'Post!' });
      await deliveries();
      const [delivery] = received;
      expect(delivery.headers['x-webhook-event']).toBe('content.changed');
      expect(delivery.headers['x-webhook-signature']).toBe('sha256=' + createHmac('sha256', 'shh').update(delivery.body).digest('hex'));
      const logs = await t.db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.deliveryId, delivery.headers['x-webhook-delivery'] as string));
      expect(logs).toEqual([expect.objectContaining({ status: 'success', statusCode: 200, event: 'content.changed', responseBody: 'ok' })]);
    });

    it('renames a folder and rewrites every descendant slug in one go', async () => {
      const deep = await create({ kind: 'FOLDER', parentSlug: 'blog', name: '2026', slug: '2026' });
      const nested = await create({ kind: 'DOCUMENT', parentSlug: 'blog/2026', name: 'Deep', slug: 'deep', schema: 'page' });
      await create({ kind: 'FOLDER', parentSlug: '', name: 'Blog archive', slug: 'blog-archive' });
      const response = await editor.patch(`${base}/${blog.id}`, { slug: 'news' });
      expect(response.json()).toMatchObject({ slug: 'news', fullSlug: 'news' });
      expect(await row(post.id)).toMatchObject({ parentSlug: 'news', fullSlug: 'news/post' });
      expect(await row(deep.id)).toMatchObject({ parentSlug: 'news', fullSlug: 'news/2026' });
      expect(await row(nested.id)).toMatchObject({ parentSlug: 'news/2026', fullSlug: 'news/2026/deep' });
      expect(
        (await reader.get(`${base}?parentSlug=`))
          .json()
          .map((c: { fullSlug: string }) => c.fullSlug)
          .sort(),
      ).toEqual(['about', 'blog-archive', 'news']);
      // A move is not a content.changed, as before.
      expect(await deliveries()).toEqual([]);
    });

    it('moves documents, refusing a folder into its own subtree or onto a taken slug', async () => {
      expect((await editor.patch(`${base}/${blog.id}`, { parentSlug: 'news/2026' })).statusCode).toBe(400);
      expect((await editor.patch(`${base}/${post.id}`, { parentSlug: '', slug: 'about' })).statusCode).toBe(409);
      expect((await editor.patch(`${base}/${post.id}`, { parentSlug: '' })).json()).toMatchObject({ fullSlug: 'post', parentSlug: '' });
      expect((await editor.patch(`${base}/${post.id}`, { parentSlug: 'news' })).json().fullSlug).toBe('news/post');
    });

    it('clones a document under a new slug with its data', async () => {
      const response = await editor.post(`${base}/${post.id}/clone`);
      expect(response.json()).toMatchObject({
        name: expect.stringMatching(/^Post! [a-z0-9]{5}$/),
        slug: expect.stringMatching(/^post-[a-z0-9]{5}$/),
        data: { title: 'Hello' },
      });
      await editor.delete(`${base}/${response.json().id}`);
    });
  });

  describe('publishing', () => {
    const cdn = (id: string, query = '') => t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/contents/${id}?token=${TOKEN}${query}` });
    const cdnFollow = async (id: string, query = '') => {
      const redirect = await cdn(id, query);
      return t.request({ method: 'GET', url: redirect.headers.location as string });
    };

    it('publishes a snapshot per locale that the public API serves, moving cv', async () => {
      const cvBefore = (await cdn(post.id)).headers.location;
      expect((await editor.post(`${base}/${post.id}/publish`)).statusCode).toBe(204);
      expect((await cdn(post.id)).headers.location).not.toBe(cvBefore);
      const published = await t.db.select().from(contentPublished).where(eq(contentPublished.contentId, post.id));
      expect(published.map(it => it.locale).sort()).toEqual(['de', 'en']);
      expect((await cdnFollow(post.id, '&locale=de')).json()).toMatchObject({
        locale: 'de',
        fullSlug: 'news/post',
        data: { title: 'Hallo' },
      });
      expect((await row(post.id)).publishedAt).not.toBeNull();
      expect(await deliveries()).toEqual([
        expect.objectContaining({ event: 'content.published', data: { id: post.id, fullSlug: 'news/post' } }),
      ]);
    });

    it('keeps serving the published snapshot after further edits; drafts show them', async () => {
      await editor.put(`${base}/${post.id}/data`, {
        data: { _id: 'r', _schema: 'page', title: 'Edited' },
        assets: [],
        links: [],
        references: [],
      });
      expect((await cdnFollow(post.id)).json().data.title).toBe('Hello');
      expect((await cdnFollow(post.id, '&version=draft')).json().data.title).toBe('Edited');
    });

    it('publishes a folder: only documents changed since their last publish', async () => {
      const fresh = await create({ kind: 'DOCUMENT', parentSlug: 'news', name: 'Fresh', slug: 'fresh', schema: 'page' });
      const untouched = await create({ kind: 'DOCUMENT', parentSlug: 'news', name: 'Untouched', slug: 'untouched', schema: 'page' });
      await editor.post(`${base}/${untouched.id}/publish`);
      const untouchedAt = (await row(untouched.id)).publishedAt;
      await deliveries();
      received = [];

      await editor.post(`${base}/${blog.id}/publish`);
      expect((await row(fresh.id)).publishedAt).not.toBeNull();
      expect((await row(post.id)).publishedAt!.getTime()).toBeGreaterThan(0);
      expect((await row(untouched.id)).publishedAt).toEqual(untouchedAt);
      expect(await deliveries()).toEqual([
        expect.objectContaining({ event: 'content.published', data: { id: blog.id, fullSlug: 'news' } }),
      ]);
    });

    it('unpublishes a folder: published documents under it stop being served', async () => {
      expect((await editor.post(`${base}/${blog.id}/unpublish`)).statusCode).toBe(204);
      expect((await row(post.id)).publishedAt).toBeNull();
      expect(await t.db.select().from(contentPublished).where(eq(contentPublished.contentId, post.id))).toEqual([]);
      expect((await cdnFollow(post.id)).statusCode).toBe(404);
      expect(await deliveries()).toEqual([
        expect.objectContaining({ event: 'content.unpublished', data: { id: blog.id, fullSlug: 'news' } }),
      ]);
    });

    it('requires CONTENT_PUBLISH', async () => {
      expect((await reader.post(`${base}/${post.id}/publish`)).statusCode).toBe(403);
    });
  });

  describe('deleting', () => {
    it('deletes a folder with its whole subtree and published snapshots, one content.changed each', async () => {
      await editor.post(`${base}/${post.id}/publish`);
      await deliveries();
      received = [];
      const subtree = (await t.db.select().from(contents).where(eq(contents.spaceId, S1))).filter(
        c => c.fullSlug === 'news' || c.fullSlug.startsWith('news/'),
      );
      expect((await editor.delete(`${base}/${blog.id}`)).statusCode).toBe(204);
      const remaining = (await t.db.select().from(contents).where(eq(contents.spaceId, S1))).map(c => c.fullSlug).sort();
      expect(remaining).toEqual(['about', 'blog-archive']);
      expect(await t.db.select().from(contentPublished).where(eq(contentPublished.spaceId, S1))).toEqual([]);
      expect((await deliveries()).map(d => d.data.id).sort()).toEqual(subtree.map(c => c.id).sort());
    });

    it('sends no webhook for a write that fails', async () => {
      expect((await editor.post(base, { kind: 'FOLDER', parentSlug: '', name: 'Dup', slug: 'about' })).statusCode).toBe(409);
      expect((await editor.delete(`${base}/missing`)).statusCode).toBe(404);
      expect(await deliveries()).toEqual([]);
    });
  });
});

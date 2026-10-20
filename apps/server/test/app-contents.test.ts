import { createHmac } from 'node:crypto';
import { createServer, IncomingMessage, Server } from 'node:http';
import { AddressInfo } from 'node:net';

import { SchemaFieldKind, TokenType } from '@localess/shared';
import { ConflictException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { contents, contentSnapshots, schemas, tokens, webhookLogs, webhooks } from '../src/infra/database/schema.js';
import { transaction } from '../src/infra/database/transaction.js';
import { ContentRepository } from '../src/modules/contents/repositories/content.repository.js';
import { ContentService } from '../src/modules/contents/services/content.service.js';
import { lockContents } from '../src/shared/data-rules/content-snapshots.js';
import { subtree } from '../src/shared/queries/content-tree.query.js';
import { WebhookDispatcher } from '../src/shared/services/webhook-dispatcher.service.js';
import { newApiToken } from '../src/shared/utils/api-token-format.js';
import { S1, UUID_V7 } from './ids.js';
import { tokenRow } from './seed.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

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
  const TOKEN = newApiToken(TokenType.PREVIEW);

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true' });
    await insertSpace(t.db, {
      id: S1,
      name: 'S',
      locales: [
        { id: 'en', name: 'English' },
        { id: 'de', name: 'German' },
      ],
      defaultLocale: { id: 'en', name: 'English' },
    });
    await t.db.insert(schemas).values({
      id: newUuid(),
      spaceId: S1,
      name: 'page',
      type: 'ROOT',
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }],
    });
    await t.db.insert(tokens).values(tokenRow(S1, TokenType.PREVIEW, TOKEN, 't'));
    editor = api(
      t,
      await userWithAccess(t, 'editor@example.com', {
        role: 'EDITOR',
      }),
    );
    reader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'VIEWER' }));

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
      enabled: true,
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

  /** An item as the API answers it, with its computed paths. */
  const item = async (id: string) => (await reader.get(`${base}/${id}`)).json();

  let blog: { id: string };
  let post: { id: string };
  let deep: { id: string };

  describe('creating', () => {
    it('creates folders and documents, without recording who changed them', async () => {
      blog = await create({ kind: 'FOLDER', name: 'Blog', slug: 'blog' });
      post = await create({ kind: 'DOCUMENT', parentId: blog.id, name: 'Post', slug: 'post', schema: 'page' });
      expect(post).toMatchObject({
        kind: 'DOCUMENT',
        parentId: blog.id,
        fullSlug: 'blog/post',
        parentSlug: 'blog',
        schema: 'page',
      });
      expect(post).not.toHaveProperty('publishedAt');
      expect(post).not.toHaveProperty('updatedBy');
    });

    it('refuses a path a concurrent write took after the check (unique index)', async () => {
      const repository = t.app.get(ContentRepository);
      let release!: () => void;
      const held = new Promise<void>(resolve => (release = resolve));
      let inserted!: () => void;
      const insertedYet = new Promise<void>(resolve => (inserted = resolve));
      // The first write inserts `race` and holds its transaction open.
      const first = transaction(t.db, undefined, async tx => {
        await repository.create(S1, { kind: 'FOLDER', name: 'Race', slug: 'race' }, tx);
        inserted();
        await held;
      });
      await insertedYet;
      // The second one's check does not see the uncommitted row; its insert waits on the index, then fails.
      const second = t.app.get(ContentService).create(S1, { kind: 'FOLDER', name: 'Race 2', slug: 'race' });
      const settled = second.then(
        () => 'created',
        (error: unknown) => error,
      );
      await new Promise(resolve => setTimeout(resolve, 100));
      release();
      await first;
      const outcome = await settled;
      expect(outcome).toBeInstanceOf(ConflictException);
      expect((outcome as ConflictException).message).toBe("'race' is already used");
      const raced = await t.db
        .select()
        .from(contents)
        .where(and(eq(contents.spaceId, S1), isNull(contents.parentId), eq(contents.slug, 'race')));
      expect(raced).toHaveLength(1);
      await editor.delete(`${base}/${raced[0].id}`);
    });

    it('refuses a parent that is a document, missing, or of another space (400)', async () => {
      for (const parentId of [post.id, newUuid()]) {
        const response = await editor.post(base, { kind: 'FOLDER', parentId, name: 'X', slug: 'x' });
        expect(response.statusCode).toBe(400);
        expect(response.json().message).toBe('No such folder');
      }
    });

    it('refuses a taken slug among siblings, slugs with slashes, and readers', async () => {
      const taken = await editor.post(base, { kind: 'DOCUMENT', parentId: blog.id, name: 'Dup', slug: 'post', schema: 'page' });
      expect(taken.statusCode).toBe(409);
      expect(taken.json().message).toBe("'blog/post' is already used");
      expect((await editor.post(base, { kind: 'FOLDER', name: 'X', slug: 'a/b' })).statusCode).toBe(400);
      expect((await reader.post(base, { kind: 'FOLDER', name: 'X', slug: 'x' })).statusCode).toBe(403);
    });

    it('allows the same slug under another parent', async () => {
      const other = await create({ kind: 'FOLDER', name: 'Other', slug: 'other' });
      const dup = await create({ kind: 'DOCUMENT', parentId: other.id, name: 'Post', slug: 'post', schema: 'page' });
      expect(dup).toMatchObject({ parentId: other.id, fullSlug: 'other/post', parentSlug: 'other' });
      await editor.delete(`${base}/${other.id}`);
    });

    it('lists every folder of the space for the editor', async () => {
      const response = await reader.get(`${base}/folders`);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([{ id: blog.id, name: 'Blog', slug: 'blog' }]);
    });

    it('creates a document only for a ROOT schema of the space', async () => {
      await t.db.insert(schemas).values({ id: newUuid(), spaceId: S1, name: 'hero', type: 'NODE' });
      const missing = await editor.post(base, { kind: 'DOCUMENT', name: 'X', slug: 'x', schema: 'nope' });
      expect(missing.statusCode).toBe(400);
      expect(missing.json().message).toBe("No ROOT schema 'nope' in the space");
      expect((await editor.post(base, { kind: 'DOCUMENT', name: 'X', slug: 'x', schema: 'hero' })).statusCode).toBe(400);
      await t.db.delete(schemas).where(and(eq(schemas.spaceId, S1), eq(schemas.name, 'hero')));
    });

    it('lists by parent (folders first, then by name), by name prefix, by ids, and counts', async () => {
      await create({ kind: 'DOCUMENT', name: 'About', slug: 'about', schema: 'page' });
      expect((await reader.get(`${base}?parentId=`)).json().map((c: { name: string }) => c.name)).toEqual(['Blog', 'About']);
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
    it('saves data and fires content.changed after commit', async () => {
      const response = await editor.put(`${base}/${post.id}/data`, {
        data: { _id: 'r', _schema: 'page', title: 'Hello', title_i18n_de: 'Hallo' },
      });
      expect(response.json()).toMatchObject({ data: { title: 'Hello' } });
      expect(await deliveries()).toEqual([
        { event: 'content.changed', spaceId: S1, timestamp: expect.any(String), data: { id: post.id, fullSlug: 'blog/post' } },
      ]);
    });

    it('works out what the data points to itself, whatever lists the request sends (every locale, every block)', async () => {
      const data = {
        _id: 'r',
        _schema: 'page',
        title: 'Hello',
        title_i18n_de: 'Hallo',
        image: { kind: 'ASSET', uri: 'asset-en' },
        image_i18n_de: { kind: 'ASSET', uri: 'asset-de' },
        related: { kind: 'REFERENCE', uri: 'doc-ref' },
        blocks: [
          {
            _id: 'b1',
            _schema: 'card',
            gallery: [
              { kind: 'ASSET', uri: 'asset-block' },
              { kind: 'ASSET', uri: 'asset-en' },
            ],
            more: { kind: 'LINK', type: 'content', target: '_self', uri: 'doc-link' },
            web: { kind: 'LINK', type: 'url', target: '_blank', uri: 'https://example.com' },
          },
        ],
      };
      // Lists that do not match the data: ignored.
      const response = await editor.put(`${base}/${post.id}/data`, { data, assets: ['wrong'], links: [], references: ['wrong'] });
      expect(response.statusCode).toBe(200);
      expect(await row(post.id)).toMatchObject({
        assets: ['asset-block', 'asset-de', 'asset-en'],
        links: ['doc-link'],
        references: ['doc-ref'],
      });
      // None sent: the same.
      await editor.put(`${base}/${post.id}/data`, { data: { ...data, related: undefined } });
      expect(await row(post.id)).toMatchObject({ assets: ['asset-block', 'asset-de', 'asset-en'], links: ['doc-link'], references: [] });
    });

    it('refuses data that is not blocks of known values, naming where', async () => {
      const save = (data: unknown) => editor.put(`${base}/${post.id}/data`, { data, assets: [], links: [], references: [] });
      const before = (await row(post.id)).data;
      for (const [data, path] of [
        [{ _schema: 'page', title: 'no id' }, 'data._id'],
        [{ _id: 'r', title: 'no schema' }, 'data._schema'],
        [{ _id: 'r', _schema: 'page', odd: { foo: 1 } }, 'data.odd'],
        [{ _id: 'r', _schema: 'page', blocks: [{ _id: 'b1', title: 'block without schema' }] }, 'data.blocks'],
      ] as const) {
        const response = await save(data);
        expect(response.statusCode).toBe(400);
        expect((response.json().message as string[]).map(it => it.slice(0, it.indexOf(': ')))).toContain(path);
      }
      expect((await row(post.id)).data).toEqual(before);
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
      expect(logs).toEqual([expect.objectContaining({ status: 'SUCCESS', statusCode: 200, event: 'content.changed', responseBody: 'ok' })]);
    });

    it('renames a folder: one row, and every path under it follows', async () => {
      deep = await create({ kind: 'FOLDER', parentId: blog.id, name: '2026', slug: '2026' });
      const nested = await create({ kind: 'DOCUMENT', parentId: deep.id, name: 'Deep', slug: 'deep', schema: 'page' });
      await create({ kind: 'FOLDER', name: 'Blog archive', slug: 'blog-archive' });
      const response = await editor.patch(`${base}/${blog.id}`, { slug: 'news' });
      expect(response.json()).toMatchObject({ slug: 'news', fullSlug: 'news' });
      expect(await item(post.id)).toMatchObject({ parentSlug: 'news', fullSlug: 'news/post' });
      expect(await item(deep.id)).toMatchObject({ parentSlug: 'news', fullSlug: 'news/2026' });
      expect(await item(nested.id)).toMatchObject({ parentSlug: 'news/2026', fullSlug: 'news/2026/deep' });
      expect(
        (await reader.get(`${base}?parentId=`))
          .json()
          .map((c: { fullSlug: string }) => c.fullSlug)
          .sort(),
      ).toEqual(['about', 'blog-archive', 'news']);
      // A move is not a content.changed, as before.
      expect(await deliveries()).toEqual([]);
    });

    it('moves documents, refusing a folder into its own subtree or onto a taken slug', async () => {
      for (const parentId of [blog.id, deep.id]) {
        const response = await editor.patch(`${base}/${blog.id}`, { parentId });
        expect(response.statusCode).toBe(400);
        expect(response.json().message).toBe('A folder cannot be moved into itself');
      }
      expect((await editor.patch(`${base}/${post.id}`, { parentId: null, slug: 'about' })).statusCode).toBe(409);
      expect((await editor.patch(`${base}/${post.id}`, { parentId: null })).json()).toMatchObject({ fullSlug: 'post', parentSlug: '' });
      expect((await editor.patch(`${base}/${post.id}`, { parentId: blog.id })).json().fullSlug).toBe('news/post');
    });

    it('renames or moves to where it already is without a conflict', async () => {
      expect((await editor.patch(`${base}/${post.id}`, { slug: 'post', parentId: blog.id })).statusCode).toBe(200);
    });

    it('takes the contents lock before any row lock, so writes can not deadlock on lock order', async () => {
      const folder = await create({ kind: 'FOLDER', name: 'Order', slug: 'order' });
      let release!: () => void;
      const held = new Promise<void>(resolve => (release = resolve));
      let locked!: () => void;
      const lockedYet = new Promise<void>(resolve => (locked = resolve));
      // Another write of the space holds the contents lock.
      const holder = transaction(t.db, undefined, async tx => {
        await lockContents(tx, S1);
        locked();
        await held;
      });
      await lockedYet;
      const creating = editor.post(base, { kind: 'FOLDER', parentId: folder.id, name: 'Inner', slug: 'inner' });
      await new Promise(resolve => setTimeout(resolve, 100));
      // The waiting create holds no row lock yet: the parent folder can still be locked for update.
      const probe = await transaction(t.db, undefined, async tx =>
        tx.execute(sql`select id from ${contents} where space_id = ${S1} and id = ${folder.id} for update nowait`).then(
          () => 'free',
          () => 'locked',
        ),
      );
      release();
      await holder;
      expect(probe).toBe('free');
      expect((await creating).statusCode).toBe(201);
      await editor.delete(`${base}/${folder.id}`);
    });

    it('does not leave a child behind when its folder is deleted at the same moment (foreign key)', async () => {
      const folder = await create({ kind: 'FOLDER', name: 'Gone', slug: 'gone' });
      const repository = t.app.get(ContentRepository);
      let release!: () => void;
      const held = new Promise<void>(resolve => (release = resolve));
      let inserted!: () => void;
      const insertedYet = new Promise<void>(resolve => (inserted = resolve));
      const first = transaction(t.db, undefined, async tx => {
        await repository.create(S1, { kind: 'FOLDER', parentId: folder.id, name: 'Child', slug: 'child' }, tx);
        inserted();
        await held;
      });
      await insertedYet;
      const deleting = editor.delete(`${base}/${folder.id}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      release();
      await first;
      expect((await deleting).statusCode).toBe(204);
      expect(
        await t.db
          .select()
          .from(contents)
          .where(and(eq(contents.spaceId, S1), eq(contents.parentId, folder.id))),
      ).toEqual([]);
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
      return t.request({ method: 'GET', url: redirect.headers.location });
    };

    it('publishes a snapshot per locale that the public API serves, moving cv', async () => {
      const cvBefore = (await cdn(post.id)).headers.location;
      expect((await editor.post(`${base}/${post.id}/publish`)).statusCode).toBe(204);
      expect((await cdn(post.id)).headers.location).not.toBe(cvBefore);
      const published = await t.db
        .select()
        .from(contentSnapshots)
        .where(and(eq(contentSnapshots.contentId, post.id), eq(contentSnapshots.version, 'published')));
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
      const fresh = await create({ kind: 'DOCUMENT', parentId: blog.id, name: 'Fresh', slug: 'fresh', schema: 'page' });
      const untouched = await create({ kind: 'DOCUMENT', parentId: blog.id, name: 'Untouched', slug: 'untouched', schema: 'page' });
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
      const published = and(eq(contentSnapshots.contentId, post.id), eq(contentSnapshots.version, 'published'));
      expect(await t.db.select().from(contentSnapshots).where(published)).toEqual([]);
      // Nothing to answer to: the 404 comes before any redirect. The draft stays.
      expect((await cdn(post.id)).statusCode).toBe(404);
      expect((await cdnFollow(post.id, '&version=draft')).json().data.title).toBe('Edited');
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
      const under = await subtree(t.db, S1, blog.id);
      expect((await editor.delete(`${base}/${blog.id}`)).statusCode).toBe(204);
      const remaining = (await t.db.select().from(contents).where(eq(contents.spaceId, S1))).map(c => c.slug).sort();
      expect(remaining).toEqual(['about', 'blog-archive']);
      expect(await t.db.select().from(contentSnapshots).where(eq(contentSnapshots.spaceId, S1))).toEqual([]);
      expect((await deliveries()).map(d => d.data.id).sort()).toEqual(under.map(c => c.id).sort());
    });

    it('sends no webhook for a write that fails', async () => {
      expect((await editor.post(base, { kind: 'FOLDER', name: 'Dup', slug: 'about' })).statusCode).toBe(409);
      expect((await editor.delete(`${base}/missing`)).statusCode).toBe(404);
      expect(await deliveries()).toEqual([]);
    });
  });

  // This file runs with LOCALESS_WEBHOOK_ALLOW_INTERNAL=true (the local receiver above).
  it('saves a local http webhook when internal targets are allowed, as delivery does', async () => {
    const manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
    const created = await manager.post(`/api/app/spaces/${S1}/webhooks`, {
      name: 'Local',
      url: 'http://localhost:4000/hook',
      events: ['content.changed'],
    });
    expect(created.statusCode, created.body).toBe(201);
    expect((await manager.delete(`/api/app/spaces/${S1}/webhooks/${created.json().id}`)).statusCode).toBe(204);
  });
});

import { randomBytes } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SchemaFieldKind } from '@localess/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contentLinkSnapshots, contents, contentSnapshots, schemas, storageDeletions } from '../src/infra/database/schema.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { orphansOf, storedAssetDirs } from './orphans.js';
import { api, createTestApp, TestApp, userWithAccess, XHR } from './test-app.js';

/** A multipart upload body: the fields first, then the file (the order the endpoint expects). */
function multipart(fields: Record<string, string>, file: { filename: string; type: string; bytes: Buffer }) {
  const boundary = `----localess${randomBytes(8).toString('hex')}`;
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ),
  );
  parts.push(file.bytes, Buffer.from(`\r\n--${boundary}--\r\n`));
  return { payload: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

// Deleting a folder deletes everything under it, at any depth, and leaves nothing behind: no rows, no snapshots, no
// `/links` entries, no stored files, no queued deletions (orphans.ts). The foreign keys cascade the rows; the rest is
// the delete's own work, which these tests pin.
describe('nested delete: nothing is left behind', () => {
  let t: TestApp;
  let cookie: string;
  let admin: ReturnType<typeof api>;
  let spaceId: string;
  let token: string;

  /** A CDN GET, following the `cv` redirect once. */
  const cdn = async (url: string) => {
    const first = await t.request({ method: 'GET', url });
    if (first.statusCode !== 302) return first;
    return t.request({ method: 'GET', url: first.headers.location });
  };

  beforeAll(async () => {
    t = await createTestApp();
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    admin = api(t, cookie);
    spaceId = (await admin.post('/api/app/spaces', { name: 'Nested' })).json().id;
    token = (await admin.get(`/api/app/spaces/${spaceId}/tokens`)).json().items[0].token;
    await t.db
      .insert(schemas)
      .values({ id: newUuid(), spaceId, name: 'page', type: 'ROOT', fields: [{ name: 'title', kind: SchemaFieldKind.TEXT }] });
  });

  afterAll(() => t?.close());

  it('the check finds every kind of leftover', async () => {
    // One leftover of each kind, planted directly, so a check that finds nothing can be trusted.
    const other = (await admin.post('/api/app/spaces', { name: 'Planted' })).json().id;
    const gone = newUuid();
    await t.db.execute(sql`set session_replication_role = replica`); // let the planted rows skip their foreign keys
    try {
      await t.db.insert(contents).values({ id: newUuid(), spaceId: other, kind: 'FOLDER', name: 'Lost', slug: 'lost', parentId: gone });
      await t.db.insert(contentSnapshots).values({
        spaceId: other,
        contentId: gone,
        version: 'draft',
        locale: 'en',
        data: {} as never,
        builtAt: new Date(),
      });
      await t.db.insert(assets).values({ id: newUuid(), spaceId: other, kind: 'FOLDER', name: 'Lost', parentId: gone } as never);
    } finally {
      await t.db.execute(sql`set session_replication_role = origin`);
    }
    await t.db
      .insert(contentLinkSnapshots)
      .values({ spaceId: other, version: 'draft', data: { [gone]: {} as never }, builtAt: new Date() });
    await mkdir(join(t.storageDir, `spaces/${other}/assets/${gone}`), { recursive: true });
    await writeFile(join(t.storageDir, `spaces/${other}/assets/${gone}/original`), 'x');
    await t.db
      .insert(storageDeletions)
      .values({ prefix: `spaces/${other}/assets/${gone}/`, spaceId: other, assetId: gone, notBefore: new Date(Date.now() + 3_600_000) });

    const found = await orphansOf(t, other);
    expect(found).toHaveLength(6);
    expect(found.join('\n')).toMatch(/content .*: its parent is gone/);
    expect(found.join('\n')).toMatch(/content snapshot of .*: the content is gone/);
    expect(found.join('\n')).toMatch(/draft \/links: lists .*, which is gone/);
    expect(found.join('\n')).toMatch(/asset .*: its parent is gone/);
    expect(found.join('\n')).toMatch(/stored files of asset .*: the asset is gone/);
    expect(found.join('\n')).toMatch(/storage deletion still queued/);
  });

  it('contents: a folder three levels deep goes with its documents, snapshots and /links entries', async () => {
    const base = `/api/app/spaces/${spaceId}/contents`;
    const folder = async (name: string, parentId?: string) =>
      (await admin.post(base, { kind: 'FOLDER', name, slug: name.toLowerCase(), parentId })).json().id as string;
    const document = async (name: string, parentId?: string) =>
      (await admin.post(base, { kind: 'DOCUMENT', name, slug: name.toLowerCase(), schema: 'page', parentId })).json().id as string;

    // blog/2026/june/{post} with a document at every level; a sibling tree that must stay.
    const blog = await folder('Blog');
    const year = await folder('Y2026', blog);
    const june = await folder('June', year);
    const deleted = [blog, year, june, await document('Intro', blog), await document('Recap', year), await document('Post', june)];
    const docs = deleted.slice(3);
    const about = await folder('About');
    const team = await document('Team', about);
    for (const id of [...docs, team]) expect((await admin.post(`${base}/${id}/publish`)).statusCode).toBeLessThan(300);

    // Pre-check: drafts, published versions and both /links lists built, every document delivered.
    for (const id of [...docs, team]) {
      expect((await cdn(`/api/v1/spaces/${spaceId}/contents/${id}?token=${token}`)).statusCode).toBe(200);
      expect((await cdn(`/api/v1/spaces/${spaceId}/contents/${id}?token=${token}&version=draft`)).statusCode).toBe(200);
    }
    for (const version of ['', '&version=draft']) {
      expect(Object.keys((await cdn(`/api/v1/spaces/${spaceId}/links?token=${token}${version}`)).json())).toEqual(
        expect.arrayContaining([...docs, team]),
      );
    }
    const snapshots = () => t.db.select().from(contentSnapshots).where(inArray(contentSnapshots.contentId, deleted));
    expect((await snapshots()).length).toBeGreaterThanOrEqual(docs.length * 2);
    expect(await orphansOf(t, spaceId)).toEqual([]);

    // Action
    expect((await admin.delete(`${base}/${blog}`)).statusCode).toBe(204);

    // Post-check: the subtree, its snapshots and its /links entries are gone; the sibling tree is whole.
    expect(await t.db.select().from(contents).where(inArray(contents.id, deleted))).toEqual([]);
    expect(await snapshots()).toEqual([]);
    for (const id of docs) {
      expect((await cdn(`/api/v1/spaces/${spaceId}/contents/${id}?token=${token}`)).statusCode).toBe(404);
      expect((await cdn(`/api/v1/spaces/${spaceId}/contents/${id}?token=${token}&version=draft`)).statusCode).toBe(404);
    }
    for (const version of ['', '&version=draft']) {
      const links = Object.keys((await cdn(`/api/v1/spaces/${spaceId}/links?token=${token}${version}`)).json());
      expect(links).toContain(team);
      for (const id of deleted) expect(links).not.toContain(id);
    }
    expect((await cdn(`/api/v1/spaces/${spaceId}/contents/${team}?token=${token}&version=draft`)).statusCode).toBe(200);
    expect(await orphansOf(t, spaceId)).toEqual([]);
  });

  it('assets: a folder three levels deep goes with its files, originals and renditions', async () => {
    const base = `/api/app/spaces/${spaceId}/assets`;
    const folder = async (name: string, parentId?: string) => (await admin.post(`${base}/folders`, { name, parentId })).json().id as string;
    const image = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#88aa44' } })
      .jpeg()
      .toBuffer();
    const upload = async (filename: string, parentId: string) => {
      const body = multipart({ parentId }, { filename, type: 'image/jpeg', bytes: image });
      const response = await t.request({
        method: 'POST',
        url: `${base}/files`,
        headers: { ...XHR, cookie, 'content-type': body.contentType },
        payload: body.payload,
      });
      expect(response.statusCode, response.body).toBe(201);
      return response.json().id as string;
    };

    // photos/2026/june with an image at every level; a sibling folder that must stay.
    const photos = await folder('Photos');
    const year = await folder('2026', photos);
    const june = await folder('June', year);
    const files = [await upload('a.jpg', photos), await upload('b.jpg', year), await upload('c.jpg', june)];
    const deleted = [photos, year, june, ...files];
    const logos = await folder('Logos');
    const logo = await upload('logo.jpg', logos);

    // Pre-check: every file stored with a thumbnail rendition next to its original.
    for (const id of [...files, logo]) {
      expect((await cdn(`/api/v1/spaces/${spaceId}/assets/${id}?w=40&thumbnail`)).statusCode).toBe(200);
    }
    await t.app.get(StorageSweeperService).whenIdle();
    expect((await storedAssetDirs(t, spaceId)).sort()).toEqual([...files, logo].sort());
    for (const id of files) {
      expect(await readdir(join(t.storageDir, `spaces/${spaceId}/assets/${id}/renditions`))).not.toEqual([]);
    }
    expect(await orphansOf(t, spaceId)).toEqual([]);

    // Action
    expect((await admin.delete(`${base}/${photos}`)).statusCode).toBe(204);
    await t.app.get(StorageSweeperService).whenIdle();

    // Post-check: no rows, no stored files (originals and renditions), nothing queued; the sibling stays.
    expect(
      await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, deleted))),
    ).toEqual([]);
    expect(await storedAssetDirs(t, spaceId)).toEqual([logo]);
    for (const id of files) expect((await cdn(`/api/v1/spaces/${spaceId}/assets/${id}/original`)).statusCode).toBe(404);
    expect((await cdn(`/api/v1/spaces/${spaceId}/assets/${logo}/original`)).statusCode).toBe(200);
    expect(await orphansOf(t, spaceId)).toEqual([]);
  });

  it('keeps the cascades the trees rely on', async () => {
    // Without these, deleting a folder would fail or leave its children (and a document's snapshots) behind.
    const cascades = (
      await t.db.execute(sql`
      select conrelid::regclass::text as child, confrelid::regclass::text as parent
      from pg_constraint where contype = 'f' and confdeltype = 'c'
        and conrelid::regclass::text in ('contents', 'assets', 'content_snapshots')
        and confrelid::regclass::text in ('contents', 'assets')`)
    ).rows as { child: string; parent: string }[];
    expect(cascades.map(it => `${it.child} → ${it.parent}`).sort()).toEqual([
      'assets → assets',
      'content_snapshots → contents',
      'contents → contents',
    ]);
  });
});

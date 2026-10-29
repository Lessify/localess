import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { api, createTestApp, multipart, TestApp, userWithAccess, XHR } from './test-app.js';

type Row = { id: string; kind: string; name: string; type?: string; size?: number };
type Page = { items: Row[]; page: number; size: number; total: number };

/**
 * `GET …/assets`: one page, folders first, then by the sort; a folder's children (the root by default) or, with
 * `deep`, everything under it; kind, file type (folders stay), search (the name).
 *
 * The tree:  Images/ (Photos/ (Sunset.jpg), logo.png), Docs/ (terms.pdf), readme.txt, clip.mp4, "50% off.png"
 */
describe('app API: assets paging', () => {
  let t: TestApp;
  let cookie: string;
  let admin: ReturnType<typeof api>;
  let base: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    t = await createTestApp();
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    admin = api(t, cookie);
    base = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'One' })).json().id}/assets`;
    const folder = async (name: string, parentId?: string) => {
      const response = await admin.post(`${base}/folders`, { name, ...(parentId ? { parentId } : {}) });
      expect(response.statusCode, response.body).toBe(201);
      ids[name] = response.json().id;
    };
    const file = async (filename: string, type: string, bytes: number, parentId = '') => {
      const body = multipart({ parentId }, { filename, type, bytes: Buffer.alloc(bytes, 1) });
      const response = await t.request({
        method: 'POST',
        url: `${base}/files`,
        headers: { ...XHR, cookie, 'content-type': body.contentType },
        payload: body.payload,
      });
      expect(response.statusCode, response.body).toBe(201);
      ids[response.json().name] = response.json().id;
    };
    await folder('Images');
    await folder('Docs');
    await folder('Photos', ids['Images']);
    await file('readme.txt', 'text/plain', 30);
    await file('clip.mp4', 'video/mp4', 50);
    await file('50% off.png', 'image/png', 10);
    await file('logo.png', 'image/png', 20, ids['Images']);
    await file('Sunset.jpg', 'image/jpeg', 40, ids['Photos']);
    await file('terms.pdf', 'application/pdf', 30, ids['Docs']);
  });

  afterAll(() => t?.close());

  const list = async (query = ''): Promise<Page> => {
    const response = await admin.get(`${base}${query ? `?${query}` : ''}`);
    expect(response.statusCode, response.body).toBe(200);
    return response.json();
  };
  const names = async (query = '') => (await list(query)).items.map(it => it.name);

  it('lists the root by default: folders first, then by name (case-insensitive), 20 a page', async () => {
    expect(await list()).toMatchObject({ page: 0, size: 20, total: 5 });
    expect(await names()).toEqual(['Docs', 'Images', '50% off', 'clip', 'readme']);
  });

  it('lists a folder: its children only', async () => {
    expect(await list(`parentId=${ids['Images']}`)).toMatchObject({ total: 2, items: [{ name: 'Photos' }, { name: 'logo' }] });
  });

  it('with deep, everything under the folder at any depth; under the root, the whole space', async () => {
    expect(await names(`parentId=${ids['Images']}&deep=true`)).toEqual(['Photos', 'logo', 'Sunset']);
    expect((await list('deep=true')).total).toBe(9);
    expect(await names('deep=false')).toEqual(await names());
  });

  it('pages: the next page and past the end, the total each time', async () => {
    expect(await list('deep=true&size=4')).toMatchObject({ total: 9, items: { length: 4 } });
    expect(await names('deep=true&size=4')).toEqual(['Docs', 'Images', 'Photos', '50% off']);
    expect(await names('deep=true&size=4&page=1')).toEqual(['clip', 'logo', 'readme', 'Sunset']);
    expect(await list('deep=true&size=4&page=3')).toMatchObject({ total: 9, items: [] });
  });

  it('pages equal values stably, without repeats, both ways', async () => {
    for (const direction of ['asc', 'desc']) {
      const seen: string[] = [];
      for (let page = 0; page < 3; page++) {
        seen.push(...(await list(`deep=true&sort=type&direction=${direction}&size=4&page=${page}`)).items.map(it => it.id));
      }
      expect(new Set(seen).size, direction).toBe(9);
    }
  });

  it('sorts by each field, folders first (by name) whatever the sort', async () => {
    expect(await names('direction=desc')).toEqual(['Images', 'Docs', 'readme', 'clip', '50% off']);
    expect(await names('deep=true&sort=size')).toEqual([
      'Docs',
      'Images',
      'Photos',
      '50% off',
      'logo',
      'readme',
      'terms',
      'Sunset',
      'clip',
    ]);
    expect(await names('deep=true&kind=FILE&sort=size&direction=desc')).toEqual(['clip', 'Sunset', 'readme', 'terms', 'logo', '50% off']);
    expect(await names('deep=true&kind=FILE&sort=type')).toEqual(['terms', 'Sunset', '50% off', 'logo', 'readme', 'clip']);
    expect(await names('sort=createdAt')).toEqual(['Images', 'Docs', 'readme', 'clip', '50% off']);
    await admin.patch(`${base}/${ids['readme']}`, { alt: 'Read me' });
    expect((await names('kind=FILE&sort=updatedAt&direction=desc'))[0]).toBe('readme');
  });

  it('filters by kind and by file type, folders kept to browse', async () => {
    expect(await names('kind=FOLDER&deep=true')).toEqual(['Docs', 'Images', 'Photos']);
    expect((await list('kind=FILE&deep=true')).total).toBe(6);
    expect(await names('fileType=IMAGE')).toEqual(['Docs', 'Images', '50% off']);
    expect(await names('fileType=IMAGE&kind=FILE&deep=true')).toEqual(['50% off', 'logo', 'Sunset']);
    expect(await names('fileType=VIDEO&kind=FILE&deep=true')).toEqual(['clip']);
    expect(await names('fileType=ANY')).toEqual(await names());
  });

  it('searches the name, anywhere, case-insensitive, wildcards literal', async () => {
    expect(await names('search=SUN&deep=true')).toEqual(['Sunset']);
    expect(await names('search=ead')).toEqual(['readme']);
    expect(await names('search=50%25')).toEqual(['50% off']);
    expect(await names('search=_&deep=true')).toEqual([]);
    // Within the folder unless deep.
    expect(await names('search=logo')).toEqual([]);
    expect(await names(`search=logo&parentId=${ids['Images']}`)).toEqual(['logo']);
  });

  it('refuses a query it can not read (400)', async () => {
    for (const query of [
      'sort=extension',
      'direction=up',
      'size=101',
      'page=-1',
      'kind=DOCUMENT',
      'parentId=not-a-uuid',
      'parentId=',
      'deep=yes',
      'fileType=image',
    ]) {
      expect((await admin.get(`${base}?${query}`)).statusCode, query).toBe(400);
    }
  });
});

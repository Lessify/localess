import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type FirebaseDocLike = { id: string } & Record<string, unknown>;

export interface FakeFirebaseSpace {
  id: string;
  name: string;
  doc: Record<string, unknown>;
  tokens?: FirebaseDocLike[];
  webhooks?: FirebaseDocLike[];
  schemas?: FirebaseDocLike[];
  translations?: FirebaseDocLike[];
  assets?: FirebaseDocLike[];
  contents?: FirebaseDocLike[];
  /** Asset id → bytes served at /api/v1/spaces/{space}/assets/{id}/original; absent ids answer 404. */
  files?: Record<string, Buffer>;
}

/** Plays a Firebase environment's migration API and asset `/original` route for import tests. */
export async function fakeFirebase(
  spaces: FakeFirebaseSpace[],
  /** `spa`: a Firebase Hosting site without the migration API, answering every path with its app's index.html. */
  options: { token?: string; pageSize?: number; failAfterFiles?: number; spa?: boolean } = {},
): Promise<{ url: string; requests: string[]; close(): Promise<void> }> {
  const token = options.token ?? 'migration-secret';
  const pageSize = options.pageSize ?? 500;
  const requests: string[] = [];
  let filesServed = 0;
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fake');
    requests.push(url.pathname + url.search);
    const json = (status: number, body: unknown) => response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    const file = /^\/api\/v1\/spaces\/([^/]+)\/assets\/([^/]+)\/original$/.exec(url.pathname);
    if (file) {
      if (options.failAfterFiles !== undefined && filesServed >= options.failAfterFiles) return void response.destroy();
      const bytes = spaces.find(it => it.id === file[1])?.files?.[file[2]];
      if (!bytes) return json(404, { message: 'Not found' });
      filesServed++;
      return void response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(bytes);
    }
    if (options.spa) return void response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Localess</title>');
    if (url.pathname.startsWith('/moved/')) return void response.writeHead(302, { location: 'http://169.254.169.254/' }).end();
    if (!url.pathname.startsWith('/api/migration/')) return json(404, { message: 'Not found' });
    if (request.headers.authorization !== `Bearer ${token}`) return json(401, { message: 'Missing or invalid migration token' });
    const parts = url.pathname.split('/').slice(3); // ['spaces', id?, collection?]
    if (parts.length === 1) return json(200, spaces.map(it => ({ id: it.id, name: it.name, createdAt: it.doc['createdAt'] })));
    const space = spaces.find(it => it.id === parts[1]);
    if (!space) return json(404, { message: 'Space not found' });
    if (parts.length === 2) return json(200, { id: space.id, name: space.name, ...space.doc });
    const items = (space as unknown as Record<string, FirebaseDocLike[] | undefined>)[parts[2]] ?? [];
    if (['tokens', 'webhooks', 'schemas'].includes(parts[2])) return json(200, items);
    const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
    const cursor = url.searchParams.get('cursor');
    const from = cursor ? sorted.filter(it => it.id > cursor) : sorted;
    const page = from.slice(0, pageSize);
    return json(200, { items: page, cursor: page.length === pageSize ? page[page.length - 1].id : null });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => new Promise(resolve => server.close(() => resolve())),
  };
}

import http, { IncomingMessage } from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { checkWebhookUrl, guardedLookup } from '../webhooks/webhook-request.js';

export type FirebaseDoc = { id: string } & Record<string, unknown>;

/** Why a Firebase environment could not be read, worded for the admin. */
export class FirebaseConnectionError extends Error {
  constructor(
    readonly reason: 'unreachable' | 'unauthorized' | 'disabled' | 'failed',
    message: string,
  ) {
    super(message);
  }
}

/** A page body is at most 500 documents; this caps a hostile or broken server, not real data. */
const MAX_JSON_BYTES = 256 * 1024 * 1024;

/**
 * The origin without trailing slashes, held to the rules of a webhook URL: public `https` hosts on the default port
 * only, unless internal hosts are allowed (`LOCALESS_WEBHOOK_ALLOW_INTERNAL`, local development and tests).
 */
export function normalizeOrigin(origin: string, allowInternal = false): string {
  const checked = checkWebhookUrl(origin, allowInternal);
  if (!checked.ok) throw new FirebaseConnectionError('failed', `The origin is not allowed: ${checked.reason}`);
  return `${checked.url.origin}${checked.url.pathname}`.replace(/\/+$/, '');
}

/**
 * The read-only migration API of a Firebase-era Localess environment (`/api/migration/**`, bearer migration token),
 * plus its public asset `/original` route for files. Requests go through the webhook network guard: the address
 * actually connected to must be public (unless internal hosts are allowed), and redirects are never followed.
 */
export class FirebaseClient {
  /** The normalised origin, recorded on the import run. */
  readonly origin: string;
  private readonly allowInternal: boolean;

  constructor(
    origin: string,
    private readonly token: string,
    options: { allowInternal?: boolean } = {},
  ) {
    this.allowInternal = options.allowInternal ?? false;
    this.origin = normalizeOrigin(origin, this.allowInternal);
  }

  private request(url: string, headers: Record<string, string> = {}): Promise<IncomingMessage> {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    return new Promise((resolve, reject) => {
      const req = transport.get(target, { headers, lookup: this.allowInternal ? undefined : (guardedLookup as never) }, resolve);
      req.on('error', error => reject(new FirebaseConnectionError('unreachable', `Cannot reach ${this.origin}: ${error.message}`)));
    });
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.request(`${this.origin}/api/migration${path}`, { authorization: `Bearer ${this.token}` });
    const status = response.statusCode ?? 0;
    const isJson = (response.headers['content-type'] ?? '').includes('application/json');
    const disabled = 'The migration API is not enabled on this environment (Admin → Settings → Migration)';
    if (status === 401) {
      response.resume();
      throw new FirebaseConnectionError('unauthorized', 'The migration token was refused');
    }
    // A Firebase environment without the migration API answers with its app (200, HTML) or 404.
    if (path === '/spaces' && (status === 404 || (status === 200 && !isJson))) {
      response.resume();
      throw new FirebaseConnectionError('disabled', disabled);
    }
    if (status !== 200 || !isJson) {
      response.resume();
      throw new FirebaseConnectionError('failed', `GET /api/migration${path} answered ${status}${isJson ? '' : ' without JSON'}`);
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of response) {
      size += (chunk as Buffer).length;
      if (size > MAX_JSON_BYTES) {
        response.destroy();
        throw new FirebaseConnectionError('failed', `GET /api/migration${path} answered more than ${MAX_JSON_BYTES} bytes`);
      }
      chunks.push(chunk as Buffer);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
    } catch {
      throw new FirebaseConnectionError(path === '/spaces' ? 'disabled' : 'failed', path === '/spaces' ? disabled : `GET /api/migration${path} answered invalid JSON`);
    }
  }

  async spaces(): Promise<{ id: string; name: string; createdAt?: string }[]> {
    const spaces = await this.get<unknown>('/spaces');
    if (!Array.isArray(spaces)) throw new FirebaseConnectionError('disabled', 'The migration API is not enabled on this environment (Admin → Settings → Migration)');
    return spaces as { id: string; name: string; createdAt?: string }[];
  }

  space(id: string): Promise<FirebaseDoc> {
    return this.get(`/spaces/${encodeURIComponent(id)}`);
  }

  list(spaceId: string, name: 'tokens' | 'webhooks' | 'schemas'): Promise<FirebaseDoc[]> {
    return this.get(`/spaces/${encodeURIComponent(spaceId)}/${name}`);
  }

  async *pages(spaceId: string, name: 'translations' | 'assets' | 'contents'): AsyncGenerator<FirebaseDoc[]> {
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const page: { items: FirebaseDoc[]; cursor: string | null } = await this.get(`/spaces/${encodeURIComponent(spaceId)}/${name}${query}`);
      if (page.items.length) yield page.items;
      cursor = page.cursor;
    } while (cursor);
  }

  /** The stored original of an asset, or null when Firebase has no file for it. */
  async assetFile(spaceId: string, assetId: string): Promise<Readable | null> {
    const response = await this.request(
      `${this.origin}/api/v1/spaces/${encodeURIComponent(spaceId)}/assets/${encodeURIComponent(assetId)}/original`,
    ).catch(error => {
      throw new FirebaseConnectionError('unreachable', `Cannot download asset ${assetId}: ${(error as Error).message}`);
    });
    if (response.statusCode === 404) {
      response.resume();
      return null;
    }
    if (response.statusCode !== 200) {
      response.resume();
      throw new FirebaseConnectionError('failed', `Asset ${assetId} answered ${response.statusCode}`);
    }
    return response;
  }
}

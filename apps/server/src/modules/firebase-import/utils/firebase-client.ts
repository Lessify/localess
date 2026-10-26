import http, { IncomingMessage } from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

import { checkWebhookUrl, guardedLookup } from '../../../shared/utils/webhook-request.js';

export type FirebaseDoc = { id: string } & Record<string, unknown>;

/** Why a Firebase environment could not be read, worded for the admin. */
export class FirebaseConnectionError extends Error {
  constructor(
    /**
     * `tooLarge`: Firebase refuses the file as too large (413, over what Hosting carries); `server-error`: it still
     * answered 5xx after three tries. The import goes on without the file in both cases.
     */
    readonly reason: 'unreachable' | 'unauthorized' | 'disabled' | 'failed' | 'tooLarge' | 'server-error',
    message: string,
  ) {
    super(message);
  }
}

/**
 * The start of a plain-text answer (at most 500 characters), else an empty string; the rest is discarded. Firebase
 * says there why it could not serve a file.
 */
async function shortText(response: IncomingMessage): Promise<string> {
  if (!(response.headers['content-type'] ?? '').startsWith('text/plain')) {
    response.resume();
    return '';
  }
  let text = '';
  for await (const chunk of response) {
    text += (chunk as Buffer).toString('utf8');
    if (text.length >= 500) break;
  }
  response.destroy();
  return text.slice(0, 500).trim();
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
  private readonly retryDelayMs: number;

  constructor(
    origin: string,
    private readonly token: string,
    options: { allowInternal?: boolean; retryDelayMs?: number } = {},
  ) {
    this.allowInternal = options.allowInternal ?? false;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
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
      throw new FirebaseConnectionError(
        path === '/spaces' ? 'disabled' : 'failed',
        path === '/spaces' ? disabled : `GET /api/migration${path} answered invalid JSON`,
      );
    }
  }

  async spaces(): Promise<{ id: string; name: string; createdAt?: string }[]> {
    const spaces = await this.get<unknown>('/spaces');
    if (!Array.isArray(spaces))
      throw new FirebaseConnectionError('disabled', 'The migration API is not enabled on this environment (Admin → Settings → Migration)');
    return spaces as { id: string; name: string; createdAt?: string }[];
  }

  space(id: string): Promise<FirebaseDoc> {
    return this.get(`/spaces/${encodeURIComponent(id)}`);
  }

  list(spaceId: string, name: 'webhooks' | 'schemas'): Promise<FirebaseDoc[]> {
    return this.get(`/spaces/${encodeURIComponent(spaceId)}/${name}`);
  }

  async *pages(spaceId: string, name: 'translations' | 'assets' | 'contents'): AsyncGenerator<FirebaseDoc[]> {
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const page: { items: FirebaseDoc[]; cursor: string | null } = await this.get(
        `/spaces/${encodeURIComponent(spaceId)}/${name}${query}`,
      );
      if (page.items.length) yield page.items;
      cursor = page.cursor;
    } while (cursor);
  }

  /**
   * The stored original of an asset, or null when Firebase has no file for it. A file Firebase refuses as too large
   * (413, over 31 MiB) throws `tooLarge` with Firebase's reason. A server error is tried three times, then throws
   * `server-error`. Any other answer but 200 throws `failed`. The reason Firebase gave in plain text is in the message.
   */
  async assetFile(spaceId: string, assetId: string): Promise<Readable | null> {
    const url = `${this.origin}/api/v1/spaces/${encodeURIComponent(spaceId)}/assets/${encodeURIComponent(assetId)}/original`;
    for (let attempt = 1; ; attempt++) {
      const response = await this.request(url).catch(error => {
        throw new FirebaseConnectionError('unreachable', `Cannot download asset ${assetId}: ${(error as Error).message}`);
      });
      const status = response.statusCode ?? 0;
      if (status === 200) return response;
      if (status === 404) {
        response.resume();
        return null;
      }
      const reason = await shortText(response);
      const because = reason ? `: ${reason}` : '';
      // Firebase Hosting cuts a function's answer at 32 MiB, so Firebase refuses a larger file with 413 and says why.
      if (status === 413) throw new FirebaseConnectionError('tooLarge', reason || `Asset ${assetId} is too large for Firebase to serve`);
      if (status < 500) throw new FirebaseConnectionError('failed', `Asset ${assetId} answered ${status}${because}`);
      if (attempt === 3)
        throw new FirebaseConnectionError('server-error', `Asset ${assetId} answered ${status} ${attempt} times${because}`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempt));
    }
  }
}

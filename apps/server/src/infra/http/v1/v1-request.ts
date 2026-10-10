import type { FastifyReply } from 'fastify';
import type { ApiToken } from '../../../auth/api-tokens/token-auth.service.js';
import type { SpaceRow } from '../space-access.js';
import {
  CACHE_BAD_REQUEST_MAX_AGE,
  CACHE_MAX_AGE,
  CACHE_REDIRECT_MAX_AGE_DEFAULT,
  CACHE_SHARE_MAX_AGE,
  publicCache,
} from './cache-control.js';
import { isValidId } from './id-param.js';
import { sendV1Error } from './v1-response.js';

/*
 * Request plumbing shared by every public /api/v1 controller (was the `CDN`, dev-tools and manage Express
 * routers in functions/src/v1).
 */

export type Params = Record<string, string>;
export type Query = Record<string, string | undefined>;

export const CONTENT_CACHE = publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE);

/** `?version=draft` reads drafts; any other value (or none) reads published content, as before. */
export const isDraft = (version: unknown): boolean => version === 'draft';

/** Same rule as functions `identifySpaceLocale`: unknown or missing locales use the default locale. */
export function identifySpaceLocale(space: Pick<SpaceRow, 'locales' | 'defaultLocaleId'>, locale: unknown): string {
  if (typeof locale === 'string' && space.locales.some(it => it.id === locale)) return locale;
  return space.defaultLocaleId;
}

/** Route params naming a stored object; validated before anything else runs (was `validateIdParams`). */
export function validIdParams(reply: FastifyReply, params: Params): boolean {
  for (const name of ['spaceId', 'contentId', 'assetId']) {
    if (name in params && !isValidId(params[name])) {
      sendV1Error(reply, 400, 'invalid-argument', `Invalid '${name}'.`, { cacheControl: publicCache(CACHE_BAD_REQUEST_MAX_AGE) });
      return false;
    }
  }
  return true;
}

/** The `cv` cache-busting redirect; V2 tokens may set its TTL (`cacheTtl: 0` disables caching). */
export function redirectToVersion(reply: FastifyReply, url: string, token: ApiToken): void {
  const ttl = token.version === 2 ? (token.cacheTtl ?? undefined) : undefined;
  void reply.header('cache-control', ttl === 0 ? 'no-cache' : publicCache(ttl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT)).redirect(url, 302);
}

/** Whether the request's `cv` is missing or stale, so it must be redirected to the current version. */
export const needsRedirect = (cv: unknown, version: number) => cv === undefined || String(cv) !== String(version);

export function sendJson(reply: FastifyReply, body: unknown): void {
  void reply.header('cache-control', CONTENT_CACHE).type('application/json; charset=utf-8').send(JSON.stringify(body));
}

/** Answers 404 (cached like content) when the space doesn't exist; narrows `space` when it does. */
export function requireV1Space(reply: FastifyReply, space: SpaceRow | undefined, cacheControl = CONTENT_CACHE): space is SpaceRow {
  if (!space) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl });
  return space !== undefined;
}

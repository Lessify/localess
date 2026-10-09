import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContentDocumentApi, ContentKind, TokenPermission } from '@localess/shared';
import { Public } from '../auth/decorators.js';
import { AssetDeliveryService } from './asset-delivery.service.js';
import { CACHE_MAX_AGE, CACHE_REDIRECT_MAX_AGE_DEFAULT, CACHE_SHARE_MAX_AGE, publicCache, TEN_MINUTES } from './cache-control.js';
import { isValidId } from './lib/id-param.js';
import { buildTranslationMap, identifySpaceLocale, isDraft, PublicContentService, SpaceRow } from './public-content.service.js';
import { ApiToken, TokenAuthService } from './token-auth.service.js';
import { q, sendV1Error } from './v1-response.js';
import { CACHE_BAD_REQUEST_MAX_AGE } from './cache-control.js';

type Params = Record<string, string>;
type Query = Record<string, string | undefined>;

const CONTENT_CACHE = publicCache(CACHE_MAX_AGE, CACHE_SHARE_MAX_AGE);
const TEN_MINUTE_CACHE = publicCache(TEN_MINUTES);
const FILE_NOT_FOUND = 'File not found, on path. Please Publish again. The content is cached for 10 minutes.';

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
function redirectToVersion(reply: FastifyReply, url: string, token: ApiToken): void {
  const ttl = token.version === 2 ? (token.cacheTtl ?? undefined) : undefined;
  void reply.header('cache-control', ttl === 0 ? 'no-cache' : publicCache(ttl ?? CACHE_REDIRECT_MAX_AGE_DEFAULT)).redirect(url, 302);
}

const needsRedirect = (cv: unknown, version: number) => cv === undefined || String(cv) !== String(version);

function sendJson(reply: FastifyReply, body: unknown): void {
  void reply.header('cache-control', CONTENT_CACHE).type('application/json; charset=utf-8').send(JSON.stringify(body));
}

/**
 * The public delivery API (was the `CDN` Express router in functions/src/v1/cdn.ts). URLs, query
 * parameters, status codes, bodies and Cache-Control values are unchanged; `cv` is now the space's
 * content/translation version counter instead of a GCS generation number.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class CdnController {
  constructor(
    private readonly content: PublicContentService,
    private readonly tokens: TokenAuthService,
    private readonly assetDelivery: AssetDeliveryService,
  ) {}

  private async space(reply: FastifyReply, spaceId: string, notFoundCache = CONTENT_CACHE): Promise<SpaceRow | undefined> {
    const space = await this.content.findSpace(spaceId);
    if (!space) sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: notFoundCache });
    return space;
  }

  @Get('translations/:locale')
  async translations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const { spaceId, locale } = params;
    const { cv, version, token: tokenId } = request.query as Query;
    const draft = version !== undefined;
    const token = await this.tokens.authorize(
      reply,
      spaceId,
      tokenId,
      draft
        ? [TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS]
        : [TokenPermission.TRANSLATION_PUBLIC, TokenPermission.TRANSLATION_DRAFT, TokenPermission.DEV_TOOLS],
      {
        cached: true,
        reason: draft
          ? 'This request includes a `version` query parameter, which requires access to draft translations.'
          : 'Published translation requires the TRANSLATION_PUBLIC, TRANSLATION_DRAFT, or DEV_TOOLS permission.',
      },
    );
    if (!token) return;

    const space = await this.space(reply, spaceId);
    if (!space) return;
    if (needsRedirect(cv, space.translationVersion)) {
      let url = `/api/v1/spaces/${spaceId}/translations/${q(locale)}?cv=${space.translationVersion}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      redirectToVersion(reply, url, token);
      return;
    }

    const actualLocale = space.locales.some(it => it.id === locale) ? locale : space.localeFallback.id;
    let values: Record<string, string> | undefined;
    if (isDraft(version)) {
      values = buildTranslationMap(await this.content.findTranslations(spaceId), actualLocale, space.localeFallback.id).values;
    } else {
      values =
        (await this.content.findPublishedTranslations(spaceId, actualLocale)) ??
        (actualLocale !== space.localeFallback.id
          ? await this.content.findPublishedTranslations(spaceId, space.localeFallback.id)
          : undefined);
    }
    if (!values) {
      sendV1Error(reply, 404, 'not-found', 'File not found, Publish first.');
      return;
    }
    sendJson(reply, values);
  }

  @Get('links')
  async links(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const { spaceId } = params;
    const { kind, parentSlug, excludeChildren, cv, token: tokenId } = request.query as Query;
    const token = await this.tokens.authorize(
      reply,
      spaceId,
      tokenId,
      [TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS],
      { cached: true },
    );
    if (!token) return;

    const space = await this.space(reply, spaceId);
    if (!space) return;
    const validKind = kind === ContentKind.DOCUMENT || kind === ContentKind.FOLDER ? kind : undefined;
    if (needsRedirect(cv, space.contentVersion)) {
      let url = `/api/v1/spaces/${spaceId}/links?cv=${space.contentVersion}`;
      if (parentSlug !== undefined) url += `&parentSlug=${q(parentSlug)}`;
      if (excludeChildren === 'true') url += `&excludeChildren=${q(excludeChildren)}`;
      if (validKind) url += `&kind=${q(validKind)}`;
      url += `&token=${q(tokenId)}`;
      redirectToVersion(reply, url, token);
      return;
    }
    sendJson(reply, await this.content.listLinks(spaceId, { parentSlug, excludeChildren: excludeChildren === 'true', kind: validKind }));
  }

  @Get('contents/slugs/*')
  async contentBySlug(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const token = await this.authorizeContent(request, reply, params['spaceId']);
    if (!token) return;
    const { spaceId } = params;
    const fullSlug = params['*'] ?? '';

    const space = await this.space(reply, spaceId);
    if (!space) return;
    const contentId = await this.content.findContentIdByFullSlug(spaceId, fullSlug);
    if (!contentId) {
      sendV1Error(reply, 404, 'not-found', 'Slug not found');
      return;
    }
    const path = `/api/v1/spaces/${spaceId}/contents/slugs/${fullSlug.split('/').map(q).join('/')}`;
    await this.sendContent(request, reply, token, space, contentId, path);
  }

  @Get('contents/:contentId')
  async contentById(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const token = await this.authorizeContent(request, reply, params['spaceId']);
    if (!token) return;
    const { spaceId, contentId } = params;

    const space = await this.space(reply, spaceId);
    if (!space) return;
    await this.sendContent(request, reply, token, space, contentId, `/api/v1/spaces/${spaceId}/contents/${q(contentId)}`);
  }

  private authorizeContent(request: FastifyRequest, reply: FastifyReply, spaceId: string): Promise<ApiToken | undefined> {
    const { token: tokenId, version } = request.query as Query;
    const draft = version !== undefined;
    return this.tokens.authorize(
      reply,
      spaceId,
      tokenId,
      draft
        ? [TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS]
        : [TokenPermission.CONTENT_PUBLIC, TokenPermission.CONTENT_DRAFT, TokenPermission.DEV_TOOLS],
      {
        cached: true,
        reason: draft
          ? 'This request includes a `version` query parameter, which requires access to draft content.'
          : 'Published content requires the CONTENT_PUBLIC, CONTENT_DRAFT, or DEV_TOOLS permission.',
      },
    );
  }

  private async sendContent(
    request: FastifyRequest,
    reply: FastifyReply,
    token: ApiToken,
    space: SpaceRow,
    contentId: string,
    path: string,
  ): Promise<void> {
    const { cv, locale, version, token: tokenId, resolveReference, resolveLink, resolveAsset } = request.query as Query;
    if (needsRedirect(cv, space.contentVersion)) {
      let url = `${path}?cv=${space.contentVersion}`;
      if (locale) url += `&locale=${q(locale)}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      if (resolveReference) url += `&resolveReference=${q(resolveReference)}`;
      if (resolveLink) url += `&resolveLink=${q(resolveLink)}`;
      if (resolveAsset) url += `&resolveAsset=${q(resolveAsset)}`;
      redirectToVersion(reply, url, token);
      return;
    }

    const actualLocale = identifySpaceLocale(space, locale);
    const found = await this.content.findLocaleDocument(space, contentId, actualLocale, version);
    if (!found) {
      sendV1Error(reply, 404, 'not-found', FILE_NOT_FOUND, { cacheControl: TEN_MINUTE_CACHE });
      return;
    }
    const { assets, links, references, ...rest } = found.document;
    const response: ContentDocumentApi = { ...rest };
    if (resolveAsset === 'true' && assets?.length) {
      response.assets = await this.content.resolveAssets(space.id, assets);
    }
    if (resolveLink === 'true' && links?.length) {
      response.links = await this.content.resolveLinks(space.id, links);
    }
    if (resolveReference === 'true' && references?.length) {
      response.references = await this.content.resolveReferences(space.id, references, found.resolvedLocale, version);
    }
    sendJson(reply, response);
  }

  @Get('assets/:assetId')
  async asset(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveTransformed(request, reply, params['spaceId'], params['assetId']);
  }

  @Get('assets/:assetId/original')
  async assetOriginal(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveStored(request, reply, params['spaceId'], params['assetId'], false);
  }

  @Get('assets/:assetId/download')
  async assetDownload(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    await this.assetDelivery.serveStored(request, reply, params['spaceId'], params['assetId'], true);
  }
}

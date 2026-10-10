import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ContentDocumentApi, ContentKind, TokenPermission } from '@localess/shared';
import { ApiToken, TokenAuthService } from '../../auth/api-tokens/token-auth.service.js';
import { isUuid } from '../../infra/database/id.js';
import { Public } from '../../auth/decorators.js';
import { SpaceRow } from '../../infra/http/space-access.js';
import { publicCache, TEN_MINUTES } from '../../infra/http/v1/cache-control.js';
import {
  identifySpaceLocale,
  needsRedirect,
  Params,
  Query,
  redirectToVersion,
  requireV1Space,
  sendJson,
  validIdParams,
} from '../../infra/http/v1/v1-request.js';
import { q, sendV1Error } from '../../infra/http/v1/v1-response.js';
import { SpacesService } from '../spaces/spaces.service.js';
import { ContentDeliveryService } from './content-delivery.service.js';

const TEN_MINUTE_CACHE = publicCache(TEN_MINUTES);
const FILE_NOT_FOUND = 'File not found, on path. Please Publish again. The content is cached for 10 minutes.';

/**
 * Content on the public API (`?token=`, cached behind `cv`): links, documents by slug or id, with optional
 * reference/link/asset resolution. Ported from functions/src/v1/cdn.ts; URLs, query parameters, status codes,
 * bodies and Cache-Control values are unchanged.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class ContentsPublicController {
  constructor(
    private readonly spaces: SpacesService,
    private readonly delivery: ContentDeliveryService,
    private readonly tokens: TokenAuthService,
  ) {}

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

    const space = await this.spaces.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
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
    sendJson(reply, await this.delivery.listLinks(spaceId, { parentSlug, excludeChildren: excludeChildren === 'true', kind: validKind }));
  }

  @Get('contents/slugs/*')
  async contentBySlug(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return;
    const token = await this.authorizeContent(request, reply, params['spaceId']);
    if (!token) return;
    const { spaceId } = params;
    const fullSlug = params['*'] ?? '';

    const space = await this.spaces.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    const contentId = await this.delivery.findContentIdByFullSlug(spaceId, fullSlug);
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

    const space = await this.spaces.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    // The Firestore id of a document imported from Firebase: redirect, like a stale `cv`, to the UUID URL.
    const id = isUuid(contentId) ? contentId : ((await this.delivery.findContentIdByLegacyId(spaceId, contentId)) ?? contentId);
    await this.sendContent(request, reply, token, space, id, `/api/v1/spaces/${spaceId}/contents/${q(id)}`, id !== contentId);
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
    redirect = false,
  ): Promise<void> {
    const { cv, locale, version, token: tokenId, resolveReference, resolveLink, resolveAsset } = request.query as Query;
    if (redirect || needsRedirect(cv, space.contentVersion)) {
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
    const found = await this.delivery.findLocaleDocument(space, contentId, actualLocale, version);
    if (!found) {
      sendV1Error(reply, 404, 'not-found', FILE_NOT_FOUND, { cacheControl: TEN_MINUTE_CACHE });
      return;
    }
    const { assets, links, references, ...rest } = found.document;
    const response: ContentDocumentApi = { ...rest };
    if (resolveAsset === 'true' && assets?.length) {
      response.assets = await this.delivery.resolveAssets(space.id, assets);
    }
    if (resolveLink === 'true' && links?.length) {
      response.links = await this.delivery.resolveLinks(space.id, links);
    }
    if (resolveReference === 'true' && references?.length) {
      response.references = await this.delivery.resolveReferences(space.id, references, found.resolvedLocale, version);
    }
    sendJson(reply, response);
  }
}

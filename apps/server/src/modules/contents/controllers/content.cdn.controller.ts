import { ContentDocumentApi, ContentKind, TokenType } from '@localess/shared';
import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentToken } from '../../../auth/request-context.js';
import { CdnToken } from '../../../auth/token-auth.decorators.js';
import type { ApiToken } from '../../../auth/utils/api-token.js';
import { publicCache, TEN_MINUTES } from '../../../infra/http/v1/cache-control.js';
import {
  identifySpaceLocale,
  needsRedirect,
  Params,
  Query,
  redirectToVersion,
  requireV1Space,
  sendJson,
} from '../../../infra/http/v1/v1-request.js';
import { q, sendV1Error } from '../../../infra/http/v1/v1-response.js';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { ContentDeliveryService } from '../services/content-delivery.service.js';

const TEN_MINUTE_CACHE = publicCache(TEN_MINUTES);
const FILE_NOT_FOUND = 'File not found, on path. Please Publish again. The content is cached for 10 minutes.';

/**
 * Content on the CDN API (`?token=` with a public or preview token, checked by `@CdnToken`; cached behind `cv`): links, documents by slug or id, with optional
 * reference/link/asset resolution. Ported from functions/src/v1/cdn.ts; URLs, query parameters, status codes,
 * bodies and Cache-Control values are unchanged. Each document and each links list answers to its own `cv`, the
 * `built_at` of its snapshot; `/links` lists published documents only, unless `version` (draft) is given.
 */
@CdnToken({
  published: TokenType.PUBLIC,
  draft: TokenType.PREVIEW,
  reason: {
    published: 'Published content requires a public or preview token.',
    draft: 'This request includes a `version` query parameter, which requires a preview token.',
  },
})
@Controller('api/v1/spaces/:spaceId')
export class ContentCdnController {
  constructor(private readonly contentDeliveryService: ContentDeliveryService) {}

  @Get('links')
  async links(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @CurrentToken() token: ApiToken): Promise<void> {
    const { spaceId } = request.params as Params;
    const { kind, parentSlug, excludeChildren, cv, version, token: tokenId } = request.query as Query;

    const space = await this.contentDeliveryService.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    const validKind = kind === ContentKind.DOCUMENT || kind === ContentKind.FOLDER ? kind : undefined;
    const { links, builtAt } = await this.contentDeliveryService.findLinks(spaceId, version, {
      parentSlug,
      excludeChildren: excludeChildren === 'true',
      kind: validKind,
    });
    const current = builtAt.getTime();
    if (needsRedirect(cv, current)) {
      let url = `/api/v1/spaces/${spaceId}/links?cv=${current}`;
      if (parentSlug !== undefined) url += `&parentSlug=${q(parentSlug)}`;
      if (excludeChildren === 'true') url += `&excludeChildren=${q(excludeChildren)}`;
      if (validKind) url += `&kind=${q(validKind)}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      redirectToVersion(reply, url, token);
      return;
    }
    sendJson(reply, links);
  }

  @Get('contents/slugs/*')
  async contentBySlug(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @CurrentToken() token: ApiToken): Promise<void> {
    const params = request.params as Params;
    const { spaceId } = params;
    const fullSlug = params['*'] ?? '';

    const space = await this.contentDeliveryService.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    const contentId = await this.contentDeliveryService.findContentIdByFullSlug(spaceId, fullSlug);
    if (!contentId) {
      sendV1Error(reply, 404, 'not-found', 'Slug not found');
      return;
    }
    const path = `/api/v1/spaces/${spaceId}/contents/slugs/${fullSlug.split('/').map(q).join('/')}`;
    await this.sendContent(request, reply, token, space, contentId, path);
  }

  @Get('contents/:contentId')
  async contentById(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @CurrentToken() token: ApiToken): Promise<void> {
    const { spaceId, contentId } = request.params as Params;

    const space = await this.contentDeliveryService.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    await this.sendContent(request, reply, token, space, contentId, `/api/v1/spaces/${spaceId}/contents/${q(contentId)}`);
  }

  private async sendContent(
    request: FastifyRequest,
    reply: FastifyReply,
    token: ApiToken,
    space: SpaceWithLocales,
    contentId: string,
    path: string,
  ): Promise<void> {
    const { cv, locale, version, token: tokenId, resolveReference, resolveLink, resolveAsset } = request.query as Query;
    const actualLocale = identifySpaceLocale(space, locale);
    const found = await this.contentDeliveryService.findLocaleDocument(space, contentId, actualLocale, version);
    if (!found) {
      sendV1Error(reply, 404, 'not-found', FILE_NOT_FOUND, { cacheControl: TEN_MINUTE_CACHE });
      return;
    }
    const current = found.builtAt.getTime();
    if (needsRedirect(cv, current)) {
      let url = `${path}?cv=${current}`;
      if (locale) url += `&locale=${q(locale)}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      if (resolveReference) url += `&resolveReference=${q(resolveReference)}`;
      if (resolveLink) url += `&resolveLink=${q(resolveLink)}`;
      if (resolveAsset) url += `&resolveAsset=${q(resolveAsset)}`;
      redirectToVersion(reply, url, token);
      return;
    }
    const { assets, links, references, ...rest } = found.document;
    const response: ContentDocumentApi = { ...rest };
    if (resolveAsset === 'true' && assets?.length) {
      response.assets = await this.contentDeliveryService.resolveAssets(space.id, assets);
    }
    if (resolveLink === 'true' && links?.length) {
      response.links = await this.contentDeliveryService.resolveLinks(space.id, links);
    }
    if (resolveReference === 'true' && references?.length) {
      response.references = await this.contentDeliveryService.resolveReferences(space.id, references, found.resolvedLocale, version);
    }
    sendJson(reply, response);
  }
}

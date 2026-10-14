import { Controller, Get, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenType } from '@localess/shared';
import { CurrentToken } from '../../../auth/request-context.js';
import { CdnToken } from '../../../auth/token-auth.decorators.js';
import type { ApiToken } from '../../../auth/utils/api-token.js';
import {
  identifySpaceLocale,
  isDraft,
  needsRedirect,
  Params,
  Query,
  redirectToVersion,
  requireV1Space,
  sendJson,
} from '../../../infra/http/v1/v1-request.js';
import { q, sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { TranslationDeliveryService } from '../services/translation-delivery.service.js';

/**
 * Translations on the CDN API: the published (or draft) map for a locale (`?token=` with a public or preview token,
 * cached behind `cv`). Ported from functions/src/v1/cdn.ts; URL, status codes, bodies and Cache-Control are unchanged.
 */
@CdnToken({
  published: TokenType.PUBLIC,
  draft: TokenType.PREVIEW,
  reason: {
    published: 'Published translations require a public or preview token.',
    draft: 'This request includes a `version` query parameter, which requires a preview token.',
  },
})
@Controller('api/v1/spaces/:spaceId')
export class TranslationsCdnController {
  constructor(private readonly delivery: TranslationDeliveryService) {}

  @Get('translations/:locale')
  async translations(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @CurrentToken() token: ApiToken): Promise<void> {
    const { spaceId, locale } = request.params as Params;
    const { cv, version, token: tokenId } = request.query as Query;

    const space = await this.delivery.findSpace(spaceId);
    if (!requireV1Space(reply, space)) return;
    const actualLocale = identifySpaceLocale(space, locale);
    const snapshot = isDraft(version)
      ? await this.delivery.findDraft(spaceId, actualLocale)
      : await this.delivery.findPublished(spaceId, actualLocale, space.defaultLocaleId);
    if (!snapshot) {
      sendV1Error(reply, 404, 'not-found', 'File not found, Publish first.');
      return;
    }
    // Each map answers to its own build time: an edit never moves the published cv, a publish never the draft one.
    const current = snapshot.builtAt.getTime();
    if (needsRedirect(cv, current)) {
      let url = `/api/v1/spaces/${spaceId}/translations/${q(locale)}?cv=${current}`;
      if (version) url += `&version=${q(version)}`;
      url += `&token=${q(tokenId)}`;
      redirectToVersion(reply, url, token);
      return;
    }
    sendJson(reply, snapshot.data);
  }
}

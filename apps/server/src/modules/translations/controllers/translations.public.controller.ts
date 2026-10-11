import { Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenPermission } from '@localess/shared';
import { zTranslationManageUpdateSchema } from '@localess/shared/zod';
import { TokenAuthService } from '../../../auth/api-tokens/token-auth.service.js';
import { Public } from '../../../auth/decorators.js';
import {
  identifySpaceLocale,
  isDraft,
  needsRedirect,
  Params,
  Query,
  redirectToVersion,
  requireV1Space,
  sendJson,
  validIdParams,
} from '../../../infra/http/v1/v1-request.js';
import { q, sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { TranslationDeliveryService } from '../services/translation-delivery.service.js';

/**
 * Translations on the public API: the published (or draft) map for a locale (`?token=`, cached behind `cv`),
 * the raw stored values for the CLI (DEV_TOOLS) and the CLI's push (`X-API-KEY` with DEV_TOOLS). Ported from
 * functions/src/v1/{cdn,dev-tools,manage}.ts; URLs, status codes, bodies and Cache-Control are unchanged.
 */
@Public()
@Controller('api/v1/spaces/:spaceId')
export class TranslationsPublicController {
  constructor(
    private readonly delivery: TranslationDeliveryService,
    private readonly tokens: TokenAuthService,
  ) {}

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

  /**
   * The values stored for one locale, with no fallback filling: a key the locale has no value for is
   * absent. For round-tripping through files (`localess translation pull --raw` → edit → push).
   */
  @Get('translations/:locale/values')
  async translationValues(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeDevTools(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const space = await this.delivery.findSpace(spaceId);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: 'no-cache' });
      return;
    }
    if (!space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
        cacheControl: 'no-cache',
      });
      return;
    }
    void reply.header('cache-control', 'no-cache').send(await this.delivery.storedValues(spaceId, locale));
  }

  // 200, not Nest's POST default of 201: what the Express endpoint answered.
  @Post('translations/:locale')
  @HttpCode(200)
  async updateTranslations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    if (!(await this.tokens.authorizeApiKey(request, reply))) return;
    const { spaceId, locale } = request.params as Params;
    const body = zTranslationManageUpdateSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, values } = body.data;
    const space = await this.delivery.findSpace(spaceId);
    if (!space || !space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
      });
      return;
    }

    void reply.send(await this.delivery.push(spaceId, locale, type, values, dryRun));
  }
}

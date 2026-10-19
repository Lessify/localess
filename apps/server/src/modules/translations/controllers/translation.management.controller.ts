import { Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { zTranslationManageUpdateSchema } from '@localess/shared/zod';
import { ManagementToken } from '../../../auth/token-auth.decorators.js';
import { Params } from '../../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../../infra/http/v1/v1-response.js';
import { TranslationDeliveryService } from '../services/translation-delivery.service.js';

const NO_STORE = 'no-store';

/**
 * Translations on the Management API (`Authorization: Bearer` with a management token): the raw stored values of a locale
 * and the CLI's push.
 */
@ManagementToken()
@Controller('api/manage/v1/spaces/:spaceId')
export class TranslationManagementController {
  constructor(private readonly translationDeliveryService: TranslationDeliveryService) {}

  /**
   * The values stored for one locale, with no fallback filling: a key the locale has no value for is
   * absent. For round-tripping through files (`localess translation pull --raw` → edit → push).
   */
  @Get('translations/:locale')
  async translationValues(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const { spaceId, locale } = request.params as Params;
    const space = await this.translationDeliveryService.findSpace(spaceId);
    if (!space) {
      sendV1Error(reply, 404, 'not-found', 'Not found', { cacheControl: NO_STORE });
      return;
    }
    if (!space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
        cacheControl: NO_STORE,
      });
      return;
    }
    void reply.header('cache-control', NO_STORE).send(await this.translationDeliveryService.storedValues(spaceId, locale));
  }

  // 200, not Nest's POST default of 201: what the CLI expects.
  @Post('translations/:locale')
  @HttpCode(200)
  async updateTranslations(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const { spaceId, locale } = request.params as Params;
    const body = zTranslationManageUpdateSchema.safeParse(request.body);
    if (!body.success) {
      sendV1Error(reply, 400, 'invalid-argument', 'Bad request body', { details: body.error });
      return;
    }
    const { dryRun, type, values } = body.data;
    const space = await this.translationDeliveryService.findSpace(spaceId);
    if (!space || !space.locales.some(it => it.id === locale)) {
      sendV1Error(reply, 400, 'invalid-argument', 'Locale not supported by this space', {
        details: `Locale ${locale} is not in space locales`,
      });
      return;
    }

    const result = await this.translationDeliveryService.push(spaceId, locale, type, values, dryRun);
    if ('invalidKeys' in result) {
      sendV1Error(reply, 400, 'invalid-argument', 'Invalid translation keys', { details: { keys: result.invalidKeys } });
      return;
    }
    void reply.send(result);
  }
}

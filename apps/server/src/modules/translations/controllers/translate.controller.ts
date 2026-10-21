import { type TranslateBatchResult, type TranslateData, type TranslateTextResult, TRANSLATORS } from '@localess/shared';
import { zTranslateData } from '@localess/shared/zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { TranslateService } from '../services/translate.service.js';

/**
 * Machine translation for the editors: one string, or a batch of items. Whether it is configured is `GET /api/config`
 * (`translate.enabled`); without a provider this answers 412.
 */
@Controller('api/app/translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  @HttpCode(200)
  @RequireRole(TRANSLATORS)
  async translateText(@Body({ schema: zTranslateData }) body: TranslateData): Promise<TranslateTextResult | TranslateBatchResult> {
    if (body.items) return this.translateService.translateItems(body.items, body.sourceLocale, body.targetLocale);
    return { content: await this.translateService.translate(body.content, body.sourceLocale, body.targetLocale, body.format) };
  }
}

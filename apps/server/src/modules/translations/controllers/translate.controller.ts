import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { type TranslateData, UserPermission } from '@localess/shared';
import { RequireAllPermissions, RequirePermission } from '../../../auth/decorators.js';
import { zTranslateData } from '../models/translate.models.js';
import { TranslateService } from '../services/translate.service.js';

/** Machine translation for the editors (was the `translate` callable): one string, or a batch of items. */
@Controller('api/app/translate')
export class TranslateController {
  constructor(private readonly translate: TranslateService) {}

  @Get('status')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE, UserPermission.CONTENT_UPDATE)
  status() {
    return { enabled: this.translate.enabled, provider: this.translate.provider };
  }

  @Post()
  @HttpCode(200)
  @RequireAllPermissions(UserPermission.TRANSLATION_UPDATE, UserPermission.CONTENT_UPDATE)
  async translateText(@Body({ schema: zTranslateData }) body: TranslateData) {
    if (body.items) return this.translate.translateItems(body.items, body.sourceLocale, body.targetLocale);
    return { content: await this.translate.translate(body.content, body.sourceLocale, body.targetLocale, body.format) };
  }
}

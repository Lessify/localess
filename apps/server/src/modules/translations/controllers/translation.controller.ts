import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import {
  zTranslationCreate,
  zTranslationLocaleUpdate,
  zTranslationRename,
  zTranslationTranslateLocale,
  zTranslationUpdate,
} from '@localess/shared/zod';
import {
  type TranslationCreate,
  type TranslationLocaleUpdate,
  type TranslationRename,
  type TranslationTranslateLocale,
  type TranslationUpdate,
  UserPermission,
} from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { TranslationService } from '../services/translation.service.js';

/**
 * Translation keys (was direct `spaces/{s}/translations` access plus the `translation-*` callables). `:id` is the
 * UUID; `key` is the translation key.
 */
@Controller('api/app/spaces/:spaceId/translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @RequirePermission(UserPermission.TRANSLATION_READ)
  findAll(@Param('spaceId') spaceId: string) {
    return this.translationService.findAll(spaceId);
  }

  @Get('count')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  async count(@Param('spaceId') spaceId: string) {
    return { count: await this.translationService.count(spaceId) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.translationService.findOne(spaceId, id);
  }

  @Post()
  @RequirePermission(UserPermission.TRANSLATION_CREATE)
  create(@Param('spaceId') spaceId: string, @Body({ schema: zTranslationCreate }) body: TranslationCreate) {
    return this.translationService.create(spaceId, body);
  }

  @Patch(':id')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zTranslationUpdate }) body: TranslationUpdate,
  ) {
    return this.translationService.update(spaceId, id, body);
  }

  @Put(':id/locales/:locale')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  updateLocale(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Param('locale') locale: string,
    @Body({ schema: zTranslationLocaleUpdate }) body: TranslationLocaleUpdate,
  ) {
    return this.translationService.updateLocale(spaceId, id, locale, body.value);
  }

  @Put(':id/key')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  rename(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zTranslationRename }) body: TranslationRename,
  ) {
    return this.translationService.rename(spaceId, id, body.key);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.TRANSLATION_DELETE)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.translationService.remove(spaceId, id);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async removeAll(@Param('spaceId') spaceId: string): Promise<void> {
    await this.translationService.removeAll(spaceId);
  }

  @Post('publish')
  @HttpCode(204)
  @RequirePermission(UserPermission.TRANSLATION_PUBLISH)
  async publish(@Param('spaceId') spaceId: string): Promise<void> {
    await this.translationService.publish(spaceId);
  }

  @Post('translate-locale')
  @HttpCode(200)
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  translateLocale(@Param('spaceId') spaceId: string, @Body({ schema: zTranslationTranslateLocale }) body: TranslationTranslateLocale) {
    return this.translationService.translateLocale(spaceId, body.sourceLocaleId, body.targetLocaleId, body.overwrite === true);
  }
}

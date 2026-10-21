import {
  ANY_ROLE,
  CONTENT_WRITERS,
  DEVELOPERS,
  type TranslationCreate,
  type TranslationLocaleUpdate,
  type TranslationRename,
  type TranslationTranslateLocale,
  type TranslationUpdate,
  TRANSLATORS,
} from '@localess/shared';
import {
  zTranslationCreate,
  zTranslationLocaleUpdate,
  zTranslationRename,
  zTranslationTranslateLocale,
  zTranslationUpdate,
} from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { TranslationService } from '../services/translation.service.js';

/**
 * Translation keys of a space. `:translationId` is the UUID; `key` is the translation key. Every route checks the space
 * first (404 "Space not found" before "Translation not found").
 */
@Controller('api/app/spaces/:spaceId/translations')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get()
  @RequireRole(ANY_ROLE)
  findAll(@Param('spaceId', UuidParamPipe) spaceId: string) {
    return this.translationService.findAll(spaceId);
  }

  @Get('count')
  @RequireRole(ANY_ROLE)
  async count(@Param('spaceId', UuidParamPipe) spaceId: string) {
    return { count: await this.translationService.count(spaceId) };
  }

  @Get(':translationId')
  @RequireRole(ANY_ROLE)
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('translationId', UuidParamPipe) translationId: string) {
    return this.translationService.findOne(spaceId, translationId);
  }

  @Post()
  @RequireRole(CONTENT_WRITERS)
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zTranslationCreate }) body: TranslationCreate) {
    return this.translationService.create(spaceId, body);
  }

  @Patch(':translationId')
  @RequireRole(CONTENT_WRITERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Body({ schema: zTranslationUpdate }) body: TranslationUpdate,
  ) {
    return this.translationService.update(spaceId, translationId, body);
  }

  @Put(':translationId/locales/:localeId')
  @RequireRole(TRANSLATORS)
  updateLocale(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Param('localeId') localeId: string,
    @Body({ schema: zTranslationLocaleUpdate }) body: TranslationLocaleUpdate,
  ) {
    return this.translationService.updateLocale(spaceId, translationId, localeId, body.value);
  }

  @Put(':translationId/key')
  @RequireRole(CONTENT_WRITERS)
  rename(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Body({ schema: zTranslationRename }) body: TranslationRename,
  ) {
    return this.translationService.rename(spaceId, translationId, body.key);
  }

  @Delete(':translationId')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  async remove(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
  ): Promise<void> {
    await this.translationService.remove(spaceId, translationId);
  }

  @Delete()
  @HttpCode(204)
  @RequireRole(DEVELOPERS)
  async removeAll(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<void> {
    await this.translationService.removeAll(spaceId);
  }

  @Post('publish')
  @HttpCode(204)
  @RequireRole(CONTENT_WRITERS)
  async publish(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<void> {
    await this.translationService.publish(spaceId);
  }

  @Post('translate-locale')
  @HttpCode(200)
  @RequireRole(TRANSLATORS)
  translateLocale(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Body({ schema: zTranslationTranslateLocale }) body: TranslationTranslateLocale,
  ) {
    return this.translationService.translateLocale(spaceId, body.sourceLocaleId, body.targetLocaleId, body.overwrite === true);
  }
}

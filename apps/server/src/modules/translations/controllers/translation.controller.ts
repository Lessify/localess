import {
  ANY_ROLE,
  CONTENT_WRITERS,
  DEVELOPERS,
  type Page,
  type TranslateLocaleResult,
  type Translation,
  type TranslationCreate,
  type TranslationLocaleUpdate,
  type TranslationNode,
  type TranslationNodePageable,
  type TranslationPageable,
  type TranslationRename,
  type TranslationTranslateLocale,
  type TranslationUpdate,
  TRANSLATORS,
} from '@localess/shared';
import {
  zTranslationCreate,
  zTranslationLocaleUpdate,
  zTranslationNodePageable,
  zTranslationPageable,
  zTranslationRename,
  zTranslationTranslateLocale,
  zTranslationUpdate,
} from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';

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

  /** One page of the list: `?page=&size=&sort=&direction=`, and the filter (`search`, `key`, `locale`, `label`, `status`, `localeStatus`). */
  @Get()
  @RequireRole(ANY_ROLE)
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zTranslationPageable }) query: TranslationPageable,
  ): Promise<Page<Translation>> {
    return this.translationService.findAll(spaceId, query);
  }

  /** One level of the tree: `?parent=` (none: the top level), the same filter, paged. */
  @Get('nodes')
  @RequireRole(ANY_ROLE)
  findNodes(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zTranslationNodePageable }) query: TranslationNodePageable,
  ): Promise<Page<TranslationNode>> {
    return this.translationService.findNodes(spaceId, query);
  }

  /** Every label of the space's translations. */
  @Get('labels')
  @RequireRole(ANY_ROLE)
  findLabels(@Param('spaceId', UuidParamPipe) spaceId: string): Promise<string[]> {
    return this.translationService.findLabels(spaceId);
  }

  @Get(':translationId')
  @RequireRole(ANY_ROLE)
  findOne(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
  ): Promise<Translation> {
    return this.translationService.findOne(spaceId, translationId);
  }

  @Post()
  @RequireRole(CONTENT_WRITERS)
  create(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Body({ schema: zTranslationCreate }) body: TranslationCreate,
  ): Promise<Translation> {
    return this.translationService.create(spaceId, body);
  }

  @Patch(':translationId')
  @RequireRole(CONTENT_WRITERS)
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Body({ schema: zTranslationUpdate }) body: TranslationUpdate,
  ): Promise<Translation> {
    return this.translationService.update(spaceId, translationId, body);
  }

  @Put(':translationId/locales/:localeId')
  @RequireRole(TRANSLATORS)
  updateLocale(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Param('localeId') localeId: string,
    @Body({ schema: zTranslationLocaleUpdate }) body: TranslationLocaleUpdate,
  ): Promise<Translation> {
    return this.translationService.updateLocale(spaceId, translationId, localeId, body);
  }

  @Put(':translationId/key')
  @RequireRole(CONTENT_WRITERS)
  rename(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('translationId', UuidParamPipe) translationId: string,
    @Body({ schema: zTranslationRename }) body: TranslationRename,
  ): Promise<Translation> {
    return this.translationService.rename(spaceId, translationId, body);
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
  ): Promise<TranslateLocaleResult> {
    return this.translationService.translateLocale(spaceId, body);
  }
}

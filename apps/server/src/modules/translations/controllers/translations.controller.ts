import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { zTranslationKey, zTranslationValue } from '@localess/shared/zod';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { zLabels } from '../../../infra/http/zod.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { TranslationsService } from '../services/translations.service.js';

const createSchema = z.object({
  key: zTranslationKey,
  locales: z.record(z.string(), zTranslationValue),
  labels: zLabels.optional(),
  description: z.string().max(2000).optional(),
});
const updateSchema = z.object({ labels: zLabels.optional(), description: z.string().max(2000).optional() });
const localeValueSchema = z.object({ value: zTranslationValue });
const renameSchema = z.object({ key: zTranslationKey });
const translateLocaleSchema = z.object({
  sourceLocaleId: z.string().min(1),
  targetLocaleId: z.string().min(1),
  overwrite: z.boolean().optional(),
});
/**
 * Translation keys (was direct `spaces/{s}/translations` access plus the `translation-*` callables). `:id` is the
 * UUID; `key` is the translation key.
 */
@Controller('api/app/spaces/:spaceId/translations')
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Get()
  @RequirePermission(UserPermission.TRANSLATION_READ)
  list(@Param('spaceId') spaceId: string) {
    return this.translations.list(spaceId);
  }

  @Get('count')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  async count(@Param('spaceId') spaceId: string) {
    return { count: await this.translations.count(spaceId) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.translations.get(spaceId, id);
  }

  @Post()
  @RequirePermission(UserPermission.TRANSLATION_CREATE)
  create(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
  ) {
    return this.translations.create(spaceId, body);
  }

  @Patch(':id')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
  ) {
    return this.translations.update(spaceId, id, body);
  }

  @Put(':id/locales/:locale')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  updateLocale(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Param('locale') locale: string,
    @Body(new ZodValidationPipe(localeValueSchema)) body: z.infer<typeof localeValueSchema>,
  ) {
    return this.translations.updateLocale(spaceId, id, locale, body.value);
  }

  @Put(':id/key')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  rename(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
  ) {
    return this.translations.rename(spaceId, id, body.key);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.TRANSLATION_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.translations.delete(spaceId, id);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission(UserPermission.SPACE_MANAGEMENT)
  async deleteAll(@Param('spaceId') spaceId: string): Promise<void> {
    await this.translations.deleteAll(spaceId);
  }

  @Post('publish')
  @HttpCode(204)
  @RequirePermission(UserPermission.TRANSLATION_PUBLISH)
  async publish(@Param('spaceId') spaceId: string): Promise<void> {
    await this.translations.publish(spaceId);
  }

  @Post('translate-locale')
  @HttpCode(200)
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  translateLocale(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(translateLocaleSchema)) body: z.infer<typeof translateLocaleSchema>,
  ) {
    return this.translations.translateLocale(spaceId, body.sourceLocaleId, body.targetLocaleId, body.overwrite === true);
  }
}

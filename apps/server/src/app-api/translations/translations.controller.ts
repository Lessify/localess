import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAllPermissions, RequirePermission } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { TranslateService } from '../../translate/translate.service.js';
import type { UserRow } from '../../users/users.service.js';
import { toDto } from '../common/dto.js';
import { zLabels } from '../common/zod.js';
import { TranslationRow, TranslationsService } from './translations.service.js';

const translationId = z.string().min(1).max(500);
const createSchema = z.object({
  id: translationId,
  type: z.enum(['STRING', 'PLURAL', 'ARRAY']),
  locales: z.record(z.string(), z.string()),
  labels: zLabels.optional(),
  description: z.string().max(2000).optional(),
});
const updateSchema = z.object({ labels: zLabels.optional(), description: z.string().max(2000).optional() });
const localeValueSchema = z.object({ value: z.string() });
const renameSchema = z.object({ id: translationId });
const translateLocaleSchema = z.object({
  sourceLocaleId: z.string().min(1),
  targetLocaleId: z.string().min(1),
  overwrite: z.boolean().optional(),
});
const format = z.enum(['text', 'html']).optional();
const translateSchema = z.union([
  z.object({ sourceLocale: z.string().min(1), targetLocale: z.string().min(1), content: z.string(), format }),
  z.object({
    sourceLocale: z.string().min(1),
    targetLocale: z.string().min(1),
    items: z.array(z.object({ id: z.string(), content: z.string(), format })).max(5000),
  }),
]);

const dto = (row: TranslationRow) => toDto(row);

/** Translation keys (was direct `spaces/{s}/translations` access plus the `translation-*` callables). */
@Controller('api/app/spaces/:spaceId/translations')
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Get()
  @RequirePermission(UserPermission.TRANSLATION_READ)
  async list(@Param('spaceId') spaceId: string) {
    return (await this.translations.list(spaceId)).map(dto);
  }

  @Get('count')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  async count(@Param('spaceId') spaceId: string) {
    return { count: await this.translations.count(spaceId) };
  }

  @Get(':id')
  @RequirePermission(UserPermission.TRANSLATION_READ)
  async get(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return dto(await this.translations.get(spaceId, id));
  }

  @Post()
  @RequirePermission(UserPermission.TRANSLATION_CREATE)
  async create(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.translations.create(spaceId, body, user));
  }

  @Patch(':id')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  async update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: z.infer<typeof updateSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.translations.update(spaceId, id, body, user));
  }

  @Put(':id/locales/:locale')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  async updateLocale(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body(new ZodValidationPipe(localeValueSchema)) body: z.infer<typeof localeValueSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.translations.updateLocale(spaceId, id, locale, body.value, user));
  }

  @Put(':id/id')
  @RequirePermission(UserPermission.TRANSLATION_UPDATE)
  async rename(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(renameSchema)) body: z.infer<typeof renameSchema>,
    @CurrentUser() user: UserRow,
  ) {
    return dto(await this.translations.rename(spaceId, id, body.id, user));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(UserPermission.TRANSLATION_DELETE)
  async delete(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<void> {
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
    @CurrentUser() user: UserRow,
  ) {
    return this.translations.translateLocale(spaceId, body.sourceLocaleId, body.targetLocaleId, body.overwrite === true, user);
  }
}

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
  async translateText(@Body(new ZodValidationPipe(translateSchema)) body: z.infer<typeof translateSchema>) {
    if ('items' in body) return this.translate.translateItems(body.items, body.sourceLocale, body.targetLocale);
    return { content: await this.translate.translate(body.content, body.sourceLocale, body.targetLocale, body.format) };
  }
}

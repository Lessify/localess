import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAllPermissions, RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { TranslateService } from '../services/translate.service.js';

const format = z.enum(['text', 'html']).optional();
const translateSchema = z.union([
  z.object({ sourceLocale: z.string().min(1), targetLocale: z.string().min(1), content: z.string(), format }),
  z.object({
    sourceLocale: z.string().min(1),
    targetLocale: z.string().min(1),
    items: z.array(z.object({ id: z.string(), content: z.string(), format })).max(5000),
  }),
]);

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

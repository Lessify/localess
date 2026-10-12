import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission, WebHookEvent } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { WebhooksService } from '../services/webhooks.service.js';

/** Same rule firestore.rules applied: https, or plain http to localhost for local testing. */
const webhookUrl = z
  .string()
  .max(2048)
  .refine(url => /^https:\/\//.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url), 'Webhook URLs must use https');
const webhookSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: webhookUrl,
  events: z.array(z.enum(Object.values(WebHookEvent) as [WebHookEvent, ...WebHookEvent[]])).min(1),
  headers: z.record(z.string().max(200), z.string().max(2000)).optional(),
  secret: z.string().max(500).optional(),
});
const statusSchema = z.object({ enabled: z.boolean() });

/** Webhook configuration and delivery logs. */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  list(@Param('spaceId') spaceId: string) {
    return this.webhooks.list(spaceId);
  }

  @Get(':id')
  get(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.webhooks.get(spaceId, id);
  }

  @Get(':id/logs')
  logs(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Query('limit') limit?: string) {
    return this.webhooks.logs(spaceId, id, limit ? Math.max(1, Math.min(1000, Number(limit) || 100)) : 100);
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body(new ZodValidationPipe(webhookSchema)) body: z.infer<typeof webhookSchema>) {
    return this.webhooks.create(spaceId, body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(webhookSchema)) body: z.infer<typeof webhookSchema>,
  ) {
    return this.webhooks.update(spaceId, id, body);
  }

  @Patch(':id/status')
  setStatus(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.webhooks.setEnabled(spaceId, id, body.enabled);
  }

  /** Logs cascade. */
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.webhooks.delete(spaceId, id);
  }
}

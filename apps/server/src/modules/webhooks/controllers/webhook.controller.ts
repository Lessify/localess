import { DEVELOPERS, type WebHookCreate, type WebHookStatusUpdate, type WebHookUpdate } from '@localess/shared';
import { zWebHookCreate, zWebHookStatusUpdate, zWebHookUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { WebhookService } from '../services/webhook.service.js';

/** Webhook configuration (the delivery logs: `WebhookLogController`). */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequireRole(DEVELOPERS)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  findAll(@Param('spaceId', UuidParamPipe) spaceId: string) {
    return this.webhookService.findAll(spaceId);
  }

  @Get(':webhookId')
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('webhookId', UuidParamPipe) webhookId: string) {
    return this.webhookService.findOne(spaceId, webhookId);
  }

  @Post()
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zWebHookCreate }) body: WebHookCreate) {
    return this.webhookService.create(spaceId, body);
  }

  @Put(':webhookId')
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Body({ schema: zWebHookUpdate }) body: WebHookUpdate,
  ) {
    return this.webhookService.update(spaceId, webhookId, body);
  }

  @Patch(':webhookId/status')
  updateStatus(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Body({ schema: zWebHookStatusUpdate }) body: WebHookStatusUpdate,
  ) {
    return this.webhookService.updateStatus(spaceId, webhookId, body.enabled);
  }

  /** Logs cascade. */
  @Delete(':webhookId')
  @HttpCode(204)
  async remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('webhookId', UuidParamPipe) webhookId: string): Promise<void> {
    await this.webhookService.remove(spaceId, webhookId);
  }
}

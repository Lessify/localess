import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { zWebHookCreate, zWebHookStatusUpdate, zWebHookUpdate } from '@localess/shared/zod';
import { UserPermission, type WebHookCreate, type WebHookStatusUpdate, type WebHookUpdate } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { WebhookService } from '../services/webhook.service.js';

/** Webhook configuration (the delivery logs: `WebhookLogController`). */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Get()
  findAll(@Param('spaceId') spaceId: string) {
    return this.webhooks.findAll(spaceId);
  }

  @Get(':id')
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.webhooks.findOne(spaceId, id);
  }

  @Post()
  create(@Param('spaceId') spaceId: string, @Body({ schema: zWebHookCreate }) body: WebHookCreate) {
    return this.webhooks.create(spaceId, body);
  }

  @Put(':id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zWebHookUpdate }) body: WebHookUpdate,
  ) {
    return this.webhooks.update(spaceId, id, body);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zWebHookStatusUpdate }) body: WebHookStatusUpdate,
  ) {
    return this.webhooks.updateStatus(spaceId, id, body.enabled);
  }

  /** Logs cascade. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.webhooks.remove(spaceId, id);
  }
}

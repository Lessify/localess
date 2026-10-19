import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { UserPermission, type WebHookCreate, type WebHookUpdate } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { type WebHookEnabled, zWebHookCreate, zWebHookEnabled, zWebHookUpdate } from '../models/webhook.models.js';
import { WebhooksService } from '../services/webhooks.service.js';

/** Webhook configuration and delivery logs. */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequirePermission(UserPermission.SPACE_MANAGEMENT)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  findAll(@Param('spaceId') spaceId: string) {
    return this.webhooks.findAll(spaceId);
  }

  @Get(':id')
  findOne(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string) {
    return this.webhooks.findOne(spaceId, id);
  }

  @Get(':id/logs')
  findLogs(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string, @Query('limit') limit?: string) {
    return this.webhooks.findLogs(spaceId, id, limit ? Math.max(1, Math.min(1000, Number(limit) || 100)) : 100);
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
  setStatus(
    @Param('spaceId') spaceId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zWebHookEnabled }) body: WebHookEnabled,
  ) {
    return this.webhooks.setEnabled(spaceId, id, body.enabled);
  }

  /** Logs cascade. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('spaceId') spaceId: string, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.webhooks.remove(spaceId, id);
  }
}

import {
  DEVELOPERS,
  type Page,
  type Webhook,
  type WebhookCreate,
  type WebhookPageable,
  type WebhookStatusUpdate,
  type WebhookUpdate,
} from '@localess/shared';
import { zWebhookCreate, zWebhookPageable, zWebhookStatusUpdate, zWebhookUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { WebhookService } from '../services/webhook.service.js';

/** Webhook configuration (the delivery logs: `WebhookLogController`). */
@Controller('api/app/spaces/:spaceId/webhooks')
@RequireRole(DEVELOPERS)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  /** One page for Developers → Webhooks: `?page=&size=&sort=&direction=` (Pageable), `?enabled=`, `?event=`, `?search=` (name or URL). */
  @Get()
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Query({ schema: zWebhookPageable }) query: WebhookPageable,
  ): Promise<Page<Webhook>> {
    return this.webhookService.findAll(spaceId, query);
  }

  @Get(':webhookId')
  findOne(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('webhookId', UuidParamPipe) webhookId: string): Promise<Webhook> {
    return this.webhookService.findOne(spaceId, webhookId);
  }

  @Post()
  create(@Param('spaceId', UuidParamPipe) spaceId: string, @Body({ schema: zWebhookCreate }) body: WebhookCreate): Promise<Webhook> {
    return this.webhookService.create(spaceId, body);
  }

  @Put(':webhookId')
  update(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Body({ schema: zWebhookUpdate }) body: WebhookUpdate,
  ): Promise<Webhook> {
    return this.webhookService.update(spaceId, webhookId, body);
  }

  @Patch(':webhookId/status')
  updateStatus(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Body({ schema: zWebhookStatusUpdate }) body: WebhookStatusUpdate,
  ): Promise<Webhook> {
    return this.webhookService.updateStatus(spaceId, webhookId, body.enabled);
  }

  /** A new signing secret (the one before stops), answered this once: `secret` in the webhook. */
  @Post(':webhookId/secret')
  createSecret(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('webhookId', UuidParamPipe) webhookId: string): Promise<Webhook> {
    return this.webhookService.createSecret(spaceId, webhookId);
  }

  /** Deliveries are no longer signed. */
  @Delete(':webhookId/secret')
  @HttpCode(204)
  async removeSecret(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
  ): Promise<void> {
    await this.webhookService.removeSecret(spaceId, webhookId);
  }

  /** Logs cascade. */
  @Delete(':webhookId')
  @HttpCode(204)
  async remove(@Param('spaceId', UuidParamPipe) spaceId: string, @Param('webhookId', UuidParamPipe) webhookId: string): Promise<void> {
    await this.webhookService.remove(spaceId, webhookId);
  }
}

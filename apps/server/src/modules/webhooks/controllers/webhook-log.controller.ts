import { DEVELOPERS, type Page, type WebHookLog, type WebHookLogPageable } from '@localess/shared';
import { zWebHookLogPageable } from '@localess/shared/zod';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { WebhookLogService } from '../services/webhook-log.service.js';

/** A webhook's delivery logs. */
@Controller('api/app/spaces/:spaceId/webhooks/:webhookId/logs')
@RequireRole(DEVELOPERS)
export class WebhookLogController {
  constructor(private readonly webhookLogService: WebhookLogService) {}

  /** One page for the webhook's page: `?page=&size=&sort=&direction=` (Pageable, newest first), `?event=`, `?status=`, `?search=` (the log id). */
  @Get()
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Query({ schema: zWebHookLogPageable }) query: WebHookLogPageable,
  ): Promise<Page<WebHookLog>> {
    return this.webhookLogService.findAll(spaceId, webhookId, query);
  }
}

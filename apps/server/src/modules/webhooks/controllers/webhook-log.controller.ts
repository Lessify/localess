import { DEVELOPERS } from '@localess/shared';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { WebhookLogService } from '../services/webhook-log.service.js';

/** A webhook's delivery logs. */
@Controller('api/app/spaces/:spaceId/webhooks/:webhookId/logs')
@RequireRole(DEVELOPERS)
export class WebhookLogController {
  constructor(private readonly webhookLogService: WebhookLogService) {}

  @Get()
  findAll(
    @Param('spaceId', UuidParamPipe) spaceId: string,
    @Param('webhookId', UuidParamPipe) webhookId: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhookLogService.findAll(spaceId, webhookId, limit ? Math.max(1, Math.min(1000, Number(limit) || 100)) : 100);
  }
}

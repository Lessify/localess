import { Module } from '@nestjs/common';

import { WebhookController } from './controllers/webhook.controller.js';
import { WebhookLogController } from './controllers/webhook-log.controller.js';
import { WebhookRepository } from './repositories/webhook.repository.js';
import { WebhookLogRepository } from './repositories/webhook-log.repository.js';
import { WebhookService } from './services/webhook.service.js';
import { WebhookLogService } from './services/webhook-log.service.js';
import { WebhookLogCleanupService } from './services/webhook-log-cleanup.service.js';

/** Webhook CRUD and their logs; delivery is shared (SharedModule's WebhookDispatcher). */
@Module({
  controllers: [WebhookController, WebhookLogController],
  providers: [WebhookService, WebhookLogService, WebhookRepository, WebhookLogRepository, WebhookLogCleanupService],
})
export class WebhookModule {}

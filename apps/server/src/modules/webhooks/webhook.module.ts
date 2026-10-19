import { Module } from '@nestjs/common';
import { WebhookController } from './controllers/webhook.controller.js';
import { WebhookRepository } from './repositories/webhook.repository.js';
import { WebhookLogCleanupService } from './services/webhook-log-cleanup.service.js';
import { WebhookService } from './services/webhook.service.js';

/** Webhook CRUD and their logs; delivery is shared (SharedModule's WebhookDispatcher). */
@Module({ controllers: [WebhookController], providers: [WebhookService, WebhookRepository, WebhookLogCleanupService] })
export class WebhookModule {}

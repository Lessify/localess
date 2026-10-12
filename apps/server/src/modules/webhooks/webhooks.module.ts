import { Module } from '@nestjs/common';
import { WebhooksController } from './controllers/webhooks.controller.js';
import { WebhooksRepository } from './repositories/webhooks.repository.js';
import { WebhookLogCleanupService } from './services/webhook-log-cleanup.service.js';
import { WebhooksService } from './services/webhooks.service.js';

/** Webhook CRUD and their logs; delivery is shared (SharedModule's WebhookDispatcher). */
@Module({ controllers: [WebhooksController], providers: [WebhooksService, WebhooksRepository, WebhookLogCleanupService] })
export class WebhooksModule {}

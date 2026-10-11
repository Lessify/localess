import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller.js';

/** Webhook CRUD and their logs; delivery is shared (SharedModule's WebhookDispatcher). */
@Module({ controllers: [WebhooksController] })
export class WebhooksModule {}

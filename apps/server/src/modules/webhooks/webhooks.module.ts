import { Global, Module } from '@nestjs/common';
import { WebhookDispatcher } from './webhook-dispatcher.service.js';
import { WebhooksController } from './webhooks.controller.js';

/** Global: content and translation writes in other modules dispatch webhooks after commit. */
@Global()
@Module({ controllers: [WebhooksController], providers: [WebhookDispatcher], exports: [WebhookDispatcher] })
export class WebhooksModule {}

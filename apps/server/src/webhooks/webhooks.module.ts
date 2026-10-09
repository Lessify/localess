import { Global, Module } from '@nestjs/common';
import { WebhookDispatcher } from './webhook-dispatcher.service.js';

@Global()
@Module({ providers: [WebhookDispatcher], exports: [WebhookDispatcher] })
export class WebhooksModule {}

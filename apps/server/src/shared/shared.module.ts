import { Global, Module } from '@nestjs/common';
import { WebhookDeliveryRepository } from './repositories/webhook-delivery.repository.js';
import { MailService } from './services/mail.service.js';
import { WebhookDispatcher } from './services/webhook-dispatcher.service.js';

/**
 * What every module may use (docs/server-architecture.md#shared): services injected anywhere (mail, webhook
 * delivery). Transformers, data rules and utils in `shared/` are plain functions, imported directly.
 */
@Global()
@Module({
  providers: [MailService, WebhookDispatcher, WebhookDeliveryRepository],
  exports: [MailService, WebhookDispatcher],
})
export class SharedModule {}

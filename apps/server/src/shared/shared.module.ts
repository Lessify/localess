import { Global, Module } from '@nestjs/common';
import { EventController } from './http/event.controller.js';
import { StorageDeletionRepository } from './repositories/storage-deletion.repository.js';
import { WebhookDeliveryRepository } from './repositories/webhook-delivery.repository.js';
import { AssetMetadataService } from './services/asset-metadata.service.js';
import { MailService } from './services/mail.service.js';
import { StorageSweeperService } from './services/storage-sweeper.service.js';
import { WebhookDispatcher } from './services/webhook-dispatcher.service.js';

/**
 * What every module may use (docs/server/architecture.md#shared): services injected anywhere (mail, webhook
 * delivery, metadata of a stored asset file). Transformers, data rules and utils in `shared/` are plain functions, imported directly.
 */
@Global()
@Module({
  controllers: [EventController],
  providers: [
    MailService,
    WebhookDispatcher,
    WebhookDeliveryRepository,
    AssetMetadataService,
    StorageDeletionRepository,
    StorageSweeperService,
  ],
  exports: [MailService, WebhookDispatcher, AssetMetadataService, StorageSweeperService],
})
export class SharedModule {}

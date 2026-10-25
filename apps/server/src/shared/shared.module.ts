import { Global, Module } from '@nestjs/common';

import { SpaceLookupRepository } from './repositories/space-lookup.repository.js';
import { StorageDeletionRepository } from './repositories/storage-deletion.repository.js';
import { WebhookDeliveryRepository } from './repositories/webhook-delivery.repository.js';
import { AssetMetadataService } from './services/asset-metadata.service.js';
import { MailService } from './services/mail.service.js';
import { StorageSweeperService } from './services/storage-sweeper.service.js';
import { TranslateService } from './services/translate.service.js';
import { WebhookDispatcher } from './services/webhook-dispatcher.service.js';

/**
 * What every module may use (docs/server/architecture.md#shared): services injected anywhere (mail, webhook
 * delivery, metadata of a stored asset file, machine translation). Transformers, data rules and utils in `shared/` are plain functions, imported directly.
 */
@Global()
@Module({
  providers: [
    MailService,
    WebhookDispatcher,
    WebhookDeliveryRepository,
    AssetMetadataService,
    StorageDeletionRepository,
    SpaceLookupRepository,
    StorageSweeperService,
    TranslateService,
  ],
  exports: [MailService, WebhookDispatcher, AssetMetadataService, StorageSweeperService, SpaceLookupRepository, TranslateService],
})
export class SharedModule {}

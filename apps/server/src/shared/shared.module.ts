import { Global, Module } from '@nestjs/common';

import { APP_CONFIG, type AppConfig } from '../infra/config/config.js';
import { INTEGRATION_PROVIDERS, integrationProviders } from './integrations/integration-providers.js';
import { AppSettingRepository } from './repositories/app-setting.repository.js';
import { IntegrationSettingRepository } from './repositories/integration-setting.repository.js';
import { SpaceLookupRepository } from './repositories/space-lookup.repository.js';
import { StorageDeletionRepository } from './repositories/storage-deletion.repository.js';
import { WebhookDeliveryRepository } from './repositories/webhook-delivery.repository.js';
import { AssetMetadataService } from './services/asset-metadata.service.js';
import { IntegrationService } from './services/integration.service.js';
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
    IntegrationService,
    { provide: INTEGRATION_PROVIDERS, inject: [APP_CONFIG], useFactory: (config: AppConfig) => integrationProviders(config) },
    IntegrationSettingRepository,
    AppSettingRepository,
  ],
  exports: [
    MailService,
    WebhookDispatcher,
    AssetMetadataService,
    StorageSweeperService,
    SpaceLookupRepository,
    TranslateService,
    IntegrationService,
    INTEGRATION_PROVIDERS,
  ],
})
export class SharedModule {}

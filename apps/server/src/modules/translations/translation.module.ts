import { Module } from '@nestjs/common';

import { ApiTokenModule } from '../../auth/api-token.module.js';
import { TranslateController } from './controllers/translate.controller.js';
import { TranslationCdnController } from './controllers/translation.cdn.controller.js';
import { TranslationController } from './controllers/translation.controller.js';
import { TranslationManagementController } from './controllers/translation.management.controller.js';
import { TranslationRepository } from './repositories/translation.repository.js';
import { TranslationSnapshotRepository } from './repositories/translation-snapshot.repository.js';
import { TranslateService } from './services/translate.service.js';
import { TranslationService } from './services/translation.service.js';
import { TranslationDeliveryService } from './services/translation-delivery.service.js';

/** Layered (docs/server/architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokenModule],
  controllers: [TranslationController, TranslateController, TranslationCdnController, TranslationManagementController],
  providers: [TranslationService, TranslateService, TranslationDeliveryService, TranslationRepository, TranslationSnapshotRepository],
})
export class TranslationModule {}

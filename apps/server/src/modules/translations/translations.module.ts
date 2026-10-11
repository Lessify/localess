import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { TranslateController } from './controllers/translate.controller.js';
import { TranslationsController } from './controllers/translations.controller.js';
import { TranslationsPublicController } from './controllers/translations.public.controller.js';
import { SpaceLocalesRepository } from './repositories/space-locales.repository.js';
import { TranslationSnapshotsRepository } from './repositories/translation-snapshots.repository.js';
import { TranslationsRepository } from './repositories/translations.repository.js';
import { TranslateService } from './services/translate.service.js';
import { TranslationDeliveryService } from './services/translation-delivery.service.js';
import { TranslationsService } from './services/translations.service.js';

/** Layered (docs/server-architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokensModule],
  controllers: [TranslationsController, TranslateController, TranslationsPublicController],
  providers: [
    TranslationsService,
    TranslateService,
    TranslationDeliveryService,
    TranslationsRepository,
    TranslationSnapshotsRepository,
    SpaceLocalesRepository,
  ],
})
export class TranslationsModule {}

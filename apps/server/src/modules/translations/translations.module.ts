import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import { TranslateController } from './controllers/translate.controller.js';
import { TranslationsController } from './controllers/translations.controller.js';
import { TranslationsPublicController } from './controllers/translations.public.controller.js';
import { TranslateService } from './services/translate.service.js';
import { TranslationDeliveryService } from './services/translation-delivery.service.js';
import { TranslationsService } from './services/translations.service.js';

/** Layered (docs/server-architecture.md); its repositories are registered in RepositoriesModule. */
@Module({
  imports: [ApiTokensModule, SpacesModule],
  controllers: [TranslationsController, TranslateController, TranslationsPublicController],
  providers: [TranslationsService, TranslateService, TranslationDeliveryService],
})
export class TranslationsModule {}

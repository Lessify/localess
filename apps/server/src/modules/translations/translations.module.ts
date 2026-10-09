import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import { TranslateService } from './translate/translate.service.js';
import { TranslationDeliveryService } from './translation-delivery.service.js';
import { TranslateController, TranslationsController } from './translations.controller.js';
import { TranslationsPublicController } from './translations.public.controller.js';
import { TranslationsService } from './translations.service.js';

@Module({
  imports: [ApiTokensModule, SpacesModule],
  controllers: [TranslationsController, TranslateController, TranslationsPublicController],
  providers: [TranslationsService, TranslateService, TranslationDeliveryService],
})
export class TranslationsModule {}

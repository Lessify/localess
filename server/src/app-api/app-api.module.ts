import { Module } from '@nestjs/common';
import { ContentsController } from './contents/contents.controller.js';
import { ContentsService } from './contents/contents.service.js';
import { UnsplashController } from './plugins/unsplash.controller.js';
import { TranslateController, TranslationsController } from './translations/translations.controller.js';
import { TranslationsService } from './translations/translations.service.js';
import { TranslateService } from '../translate/translate.service.js';
import { SchemasController } from './schemas/schemas.controller.js';
import { SchemasService } from './schemas/schemas.service.js';
import { SettingsController } from './settings/settings.controller.js';
import { SpacesController } from './spaces/spaces.controller.js';
import { SpacesService } from './spaces/spaces.service.js';

/** The SPA's API (`/api/app/**`), replacing direct Firestore access and the callable functions. */
@Module({
  controllers: [
    SpacesController,
    SettingsController,
    SchemasController,
    ContentsController,
    TranslationsController,
    TranslateController,
    UnsplashController,
  ],
  providers: [SpacesService, SchemasService, ContentsService, TranslationsService, TranslateService],
})
export class AppApiModule {}

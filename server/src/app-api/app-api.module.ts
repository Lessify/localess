import { Module } from '@nestjs/common';
import { SchemasController } from './schemas/schemas.controller.js';
import { SchemasService } from './schemas/schemas.service.js';
import { SettingsController } from './settings/settings.controller.js';
import { SpacesController } from './spaces/spaces.controller.js';
import { SpacesService } from './spaces/spaces.service.js';

/** The SPA's API (`/api/app/**`), replacing direct Firestore access and the callable functions. */
@Module({
  controllers: [SpacesController, SettingsController, SchemasController],
  providers: [SpacesService, SchemasService],
})
export class AppApiModule {}

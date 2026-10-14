import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens.module.js';
import { LocalesController } from './controllers/locales.controller.js';
import { SpacesController } from './controllers/spaces.controller.js';
import { SpacesManagementController } from './controllers/spaces.management.controller.js';
import { LocalesRepository } from './repositories/locales.repository.js';
import { SpaceOverviewRepository } from './repositories/space-overview.repository.js';
import { SpacesRepository } from './repositories/spaces.repository.js';
import { LocalesService } from './services/locales.service.js';
import { SpacesService } from './services/spaces.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [LocalesController, SpacesController, SpacesManagementController],
  providers: [SpacesService, LocalesService, SpacesRepository, LocalesRepository, SpaceOverviewRepository],
})
export class SpacesModule {}

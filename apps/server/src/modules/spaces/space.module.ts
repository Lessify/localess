import { Module } from '@nestjs/common';
import { ApiTokenModule } from '../../auth/api-token.module.js';
import { LocaleController } from './controllers/locale.controller.js';
import { SpaceController } from './controllers/space.controller.js';
import { SpaceManagementController } from './controllers/space.management.controller.js';
import { LocaleRepository } from './repositories/locale.repository.js';
import { SpaceOverviewRepository } from './repositories/space-overview.repository.js';
import { SpaceTemplateRepository } from './repositories/space-template.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { LocaleService } from './services/locale.service.js';
import { SpaceService } from './services/space.service.js';

@Module({
  imports: [ApiTokenModule],
  controllers: [LocaleController, SpaceController, SpaceManagementController],
  providers: [SpaceService, LocaleService, SpaceRepository, SpaceTemplateRepository, LocaleRepository, SpaceOverviewRepository],
})
export class SpaceModule {}

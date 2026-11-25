import { Module } from '@nestjs/common';

import { ApiTokenModule } from '../../auth/api-token.module.js';
import { LocaleController } from './controllers/locale.controller.js';
import { SpaceController } from './controllers/space.controller.js';
import { SpaceManagementController } from './controllers/space.management.controller.js';
import { SpaceEnvironmentController } from './controllers/space-environment.controller.js';
import { SpaceLocaleController } from './controllers/space-locale.controller.js';
import { SpaceTokenController } from './controllers/space-token.controller.js';
import { LocaleRepository } from './repositories/locale.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { SpaceEnvironmentRepository } from './repositories/space-environment.repository.js';
import { SpaceLocaleRepository } from './repositories/space-locale.repository.js';
import { SpaceOverviewRepository } from './repositories/space-overview.repository.js';
import { SpaceTemplateRepository } from './repositories/space-template.repository.js';
import { SpaceTokenRepository } from './repositories/space-token.repository.js';
import { LocaleService } from './services/locale.service.js';
import { SpaceService } from './services/space.service.js';
import { SpaceEnvironmentService } from './services/space-environment.service.js';
import { SpaceLocaleService } from './services/space-locale.service.js';
import { SpaceTokenService } from './services/space-token.service.js';

@Module({
  imports: [ApiTokenModule],
  controllers: [
    LocaleController,
    SpaceController,
    SpaceEnvironmentController,
    SpaceLocaleController,
    SpaceManagementController,
    SpaceTokenController,
  ],
  providers: [
    SpaceService,
    SpaceEnvironmentService,
    SpaceLocaleService,
    SpaceTokenService,
    LocaleService,
    SpaceRepository,
    SpaceEnvironmentRepository,
    SpaceLocaleRepository,
    SpaceTemplateRepository,
    LocaleRepository,
    SpaceOverviewRepository,
    SpaceTokenRepository,
  ],
})
export class SpaceModule {}

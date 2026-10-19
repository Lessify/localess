import { Module } from '@nestjs/common';
import { ApiTokenModule } from '../../auth/api-token.module.js';
import { OpenApiController } from './controllers/open-api.controller.js';
import { SchemaController } from './controllers/schema.controller.js';
import { SchemaManagementController } from './controllers/schema.management.controller.js';
import { SchemaRepository } from './repositories/schema.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { OpenApiService } from './services/open-api.service.js';
import { SchemaService } from './services/schema.service.js';

/** Layered (docs/server/architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokenModule],
  controllers: [SchemaController, OpenApiController, SchemaManagementController],
  providers: [SchemaService, OpenApiService, SchemaRepository, SpaceRepository],
})
export class SchemaModule {}

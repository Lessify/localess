import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens.module.js';
import { OpenApiController } from './controllers/open-api.controller.js';
import { SchemasController } from './controllers/schemas.controller.js';
import { SchemasPublicController } from './controllers/schemas.public.controller.js';
import { SchemasRepository } from './repositories/schemas.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { OpenApiService } from './services/open-api.service.js';
import { SchemasService } from './services/schemas.service.js';

/** Layered (docs/server-architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokensModule],
  controllers: [SchemasController, OpenApiController, SchemasPublicController],
  providers: [SchemasService, OpenApiService, SchemasRepository, SpaceRepository],
})
export class SchemasModule {}

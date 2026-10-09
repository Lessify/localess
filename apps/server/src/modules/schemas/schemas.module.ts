import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import { OpenApiController } from './open-api.controller.js';
import { SchemasController } from './schemas.controller.js';
import { SchemasPublicController } from './schemas.public.controller.js';
import { SchemasService } from './schemas.service.js';

@Module({
  imports: [ApiTokensModule, SpacesModule],
  controllers: [SchemasController, OpenApiController, SchemasPublicController],
  providers: [SchemasService],
})
export class SchemasModule {}

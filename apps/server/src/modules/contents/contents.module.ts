import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { ContentsController } from './controllers/contents.controller.js';
import { ContentsPublicController } from './controllers/contents.public.controller.js';
import { ContentDeliveryRepository } from './repositories/content-delivery.repository.js';
import { ContentsRepository } from './repositories/contents.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { ContentDeliveryService } from './services/content-delivery.service.js';
import { ContentsService } from './services/contents.service.js';

/** Layered (docs/server-architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokensModule],
  controllers: [ContentsController, ContentsPublicController],
  providers: [ContentsService, ContentDeliveryService, ContentsRepository, ContentDeliveryRepository, SpaceRepository],
})
export class ContentsModule {}

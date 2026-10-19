import { Module } from '@nestjs/common';
import { ApiTokenModule } from '../../auth/api-token.module.js';
import { ContentController } from './controllers/content.controller.js';
import { ContentCdnController } from './controllers/content.cdn.controller.js';
import { ContentDeliveryRepository } from './repositories/content-delivery.repository.js';
import { ContentRepository } from './repositories/content.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { ContentDeliveryService } from './services/content-delivery.service.js';
import { ContentService } from './services/content.service.js';

/** Layered (docs/server/architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokenModule],
  controllers: [ContentController, ContentCdnController],
  providers: [ContentService, ContentDeliveryService, ContentRepository, ContentDeliveryRepository, SpaceRepository],
})
export class ContentModule {}

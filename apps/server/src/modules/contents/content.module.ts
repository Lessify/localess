import { Module } from '@nestjs/common';

import { ApiTokenModule } from '../../auth/api-token.module.js';
import { ContentCdnController } from './controllers/content.cdn.controller.js';
import { ContentController } from './controllers/content.controller.js';
import { ContentRepository } from './repositories/content.repository.js';
import { ContentDeliveryRepository } from './repositories/content-delivery.repository.js';
import { ContentService } from './services/content.service.js';
import { ContentDeliveryService } from './services/content-delivery.service.js';

/** Layered (docs/server/architecture.md): its own controllers, services and repositories; no other feature module. */
@Module({
  imports: [ApiTokenModule],
  controllers: [ContentController, ContentCdnController],
  providers: [ContentService, ContentDeliveryService, ContentRepository, ContentDeliveryRepository],
})
export class ContentModule {}

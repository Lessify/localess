import { Module } from '@nestjs/common';
import { AssetsController } from './controllers/assets.controller.js';
import { AssetsPublicController } from './controllers/assets.public.controller.js';
import { AssetsRepository } from './repositories/assets.repository.js';
import { SpaceRepository } from './repositories/space.repository.js';
import { AssetDeliveryService } from './services/asset-delivery.service.js';
import { AssetsService } from './services/assets.service.js';

/**
 * Layered (docs/server-architecture.md): its own controllers, services and repositories; no other feature module.
 * Reading a stored file's metadata is shared (SharedModule's AssetMetadataService), as tasks and the Firebase import
 * use it too.
 */
@Module({
  controllers: [AssetsController, AssetsPublicController],
  providers: [AssetsService, AssetDeliveryService, AssetsRepository, SpaceRepository],
})
export class AssetsModule {}

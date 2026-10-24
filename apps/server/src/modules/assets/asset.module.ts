import { Module } from '@nestjs/common';

import { AssetCdnController } from './controllers/asset.cdn.controller.js';
import { AssetController } from './controllers/asset.controller.js';
import { AssetRepository } from './repositories/asset.repository.js';
import { AssetService } from './services/asset.service.js';
import { AssetDeliveryService } from './services/asset-delivery.service.js';

/**
 * Layered (docs/server/architecture.md): its own controllers, services and repositories; no other feature module.
 * Reading a stored file's metadata is shared (SharedModule's AssetMetadataService), as tasks and the Firebase import
 * use it too.
 */
@Module({
  controllers: [AssetController, AssetCdnController],
  providers: [AssetService, AssetDeliveryService, AssetRepository],
})
export class AssetModule {}

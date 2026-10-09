import { Module } from '@nestjs/common';
import { AssetDeliveryService } from './asset-delivery.service.js';
import { AssetMetadataService } from './asset-metadata.service.js';
import { AssetsController } from './assets.controller.js';
import { AssetsPublicController } from './assets.public.controller.js';
import { AssetsService } from './assets.service.js';

@Module({
  controllers: [AssetsController, AssetsPublicController],
  providers: [AssetsService, AssetMetadataService, AssetDeliveryService],
  exports: [AssetMetadataService],
})
export class AssetsModule {}

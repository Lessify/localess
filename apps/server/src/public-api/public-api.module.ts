import { Module } from '@nestjs/common';
import { AssetDeliveryService } from './asset-delivery.service.js';
import { CdnController } from './cdn.controller.js';
import { DevToolsController } from './dev-tools.controller.js';
import { ManageController } from './manage.controller.js';
import { PublicContentService } from './public-content.service.js';
import { TokenAuthService } from './token-auth.service.js';

/** The public `/api/v1` API (was the `publicv1` Cloud Function). */
@Module({
  controllers: [CdnController, DevToolsController, ManageController],
  providers: [PublicContentService, TokenAuthService, AssetDeliveryService],
  exports: [TokenAuthService, PublicContentService],
})
export class PublicApiModule {}

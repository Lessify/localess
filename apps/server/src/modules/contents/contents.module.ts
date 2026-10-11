import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { ContentDeliveryService } from './content-delivery.service.js';
import { ContentsController } from './contents.controller.js';
import { ContentsPublicController } from './contents.public.controller.js';
import { ContentsService } from './contents.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [ContentsController, ContentsPublicController],
  providers: [ContentsService, ContentDeliveryService],
})
export class ContentsModule {}

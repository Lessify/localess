import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../../auth/api-tokens/api-tokens.module.js';
import { LocalesController } from './locales.controller.js';
import { SpacesController } from './spaces.controller.js';
import { SpacesPublicController } from './spaces.public.controller.js';
import { SpacesService } from './spaces.service.js';

@Module({
  imports: [ApiTokensModule],
  controllers: [LocalesController, SpacesController, SpacesPublicController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}

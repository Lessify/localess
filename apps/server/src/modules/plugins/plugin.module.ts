import { Module } from '@nestjs/common';

import { UnsplashController } from './controllers/unsplash.controller.js';
import { UnsplashService } from './services/unsplash.service.js';

@Module({ controllers: [UnsplashController], providers: [UnsplashService] })
export class PluginModule {}

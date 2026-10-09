import { Module } from '@nestjs/common';
import { UnsplashController } from './unsplash.controller.js';

@Module({ controllers: [UnsplashController] })
export class PluginsModule {}

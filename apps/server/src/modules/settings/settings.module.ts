import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';

@Module({ controllers: [SettingsController] })
export class SettingsModule {}

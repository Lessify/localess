import { DynamicModule, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfig } from './config/config.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { PublicApiModule } from './public-api/public-api.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule, StorageModule, AuthModule, PublicApiModule],
      controllers: [HealthController],
    };
  }
}

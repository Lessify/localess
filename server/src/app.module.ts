import { DynamicModule, Module } from '@nestjs/common';
import { AppConfig } from './config/config.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule],
      controllers: [HealthController],
    };
  }
}

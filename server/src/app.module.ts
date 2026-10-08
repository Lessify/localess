import { DynamicModule, Module } from '@nestjs/common';
import { AppApiModule } from './app-api/app-api.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppConfig } from './config/config.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthController } from './health/health.controller.js';
import { PublicApiModule } from './public-api/public-api.module.js';
import { StorageModule } from './storage/storage.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        DatabaseModule,
        StorageModule,
        EventsModule,
        WebhooksModule,
        AuthModule,
        PublicApiModule,
        AppApiModule,
      ],
      controllers: [HealthController],
    };
  }
}

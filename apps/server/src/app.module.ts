import { DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module.js';
import { AppConfig } from './infra/config/config.js';
import { ConfigModule } from './infra/config/config.module.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { EventModule } from './infra/events/event.module.js';
import { HealthController } from './infra/health/health.controller.js';
import { SecretModule } from './infra/secrets/secret.module.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { AssetModule } from './modules/assets/asset.module.js';
import { ContentModule } from './modules/contents/content.module.js';
import { EventStreamModule } from './modules/events/event-stream.module.js';
import { FirebaseImportModule } from './modules/firebase-import/firebase-import.module.js';
import { IntegrationModule } from './modules/integrations/integration.module.js';
import { PluginModule } from './modules/plugins/plugin.module.js';
import { SchemaModule } from './modules/schemas/schema.module.js';
import { SpaceModule } from './modules/spaces/space.module.js';
import { TaskModule } from './modules/tasks/task.module.js';
import { TranslationModule } from './modules/translations/translation.module.js';
import { UserModule } from './modules/users/user.module.js';
import { WebhookModule } from './modules/webhooks/webhook.module.js';
import { SharedModule } from './shared/shared.module.js';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        ScheduleModule.forRoot(),
        DatabaseModule,
        StorageModule,
        EventModule,
        SecretModule,
        SharedModule,
        WebhookModule,
        AuthModule,
        // Features: each owns its App API (/api/app) and public API (/api/v1) controllers.
        UserModule,
        SpaceModule,
        SchemaModule,
        ContentModule,
        TranslationModule,
        AssetModule,
        TaskModule,
        FirebaseImportModule,
        EventStreamModule,
        PluginModule,
        IntegrationModule,
      ],
      controllers: [HealthController],
    };
  }
}

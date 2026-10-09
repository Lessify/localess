import { DynamicModule, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AppConfig } from './infra/config/config.js';
import { ConfigModule } from './infra/config/config.module.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { EventsModule } from './infra/events/events.module.js';
import { HealthController } from './infra/health/health.controller.js';
import { StorageModule } from './infra/storage/storage.module.js';
import { AssetsModule } from './modules/assets/assets.module.js';
import { ContentsModule } from './modules/contents/contents.module.js';
import { PluginsModule } from './modules/plugins/plugins.module.js';
import { SchemasModule } from './modules/schemas/schemas.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SpacesModule } from './modules/spaces/spaces.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { TokensModule } from './modules/tokens/tokens.module.js';
import { TranslationsModule } from './modules/translations/translations.module.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';

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
        // Features: each owns its App API (/api/app) and public API (/api/v1) controllers.
        SpacesModule,
        SettingsModule,
        SchemasModule,
        ContentsModule,
        TranslationsModule,
        AssetsModule,
        TokensModule,
        TasksModule,
        PluginsModule,
      ],
      controllers: [HealthController],
    };
  }
}

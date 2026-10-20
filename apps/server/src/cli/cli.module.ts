import { DynamicModule, Module } from '@nestjs/common';

import { AppConfig } from '../infra/config/config.js';
import { ConfigModule } from '../infra/config/config.module.js';
import { DatabaseModule } from '../infra/database/database.module.js';
import { StorageModule } from '../infra/storage/storage.module.js';
import { FirstAdminRepository } from '../modules/users/repositories/first-admin.repository.js';
import { FirstAdminService } from '../modules/users/services/first-admin.service.js';

/** Database + the services CLI commands need, without HTTP. Creating it migrates the database. */
@Module({})
export class CliModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: CliModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule, StorageModule],
      providers: [FirstAdminService, FirstAdminRepository],
    };
  }
}

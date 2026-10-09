import { DynamicModule, Module } from '@nestjs/common';
import { FirstAdminService } from '../auth/users/first-admin.service.js';
import { AppConfig } from '../infra/config/config.js';
import { ConfigModule } from '../infra/config/config.module.js';
import { DatabaseModule } from '../infra/database/database.module.js';
import { StorageModule } from '../infra/storage/storage.module.js';
import { UsersService } from '../auth/users/users.service.js';

/** Database + the services CLI commands need, without HTTP. Creating it migrates the database. */
@Module({})
export class CliModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: CliModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule, StorageModule],
      providers: [UsersService, FirstAdminService],
    };
  }
}

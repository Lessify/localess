import { DynamicModule, Module } from '@nestjs/common';
import { FirstAdminService } from '../bootstrap/first-admin.service.js';
import { AppConfig } from '../config/config.js';
import { ConfigModule } from '../config/config.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { UsersService } from '../users/users.service.js';

/** Database + the services CLI commands need, without HTTP. Creating it migrates the database. */
@Module({})
export class CliModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: CliModule,
      imports: [ConfigModule.forRoot(config), DatabaseModule],
      providers: [UsersService, FirstAdminService],
    };
  }
}

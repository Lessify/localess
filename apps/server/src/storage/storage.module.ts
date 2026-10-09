import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/config.js';
import { FsStorageDriver } from './fs-storage.driver.js';
import { STORAGE_DRIVER } from './storage.driver.js';

@Global()
@Module({
  providers: [{ provide: STORAGE_DRIVER, inject: [APP_CONFIG], useFactory: (config: AppConfig) => new FsStorageDriver(config.storageDir) }],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}

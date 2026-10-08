import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from './config.js';

@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}

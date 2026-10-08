import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/config.js';
import { SpaFallbackFilter } from './static/spa-fallback.filter.js';
import { registerStaticSite } from './static/static-site.js';

export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule.forRoot(config), new FastifyAdapter({ trustProxy: true }), {
    logger: config.logLevels,
  });
  app.enableShutdownHooks();
  if (config.staticDir) {
    await registerStaticSite(app.getHttpAdapter().getInstance(), config.staticDir);
    app.useGlobalFilters(new SpaFallbackFilter(config.staticDir));
  } else {
    Logger.warn('LOCALESS_STATIC_DIR is empty, serving the API only', 'Bootstrap');
  }
  return app;
}

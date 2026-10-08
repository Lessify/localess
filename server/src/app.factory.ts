import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { AppConfig } from './config/config.js';
import { SpaFallbackFilter } from './static/spa-fallback.filter.js';
import { registerStaticSite } from './static/static-site.js';

export async function createApp(config: AppConfig): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(config),
    new FastifyAdapter({
      trustProxy: true,
      // Schema push payloads carry a whole space's schemas in one body.
      bodyLimit: 5 * 1024 * 1024,
    }),
    {
      logger: config.logLevels,
    },
  );
  app.enableShutdownHooks();
  await app.register(fastifyCookie);
  // The public API is called from customer sites, so it reflects any origin (as `cors({ origin: true })`
  // did). The cookie-authenticated app API is same-origin only and gets no CORS headers.
  await app.register(fastifyCors, {
    delegator: (request, callback) => callback(null, { origin: request.url?.startsWith('/api/v1/') ?? false }),
  });
  // gzip for compressible content types over 1 KB (JSON, SVG); images and videos are left alone.
  await app.register(fastifyCompress, { encodings: ['gzip', 'deflate'], threshold: 1024 });
  // Opt-in per route via `@RouteConfig({ rateLimit })` (login).
  await app.register(fastifyRateLimit, {
    global: false,
    // Thrown as an HttpException so Nest answers 429 instead of wrapping a plain Error into a 500.
    errorResponseBuilder: (_request, context) =>
      new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, error: 'Too Many Requests', message: `Rate limit exceeded, retry in ${context.after}` },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
  });
  if (config.staticDir) {
    await registerStaticSite(app.getHttpAdapter().getInstance(), config.staticDir);
    app.useGlobalFilters(new SpaFallbackFilter(config.staticDir));
  } else {
    Logger.warn('LOCALESS_STATIC_DIR is empty, serving the API only', 'Bootstrap');
  }
  return app;
}

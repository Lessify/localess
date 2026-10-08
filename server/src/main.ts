import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { createApp } from './app.factory.js';
import { loadConfig } from './config/config.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  // Applies before the Nest app exists, e.g. to embedded Postgres start-up.
  Logger.overrideLogger(config.logLevels);
  const app = await createApp(config);
  await app.listen(config.port, config.host);
  Logger.log(`Localess listening on http://${config.host}:${config.port}`, 'Bootstrap');
}

void bootstrap();

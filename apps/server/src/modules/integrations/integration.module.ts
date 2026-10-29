import { Module } from '@nestjs/common';

import { IntegrationController } from './controllers/integration.controller.js';
import { IntegrationAdminService } from './services/integration-admin.service.js';

/** Admin → Settings → Integrations; resolving and using integrations is shared (SharedModule's IntegrationService). */
@Module({ controllers: [IntegrationController], providers: [IntegrationAdminService] })
export class IntegrationModule {}

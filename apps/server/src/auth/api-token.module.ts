import { Module } from '@nestjs/common';

import { CdnTokenGuard } from './guards/cdn-token.guard.js';
import { ManagementTokenGuard } from './guards/management-token.guard.js';
import { ApiTokenRepository } from './repositories/api-token.repository.js';
import { TokenAuthService } from './services/token-auth.service.js';

/**
 * Space API tokens as the CDN and Management APIs check them; imported by every feature with such a controller (the guards
 * attached by `@CdnToken` / `@ManagementToken` are resolved in the controller's module).
 */
@Module({
  providers: [TokenAuthService, ApiTokenRepository, CdnTokenGuard, ManagementTokenGuard],
  exports: [TokenAuthService, CdnTokenGuard, ManagementTokenGuard],
})
export class ApiTokenModule {}

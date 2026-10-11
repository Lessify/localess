import { Module } from '@nestjs/common';
import { ApiTokensRepository } from './repositories/api-tokens.repository.js';
import { TokenAuthService } from './services/token-auth.service.js';

/** Space API tokens as the public /api/v1 sees them; imported by every feature with a public controller. */
@Module({ providers: [TokenAuthService, ApiTokensRepository], exports: [TokenAuthService] })
export class ApiTokensModule {}

import { Module } from '@nestjs/common';
import { TokenAuthService } from './token-auth.service.js';

/** Space API tokens as the public /api/v1 sees them; imported by every feature with a public controller. */
@Module({ providers: [TokenAuthService], exports: [TokenAuthService] })
export class ApiTokensModule {}

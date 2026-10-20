import { Module } from '@nestjs/common';

import { TokenController } from './controllers/token.controller.js';
import { TokenRepository } from './repositories/token.repository.js';
import { TokenService } from './services/token.service.js';

@Module({ controllers: [TokenController], providers: [TokenService, TokenRepository] })
export class TokenModule {}

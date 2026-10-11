import { Module } from '@nestjs/common';
import { TokensController } from './controllers/tokens.controller.js';
import { TokensRepository } from './repositories/tokens.repository.js';
import { TokensService } from './services/tokens.service.js';

@Module({ controllers: [TokensController], providers: [TokensService, TokensRepository] })
export class TokensModule {}

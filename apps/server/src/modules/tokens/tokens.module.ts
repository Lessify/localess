import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller.js';

@Module({ controllers: [TokensController] })
export class TokensModule {}

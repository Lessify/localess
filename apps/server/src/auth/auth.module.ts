import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirstAdminService } from './users/first-admin.service.js';
import { MeController } from './users/me.controller.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';
import { MailService } from '../infra/mail/mail.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { AppConfigController } from './app-config.controller.js';
import { AuthController } from './auth.controller.js';
import { OAuthController } from './oauth.controller.js';
import { OAuthService } from './oauth.service.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController, OAuthController, AppConfigController, MeController, UsersController],
  providers: [
    AuthService,
    SessionService,
    UsersService,
    FirstAdminService,
    MailService,
    PasswordResetService,
    OAuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SessionService, UsersService, FirstAdminService],
})
export class AuthModule {}

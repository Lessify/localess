import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigController } from './controllers/app-config.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { OAuthController } from './controllers/oauth.controller.js';
import { AuthUsersRepository } from './repositories/auth-users.repository.js';
import { PasswordResetTokensRepository } from './repositories/password-reset-tokens.repository.js';
import { SessionsRepository } from './repositories/sessions.repository.js';
import { AuthCleanupService } from './services/auth-cleanup.service.js';
import { AuthService } from './services/auth.service.js';
import { OAuthService } from './services/oauth.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { SessionService } from './services/session.service.js';
import { AuthGuard } from './auth.guard.js';

/**
 * Sign-in for the App API (docs/server-architecture.md): sessions, email + password, OAuth, password reset, and the
 * global `AuthGuard`. Exports what feature modules build on (the users module: re-checking a password, signing a
 * user out, reset links).
 */
@Module({
  controllers: [AuthController, OAuthController, AppConfigController],
  providers: [
    AuthService,
    SessionService,
    PasswordResetService,
    AuthCleanupService,
    OAuthService,
    SessionsRepository,
    PasswordResetTokensRepository,
    AuthUsersRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, SessionService, PasswordResetService],
})
export class AuthModule {}

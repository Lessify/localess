import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { zAuthLogin, zPasswordResetConfirm, zPasswordResetRequest } from '@localess/shared/zod';
import type { AuthLogin, PasswordResetConfirm, PasswordResetRequest } from '@localess/shared';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import type { UserDto } from '../../shared/transformers/user.transformer.js';
import { AuthService } from '../services/auth.service.js';
import { Public } from '../decorators.js';
import { PasswordResetService } from '../services/password-reset.service.js';
import { publicOrigin } from '../utils/public-url.js';
import { CurrentUser } from '../request-context.js';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '../utils/session-cookie.js';
import { SessionService } from '../services/session.service.js';
import type { UserEntity } from '../../shared/entities/user.entity.js';

/** Login attempts per client IP per minute; LOCALESS_LOGIN_RATE_LIMIT overrides (read per request). */
const loginRateLimit = (): number => Number(process.env['LOCALESS_LOGIN_RATE_LIMIT'] ?? 10);

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly passwordResetService: PasswordResetService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async login(
    @Body({ schema: zAuthLogin }) body: AuthLogin,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ user: UserDto }> {
    const user = await this.authService.verifyCredentials(body.email, body.password);
    const { token, expiresAt } = await this.sessionService.create(user.id, { userAgent: request.headers['user-agent'], ip: request.ip });
    setSessionCookie(request, reply, token, expiresAt);
    return { user: await this.authService.toUser(user) };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    const session = await this.sessionService.resolve(request.cookies?.[SESSION_COOKIE]);
    if (session) await this.sessionService.revoke(session.id);
    clearSessionCookie(reply);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(204)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async requestPasswordReset(
    @Body({ schema: zPasswordResetRequest }) body: PasswordResetRequest,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.passwordResetService.request(body.email, publicOrigin(this.config, request));
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(204)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async confirmPasswordReset(@Body({ schema: zPasswordResetConfirm }) body: PasswordResetConfirm): Promise<void> {
    await this.passwordResetService.confirm(body.token, body.password);
  }

  /** The signed-in user, including role and permissions (replaces `getIdTokenResult().claims`). */
  @Get('me')
  async me(@CurrentUser() user: UserEntity): Promise<{ user: UserDto }> {
    return { user: await this.authService.toUser(user) };
  }
}

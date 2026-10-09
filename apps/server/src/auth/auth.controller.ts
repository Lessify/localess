import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ZodValidationPipe } from '../infra/http/zod-validation.pipe.js';
import { APP_CONFIG, type AppConfig } from '../infra/config/config.js';
import { UserDto, type UserRow, UsersService } from './users/users.service.js';
import { AuthService } from './auth.service.js';
import { Public } from './decorators.js';
import { PASSWORD_MIN_LENGTH } from './password.js';
import { PasswordResetService } from './password-reset.service.js';
import { publicOrigin } from './public-url.js';
import { CurrentUser } from './request-context.js';
import { clearSessionCookie, setSessionCookie } from './session-cookie.js';
import { SESSION_COOKIE, SessionService } from './session.service.js';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const resetRequestSchema = z.object({ email: z.string().trim().email() });
const resetConfirmSchema = z.object({ token: z.string().min(1), password: z.string().min(PASSWORD_MIN_LENGTH) });

/** Login attempts per client IP per minute; LOCALESS_LOGIN_RATE_LIMIT overrides (read per request). */
const loginRateLimit = (): number => Number(process.env['LOCALESS_LOGIN_RATE_LIMIT'] ?? 10);

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
    private readonly passwordReset: PasswordResetService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ user: UserDto }> {
    const user = await this.auth.verifyCredentials(body.email, body.password);
    const { token, expiresAt } = await this.sessions.create(user.id, { userAgent: request.headers['user-agent'], ip: request.ip });
    setSessionCookie(request, reply, token, expiresAt);
    return { user: await this.users.toDto(user) };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    const session = await this.sessions.resolve(request.cookies?.[SESSION_COOKIE]);
    if (session) await this.sessions.revoke(session.id);
    clearSessionCookie(reply);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(204)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(resetRequestSchema)) body: z.infer<typeof resetRequestSchema>,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.passwordReset.request(body.email, publicOrigin(this.config, request));
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(204)
  @RouteConfig({ rateLimit: { max: loginRateLimit, timeWindow: '1 minute' } })
  async confirmPasswordReset(@Body(new ZodValidationPipe(resetConfirmSchema)) body: z.infer<typeof resetConfirmSchema>): Promise<void> {
    await this.passwordReset.confirm(body.token, body.password);
  }

  /** The signed-in user, including role and permissions (replaces `getIdTokenResult().claims`). */
  @Get('me')
  async me(@CurrentUser() user: UserRow): Promise<{ user: UserDto }> {
    return { user: await this.users.toDto(user) };
  }
}

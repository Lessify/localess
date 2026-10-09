import { Controller, Get, Inject, NotFoundException, Param, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { APP_CONFIG, AppConfig } from '../config/config.js';
import { Public } from './decorators.js';
import { OAuthError, OAuthFlow, OAuthService, safeReturnTo } from './oauth.service.js';
import { publicOrigin } from './public-url.js';
import { setSessionCookie } from './session-cookie.js';
import { SessionService } from './session.service.js';

const FLOW_COOKIE = 'localess_oauth';
const FLOW_COOKIE_PATH = '/api/auth/oauth';
const FLOW_TTL_SECONDS = 10 * 60;
const LOGIN_PAGE = '/auth/login';

function readFlow(request: FastifyRequest): OAuthFlow | undefined {
  const raw = request.cookies?.[FLOW_COOKIE];
  if (!raw) return undefined;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as OAuthFlow;
  } catch {
    return undefined;
  }
}

@Public()
@Controller('api/auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauth: OAuthService,
    private readonly sessions: SessionService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Browser navigation target of the "Sign in with …" buttons. */
  @Get(':provider')
  async start(
    @Param('provider') provider: string,
    @Query('returnTo') returnTo: string | undefined,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    if (!this.oauth.isEnabled(provider)) throw new NotFoundException();
    const { url, flow } = await this.oauth.start(provider, publicOrigin(this.config, request), returnTo ?? '/');
    void reply
      .setCookie(FLOW_COOKIE, Buffer.from(JSON.stringify(flow)).toString('base64url'), {
        path: FLOW_COOKIE_PATH,
        httpOnly: true,
        // Lax still sends it on the provider's top-level redirect back to us.
        sameSite: 'lax',
        secure: request.protocol === 'https',
        maxAge: FLOW_TTL_SECONDS,
      })
      .redirect(url.href, 302);
  }

  @Get(':provider/callback')
  async callback(@Param('provider') provider: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const flow = readFlow(request);
    void reply.clearCookie(FLOW_COOKIE, { path: FLOW_COOKIE_PATH });
    if (!this.oauth.isEnabled(provider) || !flow || flow.provider !== provider) {
      void reply.redirect(`${LOGIN_PAGE}?error=failed`, 302);
      return;
    }
    try {
      const callbackUrl = new URL(request.url, publicOrigin(this.config, request));
      const user = await this.oauth.finish(flow, callbackUrl);
      const { token, expiresAt } = await this.sessions.create(user.id, { userAgent: request.headers['user-agent'], ip: request.ip });
      setSessionCookie(request, reply, token, expiresAt);
      void reply.redirect(safeReturnTo(flow.returnTo), 302);
    } catch (error) {
      const code = error instanceof OAuthError ? error.code : 'failed';
      void reply.redirect(`${LOGIN_PAGE}?error=${code}`, 302);
    }
  }
}

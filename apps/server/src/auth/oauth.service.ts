import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import * as client from 'openid-client';
import { APP_CONFIG, AppConfig, OAuthProviderId } from '../infra/config/config.js';
import { DATABASE, Database } from '../infra/database/database.module.js';
import { userIdentities } from '../infra/database/schema.js';
import { UserRow, UsersService } from './users/users.service.js';

/** What we keep between the redirect to the provider and its callback (in an HttpOnly cookie). */
export interface OAuthFlow {
  provider: OAuthProviderId;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

/** Reasons a sign-in is refused; sent to the login page as `?error=`. */
export type OAuthErrorCode = 'failed' | 'email-not-verified' | 'wrong-domain' | 'no-account' | 'disabled';

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const isLoopback = (url: URL) => url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

/** Only same-site paths, never `//evil.com` or absolute URLs. */
export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/';
}

/**
 * Google / Microsoft sign-in (authorization code + PKCE, state and nonce), replacing Firebase's
 * `signInWithPopup`. Accounts are matched by provider subject, then by verified email; new accounts are
 * only created with LOCALESS_AUTH_AUTO_REGISTER, and get no role.
 */
@Injectable()
export class OAuthService implements OnModuleInit {
  private readonly logger = new Logger(OAuthService.name);
  private readonly configurations = new Map<OAuthProviderId, Promise<client.Configuration>>();

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DATABASE) private readonly db: Database,
    private readonly users: UsersService,
  ) {}

  onModuleInit(): void {
    for (const problem of this.config.auth.misconfigured) {
      this.logger.warn(`OAuth provider disabled: ${problem}`);
    }
  }

  enabledProviders(): OAuthProviderId[] {
    return Object.keys(this.config.auth.providers) as OAuthProviderId[];
  }

  isEnabled(provider: string): provider is OAuthProviderId {
    return (this.enabledProviders() as string[]).includes(provider);
  }

  private configuration(provider: OAuthProviderId): Promise<client.Configuration> {
    let configuration = this.configurations.get(provider);
    if (!configuration) {
      const settings = this.config.auth.providers[provider];
      if (!settings) throw new NotFoundException();
      const issuer = new URL(settings.issuer);
      configuration = client.discovery(
        issuer,
        settings.clientId,
        undefined,
        client.ClientSecretPost(settings.clientSecret),
        isLoopback(issuer) ? { execute: [client.allowInsecureRequests] } : undefined,
      );
      // Don't cache a failed discovery: the provider may just have been unreachable.
      configuration.catch(() => this.configurations.delete(provider));
      this.configurations.set(provider, configuration);
    }
    return configuration;
  }

  static callbackUrl(origin: string, provider: OAuthProviderId): string {
    return `${origin}/api/auth/oauth/${provider}/callback`;
  }

  async start(provider: OAuthProviderId, origin: string, returnTo: string): Promise<{ url: URL; flow: OAuthFlow }> {
    const configuration = await this.configuration(provider);
    const flow: OAuthFlow = {
      provider,
      state: client.randomState(),
      nonce: client.randomNonce(),
      codeVerifier: client.randomPKCECodeVerifier(),
      returnTo: safeReturnTo(returnTo),
    };
    const parameters: Record<string, string> = {
      redirect_uri: OAuthService.callbackUrl(origin, provider),
      scope: 'openid email profile',
      response_type: 'code',
      state: flow.state,
      nonce: flow.nonce,
      code_challenge: await client.calculatePKCECodeChallenge(flow.codeVerifier),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    };
    // A hint only — the `hd` claim is verified on the way back.
    if (provider === 'google' && this.config.auth.customDomain) parameters['hd'] = this.config.auth.customDomain;
    return { url: client.buildAuthorizationUrl(configuration, parameters), flow };
  }

  async finish(flow: OAuthFlow, callbackUrl: URL): Promise<UserRow> {
    const configuration = await this.configuration(flow.provider);
    let claims: client.IDToken | undefined;
    try {
      const tokens = await client.authorizationCodeGrant(configuration, callbackUrl, {
        pkceCodeVerifier: flow.codeVerifier,
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        idTokenExpected: true,
      });
      claims = tokens.claims();
    } catch (error) {
      this.logger.warn(`${flow.provider} sign-in failed: ${error instanceof Error ? error.message : error}`);
      throw new OAuthError('failed', 'Sign-in with the provider failed');
    }
    if (!claims) throw new OAuthError('failed', 'The provider returned no ID token');
    return this.resolveUser(flow.provider, claims);
  }

  private verifiedEmail(provider: OAuthProviderId, claims: client.IDToken): string {
    if (provider === 'google') {
      if (claims['email_verified'] !== true || typeof claims['email'] !== 'string') {
        throw new OAuthError('email-not-verified', 'Google did not return a verified email');
      }
      if (this.config.auth.customDomain && claims['hd'] !== this.config.auth.customDomain) {
        throw new OAuthError('wrong-domain', `Only ${this.config.auth.customDomain} accounts may sign in`);
      }
      return claims['email'];
    }
    // Microsoft: the issuer (and so the tenant) was verified against the configured one, so its
    // directory vouches for the address.
    const email = claims['email'] ?? claims['preferred_username'];
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new OAuthError('email-not-verified', 'Microsoft did not return an email');
    }
    return email;
  }

  private async resolveUser(provider: OAuthProviderId, claims: client.IDToken): Promise<UserRow> {
    const subject = claims.sub;
    const [identity] = await this.db
      .select({ userId: userIdentities.userId })
      .from(userIdentities)
      .where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerSubject, subject)));

    let user = identity ? await this.users.findById(identity.userId) : undefined;
    if (!user) {
      const email = this.verifiedEmail(provider, claims);
      user = await this.users.findByEmail(email);
      if (!user) {
        if (!this.config.auth.autoRegister) throw new OAuthError('no-account', `No Localess account for ${email}`);
        user = await this.users.create({
          email,
          emailVerified: true,
          displayName: typeof claims['name'] === 'string' ? claims['name'] : undefined,
        });
      }
      await this.db.insert(userIdentities).values({ userId: user.id, provider, providerSubject: subject }).onConflictDoNothing();
    } else if (provider === 'google') {
      // Re-check the domain on every sign-in, not just the first.
      this.verifiedEmail(provider, claims);
    }
    if (user.disabled) throw new OAuthError('disabled', 'This account is disabled');
    return user;
  }
}

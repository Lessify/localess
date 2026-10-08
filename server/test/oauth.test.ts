import { eq } from 'drizzle-orm';
import type { LightMyRequestResponse } from 'fastify';
import { OAuth2Server } from 'oauth2-mock-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { userIdentities, users } from '../src/database/schema.js';
import { UsersService } from '../src/users/users.service.js';
import { freePort } from './free-port.js';
import { createTestApp, sessionCookie, TestApp } from './test-app.js';

const ORIGIN = 'http://localess.test';

describe('OAuth sign-in', () => {
  let idp: OAuth2Server;
  let claims: Record<string, unknown>;

  beforeAll(async () => {
    idp = new OAuth2Server();
    await idp.issuer.keys.generate('RS256');
    await idp.start(await freePort(), '127.0.0.1');
    idp.service.on('beforeTokenSigning', token => {
      if ('nonce' in token.payload || token.payload['aud']) Object.assign(token.payload, claims);
    });
  });

  afterAll(() => idp?.stop());

  beforeEach(() => {
    claims = { sub: 'google-sub-1', email: 'alice@example.com', email_verified: true, name: 'Alice' };
  });

  const appFor = (env: Record<string, string> = {}) =>
    createTestApp({
      LOCALESS_PUBLIC_URL: ORIGIN,
      LOCALESS_AUTH_PROVIDERS: 'GOOGLE,MICROSOFT',
      LOCALESS_GOOGLE_CLIENT_ID: 'google-client',
      LOCALESS_GOOGLE_CLIENT_SECRET: 'google-secret',
      LOCALESS_GOOGLE_ISSUER: idp.issuer.url as string,
      LOCALESS_MICROSOFT_CLIENT_ID: 'ms-client',
      LOCALESS_MICROSOFT_CLIENT_SECRET: 'ms-secret',
      LOCALESS_MICROSOFT_ISSUER: idp.issuer.url as string,
      ...env,
    });

  /** Drives the browser: our redirect → provider → our callback. Returns the callback response. */
  async function signIn(t: TestApp, provider = 'google', returnTo = '/features'): Promise<LightMyRequestResponse> {
    const start = await t.request({ method: 'GET', url: `/api/auth/oauth/${provider}?returnTo=${encodeURIComponent(returnTo)}` });
    expect(start.statusCode).toBe(302);
    const flowCookie = start.cookies.find(it => it.name === 'localess_oauth');
    expect(flowCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/api/auth/oauth' });

    const authorizeUrl = new URL(start.headers.location as string);
    expect(authorizeUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizeUrl.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/oauth/${provider}/callback`);

    const idpResponse = await fetch(authorizeUrl, { redirect: 'manual' });
    const callback = new URL(idpResponse.headers.get('location') as string);
    return t.request({
      method: 'GET',
      url: callback.pathname + callback.search,
      headers: { cookie: `localess_oauth=${flowCookie?.value}` },
    });
  }

  describe('with existing accounts only (default)', () => {
    let t: TestApp;

    beforeAll(async () => {
      t = await appFor();
      const service = t.app.get(UsersService);
      await service.create({ email: 'Alice@Example.com', role: 'custom', permissions: ['CONTENT_READ'] });
      await service.create({ email: 'blocked@example.com', role: 'custom' });
      await t.db.update(users).set({ disabled: true }).where(eq(users.email, 'blocked@example.com'));
    });

    afterAll(() => t?.close());

    it('advertises the configured providers', async () => {
      const response = await t.request({ method: 'GET', url: '/api/config' });
      expect(response.json()).toEqual({ auth: { providers: ['GOOGLE', 'MICROSOFT'], loginMessage: '', passwordResetByEmail: false } });
    });

    it('signs an existing user in by verified email, links the identity, and returns to the app', async () => {
      const response = await signIn(t, 'google', '/features/spaces');
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/features/spaces');

      const me = await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie(response) } });
      expect(me.json().user).toMatchObject({ email: 'Alice@Example.com', role: 'custom', providers: ['google.com'] });
      expect(await t.db.select().from(userIdentities)).toEqual([
        expect.objectContaining({ provider: 'google', providerSubject: 'google-sub-1' }),
      ]);
    });

    it('recognises a linked identity even after the provider email changes', async () => {
      claims = { ...claims, email: 'alice.renamed@example.com' };
      const response = await signIn(t);
      expect(response.headers.location).toBe('/features');
      const me = await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie(response) } });
      expect(me.json().user.email).toBe('Alice@Example.com');
    });

    it('refuses unknown accounts', async () => {
      claims = { sub: 'stranger', email: 'stranger@example.com', email_verified: true };
      const response = await signIn(t);
      expect(response.headers.location).toBe('/auth/login?error=no-account');
      expect(response.cookies.find(it => it.name === 'localess_session')).toBeUndefined();
    });

    it('never links by an unverified Google email', async () => {
      claims = { sub: 'impostor', email: 'alice@example.com', email_verified: false };
      expect((await signIn(t)).headers.location).toBe('/auth/login?error=email-not-verified');
    });

    it('refuses disabled accounts', async () => {
      claims = { sub: 'blocked-sub', email: 'blocked@example.com', email_verified: true };
      expect((await signIn(t)).headers.location).toBe('/auth/login?error=disabled');
    });

    it('accepts Microsoft preferred_username from the configured tenant', async () => {
      await t.app.get(UsersService).create({ email: 'bob@contoso.com', role: 'custom' });
      claims = { sub: 'ms-sub-1', preferred_username: 'bob@contoso.com' };
      const response = await signIn(t, 'microsoft');
      expect(response.headers.location).toBe('/features');
      const me = await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie(response) } });
      expect(me.json().user).toMatchObject({ email: 'bob@contoso.com', providers: ['microsoft.com'] });
    });

    it('ignores off-site returnTo values', async () => {
      expect((await signIn(t, 'google', '//evil.example.com')).headers.location).toBe('/');
      expect((await signIn(t, 'google', 'https://evil.example.com')).headers.location).toBe('/');
    });

    it('fails without the flow cookie, or with a tampered state', async () => {
      const start = await t.request({ method: 'GET', url: '/api/auth/oauth/google' });
      const flowCookie = start.cookies.find(it => it.name === 'localess_oauth')?.value as string;
      const callback = new URL((await fetch(start.headers.location as string, { redirect: 'manual' })).headers.get('location') as string);

      const noCookie = await t.request({ method: 'GET', url: callback.pathname + callback.search });
      expect(noCookie.headers.location).toBe('/auth/login?error=failed');

      callback.searchParams.set('state', 'forged');
      const forged = await t.request({
        method: 'GET',
        url: callback.pathname + callback.search,
        headers: { cookie: `localess_oauth=${flowCookie}` },
      });
      expect(forged.headers.location).toBe('/auth/login?error=failed');
    });

    it('answers 404 for providers that are not enabled', async () => {
      expect((await t.request({ method: 'GET', url: '/api/auth/oauth/github' })).statusCode).toBe(404);
    });
  });

  describe('with auto-registration and a Workspace domain', () => {
    let t: TestApp;

    beforeAll(async () => {
      t = await appFor({
        LOCALESS_AUTH_AUTO_REGISTER: 'true',
        LOCALESS_AUTH_CUSTOM_DOMAIN: 'example.com',
        LOCALESS_AUTH_PROVIDERS: 'GOOGLE',
      });
    });

    afterAll(() => t?.close());

    it('creates an account with no role on first sign-in', async () => {
      claims = { ...claims, hd: 'example.com' };
      const start = await t.request({ method: 'GET', url: '/api/auth/oauth/google' });
      expect(new URL(start.headers.location as string).searchParams.get('hd')).toBe('example.com');

      const response = await signIn(t);
      const me = await t.request({ method: 'GET', url: '/api/auth/me', headers: { cookie: sessionCookie(response) } });
      expect(me.json().user).toMatchObject({
        email: 'alice@example.com',
        displayName: 'Alice',
        emailVerified: true,
        providers: ['google.com'],
      });
      expect(me.json().user).not.toHaveProperty('role');
    });

    it('rejects accounts outside the domain, even ones already linked', async () => {
      claims = { ...claims, hd: 'other.com' };
      expect((await signIn(t)).headers.location).toBe('/auth/login?error=wrong-domain');
      claims = { sub: 'gmail-user', email: 'someone@gmail.com', email_verified: true };
      expect((await signIn(t)).headers.location).toBe('/auth/login?error=wrong-domain');
    });
  });
});

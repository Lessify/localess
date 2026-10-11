import type { FastifyReply, FastifyRequest } from 'fastify';

export const SESSION_COOKIE = 'localess_session';

export function setSessionCookie(request: FastifyRequest, reply: FastifyReply, token: string, expires: Date): void {
  void reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // `trustProxy` is on, so this is true behind a TLS-terminating proxy too.
    secure: request.protocol === 'https',
    expires,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  void reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

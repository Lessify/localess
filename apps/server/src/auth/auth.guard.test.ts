import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { AuthGuard } from './auth.guard.js';
import { Public, RequireRole, SignedIn } from './decorators.js';
import type { SessionService } from './services/session.service.js';

class Forgotten {
  route(): void {}
}
@SignedIn()
class AnySession {
  route(): void {}
}
@RequireRole('ADMIN')
class AdminsOnly {
  route(): void {}
}
class Open {
  @Public()
  route(): void {}
}

/** The guard on `controller.route`, for a GET with the given session (`undefined`: none). */
function check(controller: new () => { route(): void }, role: string | null | undefined): Promise<boolean> {
  const sessions = {
    resolve: async () => (role === undefined ? undefined : { id: 's1', user: { id: 'u1', role } }),
  } as unknown as SessionService;
  const request = { method: 'GET', headers: {}, cookies: { localess_session: 'x' } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => controller.prototype.route,
    getClass: () => controller,
  };
  return new AuthGuard(new Reflector(), sessions).canActivate(context as never);
}

describe('AuthGuard: every session route declares its access', () => {
  it('refuses a session route that declares neither @RequireRole nor @SignedIn, even for an admin', async () => {
    await expect(check(Forgotten, 'ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets any session through @SignedIn, a user without a role included; none is a 401', async () => {
    await expect(check(AnySession, null)).resolves.toBe(true);
    await expect(check(AnySession, 'VIEWER')).resolves.toBe(true);
    await expect(check(AnySession, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('checks @RequireRole, and leaves @Public open without a session', async () => {
    await expect(check(AdminsOnly, 'ADMIN')).resolves.toBe(true);
    await expect(check(AdminsOnly, 'EDITOR')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(check(Open, undefined)).resolves.toBe(true);
  });
});

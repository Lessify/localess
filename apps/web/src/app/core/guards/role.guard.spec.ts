import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { ADMINS, CONTENT_WRITERS, UserRole } from '@localess/shared';
import { firstValueFrom, Observable } from 'rxjs';

import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  function run(state: { role?: UserRole; loaded?: boolean }, roles: UserRole | readonly UserRole[]) {
    const loaded = signal(state.loaded ?? true);
    const redirect = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: { loaded, role: signal(state.role) } },
        { provide: Router, useValue: { createUrlTree: () => redirect } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(roles)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return { result, loaded, redirect };
  }

  it('lets a role of the list through, or the one role named', async () => {
    expect(await firstValueFrom(run({ role: 'EDITOR' }, CONTENT_WRITERS).result)).toBe(true);
    TestBed.resetTestingModule();
    expect(await firstValueFrom(run({ role: 'ADMIN' }, 'ADMIN').result)).toBe(true);
  });

  it('redirects a role outside the list, or a user without a role', async () => {
    const denied = run({ role: 'TRANSLATOR' }, CONTENT_WRITERS);
    expect(await firstValueFrom(denied.result)).toBe(denied.redirect);
    TestBed.resetTestingModule();
    const noRole = run({}, ADMINS);
    expect(await firstValueFrom(noRole.result)).toBe(noRole.redirect);
  });

  it('waits for the session check before deciding', async () => {
    const { result, loaded } = run({ role: 'ADMIN', loaded: false }, ADMINS);
    let decided: boolean | UrlTree | undefined;
    const subscription = result.subscribe(it => (decided = it));
    TestBed.tick();
    expect(decided).toBeUndefined();
    loaded.set(true);
    TestBed.tick();
    expect(decided).toBe(true);
    subscription.unsubscribe();
  });
});

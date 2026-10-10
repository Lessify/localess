import { signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { firstValueFrom, Observable } from 'rxjs';

import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  function setup(isAuthenticated: boolean, loaded = true) {
    const loadedSignal = signal(loaded);
    const authenticated = signal(isAuthenticated);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserStore,
          useFactory: () => ({ loaded$: toObservable(loadedSignal), isAuthenticated: authenticated }),
        },
      ],
    });
    return { loadedSignal, authenticated };
  }

  const run = () =>
    TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;

  it('sends a signed-in user to the app', async () => {
    setup(true);
    const result = await firstValueFrom(run());
    expect(result instanceof UrlTree && TestBed.inject(Router).serializeUrl(result)).toBe('/features');
  });

  it('lets a signed-out user see the login page', async () => {
    setup(false);
    expect(await firstValueFrom(run())).toBe(true);
  });

  it('waits for the session check instead of trusting the stored flag', async () => {
    const { loadedSignal, authenticated } = setup(true, false);
    const result = firstValueFrom(run());
    // The stored "signed in" flag was stale: the session check answers 401.
    authenticated.set(false);
    loadedSignal.set(true);
    TestBed.tick();
    expect(await result).toBe(true);
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserPermission } from '@localess/shared';
import { UserStore } from '@core/stores/user.store';
import { firstValueFrom, Observable } from 'rxjs';

import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  function run(state: { role?: string; permissions?: string[]; loaded?: boolean }, ...required: UserPermission[]) {
    const loaded = signal(state.loaded ?? true);
    const redirect = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: { loaded, role: signal(state.role), permissions: signal(state.permissions) } },
        { provide: Router, useValue: { createUrlTree: () => redirect } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(...required)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean | UrlTree>;
    return { result, loaded, redirect };
  }

  it('lets admins through', async () => {
    expect(await firstValueFrom(run({ role: 'admin' }, UserPermission.USER_MANAGEMENT).result)).toBe(true);
  });

  it('needs one of the permissions for custom users', async () => {
    expect(
      await firstValueFrom(
        run({ role: 'custom', permissions: ['ASSET_EXPORT'] }, UserPermission.CONTENT_EXPORT, UserPermission.ASSET_EXPORT).result,
      ),
    ).toBe(true);
  });

  it('redirects users without the permission, or without a role', async () => {
    const denied = run({ role: 'custom', permissions: ['CONTENT_READ'] }, UserPermission.SCHEMA_READ);
    expect(await firstValueFrom(denied.result)).toBe(denied.redirect);
    TestBed.resetTestingModule();
    const noRole = run({ permissions: ['SCHEMA_READ'] }, UserPermission.SCHEMA_READ);
    expect(await firstValueFrom(noRole.result)).toBe(noRole.redirect);
  });

  it('waits for the session check before deciding', async () => {
    const { result, loaded } = run({ role: 'admin', loaded: false }, UserPermission.SCHEMA_READ);
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

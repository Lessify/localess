import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserStore } from '@shared/stores/user.store';

import { CanUserPerformPipe } from './can-user-perform.pipe';

describe('CanUserPerformPipe', () => {
  function createPipe(role: 'admin' | 'custom' | undefined, permissions?: string[]): CanUserPerformPipe {
    const fakeUserStore = {
      role: signal(role),
      permissions: signal(permissions),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: UserStore, useValue: fakeUserStore }],
    });
    return TestBed.runInInjectionContext(() => new CanUserPerformPipe());
  }

  function transformSync(pipe: CanUserPerformPipe, permission?: string | string[]): boolean | undefined {
    let result: boolean | undefined;
    pipe.transform(permission).subscribe(v => (result = v));
    TestBed.tick();
    return result;
  }

  it('is always true when no permission is required', () => {
    const pipe = createPipe(undefined);
    expect(transformSync(pipe, undefined)).toBe(true);
  });

  it('is false when there is no role and a permission is required', () => {
    const pipe = createPipe(undefined);
    expect(transformSync(pipe, 'contents:read')).toBe(false);
  });

  it('is true for the admin role regardless of the single permission requested', () => {
    const pipe = createPipe('admin');
    expect(transformSync(pipe, 'contents:read')).toBe(true);
  });

  it('is true for a custom role that has the exact permission', () => {
    const pipe = createPipe('custom', ['contents:read']);
    expect(transformSync(pipe, 'contents:read')).toBe(true);
  });

  it('is false for a custom role missing the permission', () => {
    const pipe = createPipe('custom', ['contents:write']);
    expect(transformSync(pipe, 'contents:read')).toBe(false);
  });

  it('is true for the admin role regardless of the permission array requested', () => {
    const pipe = createPipe('admin');
    expect(transformSync(pipe, ['contents:read', 'contents:write'])).toBe(true);
  });

  it('is true for a custom role that has at least one of the requested permissions', () => {
    const pipe = createPipe('custom', ['contents:write']);
    expect(transformSync(pipe, ['contents:read', 'contents:write'])).toBe(true);
  });

  it('is false for a custom role with none of the requested permissions', () => {
    const pipe = createPipe('custom', ['assets:read']);
    expect(transformSync(pipe, ['contents:read', 'contents:write'])).toBe(false);
  });
});

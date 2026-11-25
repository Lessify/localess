import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserStore } from '@core/stores/user.store';
import { RoleListName, UserRole } from '@localess/shared';

import { HasRolePipe } from './has-role.pipe';

describe('HasRolePipe', () => {
  function check(role: UserRole | undefined, list?: RoleListName): boolean | undefined {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: UserStore, useValue: { role: signal(role) } }] });
    const pipe = TestBed.runInInjectionContext(() => new HasRolePipe());
    let result: boolean | undefined;
    pipe.transform(list).subscribe(it => (result = it));
    TestBed.tick();
    return result;
  }

  it('is true when no list is named', () => {
    expect(check(undefined)).toBe(true);
  });

  it('is true for a role of the named list', () => {
    expect(check('EDITOR', 'CONTENT_WRITERS')).toBe(true);
    expect(check('ADMIN', 'ADMINS')).toBe(true);
  });

  it('is false for a role outside it, and without a role', () => {
    expect(check('TRANSLATOR', 'CONTENT_WRITERS')).toBe(false);
    expect(check(undefined, 'ANY_ROLE')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { USER_ROLES } from './models/user.model.js';
import { ADMINS, ANY_ROLE, CONTENT_WRITERS, DEVELOPERS, hasRole, TRANSLATORS } from './roles.js';

describe('hasRole', () => {
  it('takes one role or a list', () => {
    expect(hasRole({ role: 'EDITOR' }, 'EDITOR')).toBe(true);
    expect(hasRole({ role: 'EDITOR' }, 'ADMIN')).toBe(false);
    expect(hasRole({ role: 'EDITOR' }, CONTENT_WRITERS)).toBe(true);
    expect(hasRole({ role: 'TRANSLATOR' }, CONTENT_WRITERS)).toBe(false);
  });

  it('never lets in a user without a role, or no user', () => {
    expect(hasRole({ role: null }, ANY_ROLE)).toBe(false);
    expect(hasRole({}, ANY_ROLE)).toBe(false);
    expect(hasRole(undefined, ANY_ROLE)).toBe(false);
  });

  it('lets an admin in only where a list names it (every list does)', () => {
    for (const list of [ANY_ROLE, TRANSLATORS, CONTENT_WRITERS, DEVELOPERS, ADMINS]) expect(hasRole({ role: 'ADMIN' }, list)).toBe(true);
  });
});

describe('the role lists', () => {
  it('nest: each one is the next with one role more', () => {
    const lists = [ANY_ROLE, TRANSLATORS, CONTENT_WRITERS, DEVELOPERS, ADMINS];
    for (let i = 1; i < lists.length; i++) {
      expect(lists[i - 1].length - lists[i].length).toBe(1);
      for (const role of lists[i]) expect(lists[i - 1]).toContain(role);
    }
  });

  it('ANY_ROLE is every role', () => {
    expect([...ANY_ROLE].sort()).toEqual([...USER_ROLES].sort());
  });
});

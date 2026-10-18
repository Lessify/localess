import { UserPermission, UserRole } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { canAny } from './permissions';

const user = (role: UserRole | null | undefined, permissions?: string[]) => ({ role: () => role, permissions: () => permissions });

describe('canAny', () => {
  it('lets an admin do anything', () => {
    expect(canAny(user('ADMIN'), UserPermission.SCHEMA_READ)).toBe(true);
  });

  it('lets a custom user do what they hold, any of the permissions given', () => {
    expect(canAny(user('CUSTOM', ['CONTENT_READ']), UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ)).toBe(true);
    expect(canAny(user('CUSTOM', ['CONTENT_READ']), UserPermission.SCHEMA_READ)).toBe(false);
  });

  it('lets a user without a role do nothing, whatever permissions are left on the account', () => {
    expect(canAny(user(null, ['SCHEMA_READ']), UserPermission.SCHEMA_READ)).toBe(false);
    expect(canAny(user(undefined, ['SCHEMA_READ']), UserPermission.SCHEMA_READ)).toBe(false);
  });
});

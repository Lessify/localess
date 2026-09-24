import { describe, expect, it } from 'vitest';
import { UserPermission } from '../models';
import { canGrant } from './user-grant';

const manager = { token: { role: 'custom', permissions: [UserPermission.USER_MANAGEMENT, UserPermission.CONTENT_READ] } };

describe('canGrant', () => {
  it('lets admins grant anything', () => {
    expect(canGrant({ token: { role: 'admin' } }, 'admin', undefined)).toBe(true);
    expect(canGrant({ token: { role: 'admin' } }, 'custom', [UserPermission.SETTINGS_MANAGEMENT])).toBe(true);
  });

  it('lets a user manager grant custom with permissions they hold', () => {
    expect(canGrant(manager, 'custom', [UserPermission.CONTENT_READ])).toBe(true);
    expect(canGrant(manager, undefined, undefined)).toBe(true);
  });

  it('never lets a user manager grant admin', () => {
    expect(canGrant(manager, 'admin', undefined)).toBe(false);
  });

  it('never lets a user manager grant a permission they lack', () => {
    expect(canGrant(manager, 'custom', [UserPermission.CONTENT_READ, UserPermission.SETTINGS_MANAGEMENT])).toBe(false);
  });

  it('refuses callers without USER_MANAGEMENT or without a role', () => {
    expect(canGrant({ token: { role: 'custom', permissions: [UserPermission.CONTENT_READ] } }, 'custom', [])).toBe(false);
    expect(canGrant({ token: {} }, 'custom', [])).toBe(false);
    expect(canGrant(undefined, 'custom', [])).toBe(false);
  });

  it('refuses unknown roles', () => {
    expect(canGrant(manager, 'owner' as never, [])).toBe(false);
  });
});

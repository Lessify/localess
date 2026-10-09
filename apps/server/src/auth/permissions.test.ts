import { describe, expect, it } from 'vitest';
import { canGrant, canManageUser, canPerform, hasAnyRole, Principal, UserPermission } from './permissions.js';

const admin: Principal = { id: 'admin', role: 'admin', permissions: [] };
const manager: Principal = {
  id: 'manager',
  role: 'custom',
  permissions: [UserPermission.USER_MANAGEMENT, UserPermission.CONTENT_READ, UserPermission.CONTENT_UPDATE],
};
const reader: Principal = { id: 'reader', role: 'custom', permissions: [UserPermission.CONTENT_READ] };
const noRole: Principal = { id: 'new', role: null, permissions: [UserPermission.CONTENT_READ] };

describe('canPerform', () => {
  it('lets admins do everything', () => {
    expect(canPerform(admin, UserPermission.SETTINGS_MANAGEMENT)).toBe(true);
  });

  it('checks the permission list for custom users', () => {
    expect(canPerform(reader, UserPermission.CONTENT_READ)).toBe(true);
    expect(canPerform(reader, UserPermission.CONTENT_UPDATE)).toBe(false);
  });

  it('ignores permissions when there is no role, and denies anonymous callers', () => {
    expect(canPerform(noRole, UserPermission.CONTENT_READ)).toBe(false);
    expect(canPerform(undefined, UserPermission.CONTENT_READ)).toBe(false);
    expect(hasAnyRole(noRole)).toBe(false);
    expect(hasAnyRole(reader)).toBe(true);
  });
});

describe('canGrant', () => {
  it('lets admins grant anything, including the admin role', () => {
    expect(canGrant(admin, 'admin', [])).toBe(true);
  });

  it('lets a manager grant the custom role with permissions they hold', () => {
    expect(canGrant(manager, 'custom', [UserPermission.CONTENT_READ])).toBe(true);
    expect(canGrant(manager, undefined, undefined)).toBe(true);
    expect(canGrant(manager, null, [])).toBe(true);
  });

  it('never lets a manager grant admin or a permission they lack', () => {
    expect(canGrant(manager, 'admin', [])).toBe(false);
    expect(canGrant(manager, 'custom', [UserPermission.SETTINGS_MANAGEMENT])).toBe(false);
  });

  it('requires USER_MANAGEMENT', () => {
    expect(canGrant(reader, 'custom', [UserPermission.CONTENT_READ])).toBe(false);
  });
});

describe('canManageUser', () => {
  it('lets admins manage anyone', () => {
    expect(canManageUser(admin, manager)).toBe(true);
    expect(canManageUser(admin, admin)).toBe(true);
  });

  it('lets a manager manage users they fully outrank', () => {
    expect(canManageUser(manager, reader)).toBe(true);
    expect(canManageUser(manager, noRole)).toBe(true);
  });

  it('checks stored permissions even when the target has no role (same as the old rule)', () => {
    expect(canManageUser(manager, { id: 'x', role: null, permissions: [UserPermission.SETTINGS_MANAGEMENT] })).toBe(false);
  });

  it('never lets a manager manage themselves, an admin, or someone with more permissions', () => {
    expect(canManageUser(manager, manager)).toBe(false);
    expect(canManageUser(manager, admin)).toBe(false);
    expect(canManageUser(manager, { id: 'x', role: 'custom', permissions: [UserPermission.SETTINGS_MANAGEMENT] })).toBe(false);
  });

  it('denies users without USER_MANAGEMENT', () => {
    expect(canManageUser(reader, noRole)).toBe(false);
  });
});

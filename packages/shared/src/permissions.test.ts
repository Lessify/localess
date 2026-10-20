import { describe, expect, it } from 'vitest';

import { UserPermission } from './models/user.model.js';
import { canGrant, canManageUser, canPerform, hasAnyRole, Principal } from './permissions.js';

const admin: Principal = { id: 'admin', role: 'ADMIN', permissions: [] };
const manager: Principal = {
  id: 'manager',
  role: 'CUSTOM',
  permissions: [UserPermission.USER_MANAGEMENT, UserPermission.CONTENT_READ, UserPermission.CONTENT_UPDATE],
};
const reader: Principal = { id: 'reader', role: 'CUSTOM', permissions: [UserPermission.CONTENT_READ] };
const noRole: Principal = { id: 'new', role: null, permissions: [UserPermission.CONTENT_READ] };

describe('canPerform', () => {
  it('lets admins do everything', () => {
    expect(canPerform(admin, UserPermission.SPACE_MANAGEMENT)).toBe(true);
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
    expect(canGrant(admin, 'ADMIN', [])).toBe(true);
  });

  it('lets a manager grant the custom role with permissions they hold', () => {
    expect(canGrant(manager, 'CUSTOM', [UserPermission.CONTENT_READ])).toBe(true);
    expect(canGrant(manager, undefined, undefined)).toBe(true);
    expect(canGrant(manager, null, [])).toBe(true);
  });

  it('never lets a manager grant admin or a permission they lack', () => {
    expect(canGrant(manager, 'ADMIN', [])).toBe(false);
    expect(canGrant(manager, 'CUSTOM', [UserPermission.SPACE_MANAGEMENT])).toBe(false);
  });

  it('requires USER_MANAGEMENT', () => {
    expect(canGrant(reader, 'CUSTOM', [UserPermission.CONTENT_READ])).toBe(false);
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
    expect(canManageUser(manager, { id: 'x', role: null, permissions: [UserPermission.SPACE_MANAGEMENT] })).toBe(false);
  });

  it('never lets a manager manage themselves, an admin, or someone with more permissions', () => {
    expect(canManageUser(manager, manager)).toBe(false);
    expect(canManageUser(manager, admin)).toBe(false);
    expect(canManageUser(manager, { id: 'x', role: 'CUSTOM', permissions: [UserPermission.SPACE_MANAGEMENT] })).toBe(false);
  });

  it('denies users without USER_MANAGEMENT', () => {
    expect(canManageUser(reader, noRole)).toBe(false);
  });
});

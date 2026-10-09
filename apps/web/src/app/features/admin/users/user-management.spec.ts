import { canGrantAdmin, canGrantPermission, canManageUser, ManagedUser, UserManager } from './user-management';

const admin: UserManager = { id: 'adm', role: 'admin', permissions: undefined };
const manager: UserManager = { id: 'mgr', role: 'custom', permissions: ['USER_MANAGEMENT', 'CONTENT_READ'] };
const target = (overrides: Partial<ManagedUser>): ManagedUser => ({
  id: 'other',
  role: 'custom',
  permissions: ['CONTENT_READ'],
  ...overrides,
});

describe('user-management', () => {
  describe('canManageUser', () => {
    it('lets admins manage anyone, including themselves and other admins', () => {
      expect(canManageUser(admin, target({ id: 'adm', role: 'admin' }))).toBe(true);
      expect(canManageUser(admin, target({ role: 'admin' }))).toBe(true);
    });

    it('lets a user manager manage users they outrank', () => {
      expect(canManageUser(manager, target({}))).toBe(true);
      expect(canManageUser(manager, target({ role: undefined, permissions: undefined }))).toBe(true);
      expect(canManageUser(manager, target({ permissions: ['USER_MANAGEMENT', 'CONTENT_READ'] }))).toBe(true);
    });

    it('stops a user manager at themselves, admins and users with more permissions', () => {
      expect(canManageUser(manager, target({ id: 'mgr' }))).toBe(false);
      expect(canManageUser(manager, target({ role: 'admin' }))).toBe(false);
      expect(canManageUser(manager, target({ permissions: ['SETTINGS_MANAGEMENT'] }))).toBe(false);
    });

    it('refuses users without USER_MANAGEMENT', () => {
      expect(canManageUser({ id: 'x', role: 'custom', permissions: ['CONTENT_READ'] }, target({ permissions: [] }))).toBe(false);
      expect(canManageUser({ id: 'x', role: undefined, permissions: undefined }, target({ permissions: [] }))).toBe(false);
    });
  });

  it('canGrantAdmin() is admin-only', () => {
    expect(canGrantAdmin(admin)).toBe(true);
    expect(canGrantAdmin(manager)).toBe(false);
  });

  it('canGrantPermission() limits a user manager to what they hold', () => {
    expect(canGrantPermission(admin, 'SETTINGS_MANAGEMENT')).toBe(true);
    expect(canGrantPermission(manager, 'CONTENT_READ')).toBe(true);
    expect(canGrantPermission(manager, 'SETTINGS_MANAGEMENT')).toBe(false);
  });
});

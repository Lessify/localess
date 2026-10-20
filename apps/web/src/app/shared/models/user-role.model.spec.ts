import { UserPermission } from '@localess/shared';

import { USER_PERMISSION_GROUPS } from './user-permissions';

describe('USER_PERMISSION_GROUPS', () => {
  it('has no duplicate permission ids across groups', () => {
    const ids = USER_PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every group a label and at least one permission', () => {
    for (const group of USER_PERMISSION_GROUPS) {
      expect(group.label).toBeTruthy();
      expect(group.permissions.length).toBeGreaterThan(0);
    }
  });

  it('gives every permission an id, label, and description', () => {
    for (const group of USER_PERMISSION_GROUPS) {
      for (const permission of group.permissions) {
        expect(permission.id).toBeTruthy();
        expect(permission.label).toBeTruthy();
        expect(permission.desc).toBeTruthy();
      }
    }
  });

  // "Regenerate Metadata" (ASSET_REGEN_METADATA) was offered: it is a task kind for admins, not a permission, and the
  // server refused the whole invite or save.
  it('offers only permissions the server knows', () => {
    const known = new Set<string>(Object.values(UserPermission));
    const ids = USER_PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.id));

    expect(ids.filter(id => !known.has(id))).toEqual([]);
  });

  it('offers every permission the server knows', () => {
    const ids = new Set(USER_PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.id)));

    expect(Object.values(UserPermission).filter(permission => !ids.has(permission))).toEqual([]);
  });
});

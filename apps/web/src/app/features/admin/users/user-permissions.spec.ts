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
});

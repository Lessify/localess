import { USER_ROLES } from '@localess/shared';

import { roleDescription, roleLabel, USER_ROLE_OPTIONS } from './user-role.model';

describe('USER_ROLE_OPTIONS', () => {
  it('offers every role once, each with a label and a description', () => {
    expect(USER_ROLE_OPTIONS.map(it => it.id)).toEqual([...USER_ROLES]);
    for (const option of USER_ROLE_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.desc).toBeTruthy();
    }
  });

  it('labels a role, and no role as None', () => {
    expect(roleLabel('TRANSLATOR')).toBe('Translator');
    expect(roleLabel(null)).toBe('None');
    expect(roleLabel(undefined)).toBe('None');
  });

  it('describes a role, and no role as no access yet', () => {
    expect(roleDescription('VIEWER')).toBe(USER_ROLE_OPTIONS.find(it => it.id === 'VIEWER')!.desc);
    expect(roleDescription(null)).toContain('No access yet');
  });
});

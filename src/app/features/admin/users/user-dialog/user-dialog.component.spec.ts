import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { UserPermission } from '@shared/models/user.model';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { USER_PERMISSION_GROUPS } from '../user-permissions';
import { UserDialogContext } from './user-dialog.model';
import { UserDialogComponent } from './user-dialog.component';

describe('UserDialogComponent', () => {
  function setup(context: UserDialogContext | null) {
    const close = vi.fn();
    TestBed.overrideComponent(UserDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(UserDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('exposes every permission group', () => {
    const { component } = setup(null);

    expect(component['permissionGroups']).toBe(USER_PERMISSION_GROUPS);
  });

  it('leaves the form at its defaults when there is no data', () => {
    const { component } = setup(null);

    expect(component.form.value).toEqual({ role: null, permissions: null, lock: null });
  });

  it('patches the form from the given data, defaulting a missing role to null', () => {
    const { component } = setup({ permissions: [UserPermission.USER_MANAGEMENT], lock: true });

    expect(component.form.value).toEqual({ role: null, permissions: [UserPermission.USER_MANAGEMENT], lock: true });
  });

  it('patches the role when provided', () => {
    const { component } = setup({ role: 'admin' });

    expect(component.form.value.role).toBe('admin');
  });

  it('roleItemToString() maps known roles and falls back to the raw value', () => {
    const { component } = setup(null);

    expect(component['roleItemToString']('admin')).toBe('Admin');
    expect(component['roleItemToString']('custom')).toBe('Custom');
    expect(component['roleItemToString']('other')).toBe('other');
  });

  it('isPermissionSelected() reflects the current permissions list', () => {
    const { component } = setup({ permissions: [UserPermission.USER_MANAGEMENT] });

    expect(component.isPermissionSelected('USER_MANAGEMENT')).toBe(true);
    expect(component.isPermissionSelected('SPACE_MANAGEMENT')).toBe(false);
  });

  it('togglePermission() adds a permission when checked', () => {
    const { component } = setup(null);

    component.togglePermission('USER_MANAGEMENT', true);

    expect(component.form.value.permissions).toEqual(['USER_MANAGEMENT']);
  });

  it('togglePermission() removes a permission when unchecked', () => {
    const { component } = setup({ permissions: [UserPermission.USER_MANAGEMENT, UserPermission.SPACE_MANAGEMENT] });

    component.togglePermission('USER_MANAGEMENT', false);

    expect(component.form.value.permissions).toEqual(['SPACE_MANAGEMENT']);
  });
it('closes with the form value when saved', () => {
    const { component, close } = setup({ role: 'admin' });

    component.save();

    expect(close).toHaveBeenCalledWith({ role: 'admin', permissions: null, lock: null });
  });
});

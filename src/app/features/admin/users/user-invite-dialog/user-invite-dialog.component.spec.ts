import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { USER_PERMISSION_GROUPS } from '../user-permissions';
import { UserInviteDialogComponent } from './user-invite-dialog.component';

describe('UserInviteDialogComponent', () => {
  function setup() {
    const close = vi.fn();
    TestBed.overrideComponent(UserInviteDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close } }] });
    const fixture = TestBed.createComponent(UserInviteDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('exposes every permission group', () => {
    const { component } = setup();

    expect(component['permissionGroups']).toBe(USER_PERMISSION_GROUPS);
  });

  it('starts with an invalid, empty form', () => {
    const { component } = setup();

    expect(component.form.invalid).toBe(true);
    expect(component.form.value).toMatchObject({ email: '', password: '', displayName: '' });
  });

  it('is valid once email and password meet their requirements', () => {
    const { component } = setup();

    component.form.patchValue({ email: 'user@example.com', password: 'secret123' });

    expect(component.form.valid).toBe(true);
  });

  it('rejects an invalid email', () => {
    const { component } = setup();

    component.form.controls['email'].setValue('not-an-email');

    expect(component.form.controls['email'].valid).toBe(false);
  });

  it('rejects a password shorter than the minimum length', () => {
    const { component } = setup();

    component.form.controls['password'].setValue('12345');

    expect(component.form.controls['password'].valid).toBe(false);
  });

  it('roleItemToString() maps known roles and falls back to the raw value', () => {
    const { component } = setup();

    expect(component['roleItemToString']('admin')).toBe('Admin');
    expect(component['roleItemToString']('custom')).toBe('Custom');
    expect(component['roleItemToString']('other')).toBe('other');
  });

  it('isPermissionSelected() reflects the current permissions list', () => {
    const { component } = setup();
    component.form.controls['permissions'].setValue(['USER_MANAGEMENT']);

    expect(component.isPermissionSelected('USER_MANAGEMENT')).toBe(true);
    expect(component.isPermissionSelected('SPACE_MANAGEMENT')).toBe(false);
  });

  it('togglePermission() adds a permission when checked', () => {
    const { component } = setup();

    component.togglePermission('USER_MANAGEMENT', true);

    expect(component.form.value.permissions).toEqual(['USER_MANAGEMENT']);
  });

  it('togglePermission() removes a permission when unchecked', () => {
    const { component } = setup();
    component.form.controls['permissions'].setValue(['USER_MANAGEMENT', 'SPACE_MANAGEMENT']);

    component.togglePermission('USER_MANAGEMENT', false);

    expect(component.form.value.permissions).toEqual(['SPACE_MANAGEMENT']);
  });
it('closes with the form value when saved', () => {
    const { component, close } = setup();
    component.form.patchValue({ email: 'new@example.com', password: 'secret123' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', password: 'secret123' }));
  });
});

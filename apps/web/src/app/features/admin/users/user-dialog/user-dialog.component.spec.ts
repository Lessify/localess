import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { USER_ROLE_OPTIONS } from '@shared/models/user-role.model';
import { UserDialogComponent } from './user-dialog.component';
import { UserDialogContext } from './user-dialog.model';

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

  it('offers the five roles', () => {
    const { component } = setup(null);

    expect(component['roleOptions']).toBe(USER_ROLE_OPTIONS);
  });

  it('starts without a role when there is no data, and takes the given one', () => {
    expect(setup(null).component.form.value).toEqual({ role: null });
    TestBed.resetTestingModule();
    expect(setup({ role: 'TRANSLATOR' }).component.form.value).toEqual({ role: 'TRANSLATOR' });
  });

  it('labels the roles, and no role as None', () => {
    const { component } = setup(null);

    expect(component['roleItemToString']('DEVELOPER')).toBe('Developer');
    expect(component['roleItemToString'](null)).toBe('None');
  });

  it('describes the chosen role, and what no role means', () => {
    const { component } = setup({ role: 'EDITOR' });

    expect(component['roleDescription']()).toBe(USER_ROLE_OPTIONS.find(it => it.id === 'EDITOR')!.desc);
    component.form.controls['role'].setValue(null);
    expect(component['roleDescription']()).toContain('No access yet');
  });

  it('closes with the role when saved', () => {
    const { component, close } = setup({ role: 'ADMIN' });

    component.save();

    expect(close).toHaveBeenCalledWith({ role: 'ADMIN' });
  });
});

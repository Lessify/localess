import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UserStore } from '@shared/stores/user.store';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { MeEmailDialogComponent } from './me-email-dialog.component';

describe('MeEmailDialogComponent', () => {
  function setup(isPasswordProvider = false) {
    const close = vi.fn();
    TestBed.overrideComponent(MeEmailDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: BrnDialogRef, useValue: { close } },
        { provide: UserStore, useValue: { isPasswordProvider: signal(isPasswordProvider) } },
      ],
    });
    const fixture = TestBed.createComponent(MeEmailDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('starts with an empty, invalid newEmail control', () => {
    const { component } = setup();

    expect(component.form.value).toEqual({ newEmail: '' });
    expect(component.form.valid).toBe(false);
  });

  it('is invalid when the email is shorter than the minimum length', () => {
    const { component } = setup();

    component.form.controls['newEmail'].setValue('a@');

    expect(component.form.valid).toBe(false);
  });

  it('is valid once a long enough email is entered', () => {
    const { component } = setup();

    component.form.controls['newEmail'].setValue('a@b.com');

    expect(component.form.valid).toBe(true);
  });

  it('closes with the form value when saved', () => {
    const { component, close } = setup();

    component.form.controls['newEmail'].setValue('a@b.com');
    component.save();

    expect(close).toHaveBeenCalledWith({ newEmail: 'a@b.com' });
  });

  it('asks for the current password when the account has one', () => {
    const { component, close } = setup(true);

    component.form.controls['newEmail'].setValue('a@b.com');
    expect(component.form.valid).toBe(false);

    component.form.controls['currentPassword'].setValue('old-secret');
    component.save();

    expect(close).toHaveBeenCalledWith({ currentPassword: 'old-secret', newEmail: 'a@b.com' });
  });
});

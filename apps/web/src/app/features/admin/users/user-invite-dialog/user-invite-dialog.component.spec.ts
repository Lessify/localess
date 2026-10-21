import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

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

  it('starts with an invalid, empty form without a role', () => {
    const { component } = setup();

    expect(component.form.invalid).toBe(true);
    expect(component.form.value).toEqual({ email: '', password: '', displayName: '', role: '' });
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

  it('closes with the form value, the role included, when saved', () => {
    const { component, close } = setup();
    component.form.patchValue({ email: 'new@example.com', password: 'secret123', role: 'EDITOR' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', password: 'secret123', role: 'EDITOR' }));
  });

  it('answers None as null', () => {
    const { component, close } = setup();
    component.form.patchValue({ email: 'new@example.com', password: 'secret123' });

    component.save();

    expect(close).toHaveBeenCalledWith(expect.objectContaining({ role: null }));
  });
});

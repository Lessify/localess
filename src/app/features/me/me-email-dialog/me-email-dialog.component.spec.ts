import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { MeEmailDialogComponent } from './me-email-dialog.component';

describe('MeEmailDialogComponent', () => {
  function setup() {
    const close = vi.fn();
    TestBed.overrideComponent(MeEmailDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close } }] });
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
});

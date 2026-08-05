import { TestBed } from '@angular/core/testing';

import { MePasswordDialogComponent } from './me-password-dialog.component';

describe('MePasswordDialogComponent', () => {
  function setup() {
    TestBed.overrideComponent(MePasswordDialogComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(MePasswordDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('starts with an empty, invalid newPassword control', () => {
    const { component } = setup();

    expect(component.form.value).toEqual({ newPassword: '' });
    expect(component.form.valid).toBe(false);
  });

  it('is invalid when the password is shorter than the minimum length', () => {
    const { component } = setup();

    component.form.controls['newPassword'].setValue('12345');

    expect(component.form.valid).toBe(false);
  });

  it('is valid once a long enough password is entered', () => {
    const { component } = setup();

    component.form.controls['newPassword'].setValue('123456');

    expect(component.form.valid).toBe(true);
  });
});

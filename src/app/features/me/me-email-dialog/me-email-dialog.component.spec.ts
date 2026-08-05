import { TestBed } from '@angular/core/testing';

import { MeEmailDialogComponent } from './me-email-dialog.component';

describe('MeEmailDialogComponent', () => {
  function setup() {
    TestBed.overrideComponent(MeEmailDialogComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(MeEmailDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
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
});

import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

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

  it('starts without a role (None) when there is no data, and takes the given one', () => {
    expect(setup(null).component.form.value).toEqual({ role: '' });
    TestBed.resetTestingModule();
    expect(setup({ role: 'TRANSLATOR' }).component.form.value).toEqual({ role: 'TRANSLATOR' });
  });

  it('closes with the role when saved, None as null', () => {
    const { component, close } = setup({ role: 'ADMIN' });

    component.save();
    expect(close).toHaveBeenLastCalledWith({ role: 'ADMIN' });

    component.form.controls['role'].setValue('');
    component.save();
    expect(close).toHaveBeenLastCalledWith({ role: null });
  });
});

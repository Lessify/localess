import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { MeDialogContext } from './me-dialog.model';
import { MeDialogComponent } from './me-dialog.component';

describe('MeDialogComponent', () => {
  /** On Spartan the context arrives through CDK's `DIALOG_DATA` and the result goes back via `close()`. */
  function setup(context: MeDialogContext | null) {
    const close = vi.fn();
    TestBed.overrideComponent(MeDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(MeDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('patches the form with the given context on init', () => {
    const { component } = setup({ displayName: 'Alex', photoURL: 'https://example.com/a.png' });

    expect(component.form.value).toEqual({ displayName: 'Alex', photoURL: 'https://example.com/a.png' });
  });

  it('leaves the form at its defaults when no context is given', () => {
    const { component } = setup(null);

    expect(component.form.value).toEqual({ displayName: null, photoURL: null });
  });

  it('closes with the form value when saved', () => {
    const { component, close } = setup({ displayName: 'Alex' });

    component.form.patchValue({ photoURL: 'https://example.com/b.png' });
    component.save();

    expect(close).toHaveBeenCalledWith({ displayName: 'Alex', photoURL: 'https://example.com/b.png' });
  });
});

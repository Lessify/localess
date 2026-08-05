import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MeDialogModel } from './me-dialog.model';
import { MeDialogComponent } from './me-dialog.component';

describe('MeDialogComponent', () => {
  function setup(data: MeDialogModel | null) {
    TestBed.overrideComponent(MeDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(MeDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('patches the form with the given data on init', () => {
    const { component } = setup({ displayName: 'Alex', photoURL: 'https://example.com/a.png' });

    expect(component.form.value).toEqual({ displayName: 'Alex', photoURL: 'https://example.com/a.png' });
  });

  it('leaves the form at its defaults when no data is given', () => {
    const { component } = setup(null);

    expect(component.form.value).toEqual({ displayName: null, photoURL: null });
  });
});

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { SpaceDialogModel } from './space-dialog.model';
import { SpaceDialogComponent } from './space-dialog.component';

describe('SpaceDialogComponent', () => {
  function setup(data: SpaceDialogModel | null) {
    TestBed.overrideComponent(SpaceDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(SpaceDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('starts with an empty, invalid name control when there is no data', () => {
    const { component } = setup(null);

    expect(component.form.value).toEqual({ name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('patches the form with the given name', () => {
    const { component } = setup({ name: 'My Space' });

    expect(component.form.value).toEqual({ name: 'My Space' });
    expect(component.form.valid).toBe(true);
  });
});

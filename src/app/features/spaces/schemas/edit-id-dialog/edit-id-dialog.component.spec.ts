import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EditIdDialogModel } from './edit-id-dialog.model';
import { EditIdDialogComponent } from './edit-id-dialog.component';

describe('EditIdDialogComponent', () => {
  function setup(data: EditIdDialogModel) {
    TestBed.overrideComponent(EditIdDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(EditIdDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('patches the form with the current id', () => {
    const { component } = setup({ id: 'MySchema', reservedIds: ['Other'] });

    expect(component.form.value).toEqual({ id: 'MySchema' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects an id that collides with a reserved id', () => {
    const { component } = setup({ id: 'MySchema', reservedIds: ['Other'] });

    component.form.controls['id'].setValue('Other');

    expect(component.form.controls['id'].errors).toEqual({ reservedName: true });
  });
});

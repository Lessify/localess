import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { AddFolderDialogModel } from './add-folder-dialog.model';
import { AddFolderDialogComponent } from './add-folder-dialog.component';

describe('AddFolderDialogComponent', () => {
  function setup(data: AddFolderDialogModel) {
    TestBed.overrideComponent(AddFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(AddFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('starts with an empty, invalid name control', () => {
    const { component } = setup({ reservedNames: [] });

    expect(component.form.value).toEqual({ name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('rejects a name that collides with a reserved (case-insensitive) name', () => {
    const { component } = setup({ reservedNames: ['Images'] });

    component.form.controls['name'].setValue('images');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
  });

  it('accepts a name that is not reserved', () => {
    const { component } = setup({ reservedNames: ['Images'] });

    component.form.controls['name'].setValue('Videos');

    expect(component.form.valid).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssetFolder } from '@shared/models/asset.model';

import { EditFolderDialogModel } from './edit-folder-dialog.model';
import { EditFolderDialogComponent } from './edit-folder-dialog.component';

describe('EditFolderDialogComponent', () => {
  function setup(data: EditFolderDialogModel) {
    TestBed.overrideComponent(EditFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(EditFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('patches the form with the folder name on init', () => {
    const asset = { name: 'Images' } as AssetFolder;
    const { component } = setup({ asset, reservedNames: ['Videos'] });

    expect(component.form.value).toEqual({ name: 'Images' });
    expect(component.form.valid).toBe(true);
  });

  it('rejects renaming to a reserved name', () => {
    const asset = { name: 'Images' } as AssetFolder;
    const { component } = setup({ asset, reservedNames: ['Images', 'Videos'] });

    component.form.controls['name'].setValue('Videos');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
  });
});

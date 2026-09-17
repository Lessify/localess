import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { AssetFolder } from '@shared/models/asset.model';

import { EditFolderDialogContext } from './edit-folder-dialog.model';
import { EditFolderDialogComponent } from './edit-folder-dialog.component';

describe('EditFolderDialogComponent', () => {
  function setup(context: EditFolderDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(EditFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(EditFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
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

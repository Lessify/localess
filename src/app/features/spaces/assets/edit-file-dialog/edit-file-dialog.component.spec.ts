import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AssetFile } from '@shared/models/asset.model';

import { EditFileDialogModel } from './edit-file-dialog.model';
import { EditFileDialogComponent } from './edit-file-dialog.component';

describe('EditFileDialogComponent', () => {
  function setup(data: EditFileDialogModel) {
    TestBed.overrideComponent(EditFileDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(EditFileDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('detects image files from their mime type', () => {
    const asset = { name: 'photo', type: 'image/png' } as AssetFile;
    const { component } = setup({ asset, reservedNames: [] });

    expect(component.isImage).toBe(true);
  });

  it('does not treat non-image files as images', () => {
    const asset = { name: 'doc', type: 'application/pdf' } as AssetFile;
    const { component } = setup({ asset, reservedNames: [] });

    expect(component.isImage).toBe(false);
  });

  it('patches the form with the asset name/alt on init', () => {
    const asset = { name: 'photo', type: 'image/png', alt: 'A photo' } as AssetFile;
    const { component } = setup({ asset, reservedNames: ['photo', 'other'] });

    expect(component.form.value).toEqual({ name: 'photo', alt: 'A photo' });
  });

  it('allows keeping the current name even though it appears in reservedNames', () => {
    const asset = { name: 'photo', type: 'image/png' } as AssetFile;
    const { component } = setup({ asset, reservedNames: ['photo', 'other'] });

    expect(component.form.controls['name'].errors).toBeNull();
  });

  it('rejects renaming to a different reserved name', () => {
    const asset = { name: 'photo', type: 'image/png' } as AssetFile;
    const { component } = setup({ asset, reservedNames: ['photo', 'other'] });

    component.form.controls['name'].setValue('other');

    expect(component.form.controls['name'].errors).toEqual({ reservedName: true });
  });
});

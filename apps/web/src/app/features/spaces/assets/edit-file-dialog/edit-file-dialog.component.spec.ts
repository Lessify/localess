import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { AssetFile } from '@localess/shared';

import { EditFileDialogContext } from './edit-file-dialog.model';
import { EditFileDialogComponent } from './edit-file-dialog.component';

describe('EditFileDialogComponent', () => {
  function setup(context: EditFileDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(EditFileDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(EditFileDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('detects image files from their mime type', () => {
    const asset = { name: 'photo', type: 'image/png' } as AssetFile;
    const { component } = setup({ asset });

    expect(component.isImage).toBe(true);
  });

  it('does not treat non-image files as images', () => {
    const asset = { name: 'doc', type: 'application/pdf' } as AssetFile;
    const { component } = setup({ asset });

    expect(component.isImage).toBe(false);
  });

  it('patches the form with the asset name/alt on init', () => {
    const asset = { name: 'photo', type: 'image/png', alt: 'A photo' } as AssetFile;
    const { component } = setup({ asset });

    expect(component.form.value).toEqual({ name: 'photo', alt: 'A photo' });
  });

  it('accepts a name another asset of the folder has (duplicates are allowed)', () => {
    const asset = { name: 'photo', type: 'image/png' } as AssetFile;
    const { component } = setup({ asset });

    component.form.controls['name'].setValue('other');

    expect(component.form.controls['name'].errors).toBeNull();
  });
});

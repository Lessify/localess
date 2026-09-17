import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

import { AddFolderDialogContext } from './add-folder-dialog.model';
import { AddFolderDialogComponent } from './add-folder-dialog.component';

describe('AddFolderDialogComponent', () => {
  function setup(context: AddFolderDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(AddFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(AddFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
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

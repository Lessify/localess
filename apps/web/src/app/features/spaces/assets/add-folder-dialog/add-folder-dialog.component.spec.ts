import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

import { AddFolderDialogComponent } from './add-folder-dialog.component';

describe('AddFolderDialogComponent', () => {
  function setup() {
    const close = vi.fn();
    TestBed.overrideComponent(AddFolderDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [{ provide: BrnDialogRef, useValue: { close } }],
    });
    const fixture = TestBed.createComponent(AddFolderDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('starts with an empty, invalid name control', () => {
    const { component } = setup();

    expect(component.form.value).toEqual({ name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('accepts a name another asset of the folder has (duplicates are allowed)', () => {
    const { component } = setup();

    component.form.controls['name'].setValue('Images');

    expect(component.form.valid).toBe(true);
  });
});

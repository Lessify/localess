import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { vi } from 'vitest';

import { ImportDialogComponent } from './import-dialog.component';

describe('ImportDialogComponent', () => {
  function setup() {
    const close = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: BrnDialogRef, useValue: { close } }] });
    TestBed.overrideComponent(ImportDialogComponent, { set: { template: '<div></div>' } });
    const fixture = TestBed.createComponent(ImportDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  function fileChangeEvent(file: File): Event {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    return { target: input } as unknown as Event;
  }

  it('starts with an empty, invalid file control', () => {
    const { component } = setup();

    expect(component.form.invalid).toBe(true);
    expect(component.fileName).toBe('');
    expect(component.fileWrong).toBe(false);
  });

  it('accepts a .lls.zip file', async () => {
    const { component } = setup();
    const file = new File(['data'], 'schemas.lls.zip');

    await component.onFileChange(fileChangeEvent(file));

    expect(component.fileName).toBe('schemas.lls.zip');
    expect(component.fileWrong).toBe(false);
    expect(component.form.value.file).toBe(file);
    expect(component.form.valid).toBe(true);
  });

  it('flags a file without the .lls.zip extension', async () => {
    const { component } = setup();
    const file = new File(['data'], 'schemas.zip');

    await component.onFileChange(fileChangeEvent(file));

    expect(component.fileWrong).toBe(true);
  });

  it('does nothing when the change event has no target files', async () => {
    const { component } = setup();

    await component.onFileChange({ target: null } as unknown as Event);

    expect(component.fileName).toBe('');
    expect(component.form.value.file).toBeNull();
  });
  it('closes with the picked file when importing', () => {
    const { component, close } = setup();
    const file = new File([''], 'schemas.lls.zip');
    component.form.patchValue({ file });

    component.save();

    expect(close).toHaveBeenCalledWith({ file });
  });
});

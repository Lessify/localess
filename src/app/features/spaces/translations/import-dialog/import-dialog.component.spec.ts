import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Locale } from '@shared/models/locale.model';

import { ImportDialogContext } from './import-dialog.model';
import { ImportDialogComponent } from './import-dialog.component';

describe('ImportDialogComponent', () => {
  const locales: Locale[] = [
    { id: 'en', name: 'English' },
    { id: 'de', name: 'German' },
  ];

  function setup(context: ImportDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(ImportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
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

  it('starts with a FULL import and .llt.zip accept filter', () => {
    const { component } = setup({ locales });

    expect(component.form.value.kind).toBe('FULL');
    expect(component.fileAccept).toBe('.llt.zip');
  });

  it('switches the accept filter and resets the file state when the kind changes to FLAT', () => {
    const { component } = setup({ locales });
    component.fileName = 'export.llt.zip';

    component.form.controls['kind'].setValue('FLAT');

    expect(component.fileAccept).toBe('.json');
    expect(component.fileName).toBe('');
    expect(component.fileWrong).toBe(false);
  });

  it('switches back to .llt.zip when the kind returns to FULL', () => {
    const { component } = setup({ locales });
    component.form.controls['kind'].setValue('FLAT');

    component.form.controls['kind'].setValue('FULL');

    expect(component.fileAccept).toBe('.llt.zip');
  });

  it('accepts a file matching the current accept filter', async () => {
    const { component } = setup({ locales });
    const file = new File(['data'], 'export.llt.zip');

    await component.onFileChange(fileChangeEvent(file));

    expect(component.fileName).toBe('export.llt.zip');
    expect(component.fileWrong).toBe(false);
    expect(component.form.value.file).toBe(file);
  });

  it('flags a file that does not match the current accept filter', async () => {
    const { component } = setup({ locales });
    const file = new File(['data'], 'export.zip');

    await component.onFileChange(fileChangeEvent(file));

    expect(component.fileWrong).toBe(true);
  });

  it('kindItemToString() shows the friendly kind label, or falls back to the raw value', () => {
    const { component } = setup({ locales });

    expect(component['kindItemToString']('FLAT')).toBe('FLAT JSON');
    expect(component['kindItemToString']('unknown')).toBe('unknown');
  });

  it('localeItemToString() shows the locale name, or falls back to the raw value', () => {
    const { component } = setup({ locales });

    expect(component['localeItemToString']('de')).toBe('German');
    expect(component['localeItemToString']('fr')).toBe('fr');
  });
});

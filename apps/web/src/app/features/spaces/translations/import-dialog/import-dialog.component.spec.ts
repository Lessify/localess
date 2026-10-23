import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Locale } from '@localess/shared';

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

  it('asks for the file only, and accepts a Localess file, an old one or a key-value JSON', () => {
    const { component } = setup({ locales });

    expect(component.fileAccept).toBe('.localess.zip,.llt.zip,.json');
    expect(component.isJson()).toBe(false);
    expect(component.form.valid).toBe(false);
  });

  it('a Localess file needs no locale', async () => {
    const { component, close } = setup({ locales });

    await component.onFileChange(fileChangeEvent(new File(['PK'], 'site-translations.localess.zip')));

    expect(component.isJson()).toBe(false);
    expect(component.fileWrong).toBe(false);
    expect(component.form.valid).toBe(true);
    component.save();
    expect(close).toHaveBeenCalledWith({ file: expect.any(File) });
  });

  it('a key-value JSON asks for its locale, preselected from the file name', async () => {
    const { component, close } = setup({ locales });

    await component.onFileChange(fileChangeEvent(new File(['{}'], 'de.json')));

    expect(component.isJson()).toBe(true);
    expect(component.form.value.locale).toBe('de');
    component.save();
    expect(close).toHaveBeenCalledWith({ file: expect.any(File), locale: 'de' });
  });

  it('a key-value JSON whose name is no locale of the space needs one chosen', async () => {
    const { component } = setup({ locales });

    await component.onFileChange(fileChangeEvent(new File(['{}'], 'messages.json')));

    expect(component.form.value.locale).toBeNull();
    expect(component.form.valid).toBe(false);
  });

  it('flags a file of another type', async () => {
    const { component } = setup({ locales });

    await component.onFileChange(fileChangeEvent(new File(['x'], 'notes.txt')));

    expect(component.fileWrong).toBe(true);
    expect(component.form.valid).toBe(false);
  });

  it('localeItemToString() shows the locale name, or falls back to the raw value', () => {
    const { component } = setup({ locales });

    expect(component['localeItemToString']('de')).toBe('German');
    expect(component['localeItemToString']('fr')).toBe('fr');
  });
});

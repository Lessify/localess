import { TestBed } from '@angular/core/testing';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { vi } from 'vitest';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { Locale } from '@localess/shared';

import { ExportDialogContext } from './export-dialog.model';
import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  const locales: Locale[] = [
    { id: 'en', name: 'English' },
    { id: 'de', name: 'German' },
  ];

  function setup(context: ExportDialogContext) {
    const close = vi.fn();
    TestBed.overrideComponent(ExportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('defaults to the full Localess file, with no locale selected', () => {
    const { component } = setup({ locales });

    expect(component.form.value).toEqual({ kind: 'FULL', locale: null });
    expect(component.form.valid).toBe(true);
  });

  it('offers the full Localess file and one locale as key-value JSON', () => {
    const { component } = setup({ locales });

    expect(component.exportKinds).toEqual([
      { key: 'FULL', value: 'All translations (Localess file)' },
      { key: 'LOCALE', value: 'One locale (key-value JSON)' },
    ]);
  });

  it('one locale needs the locale chosen', () => {
    const { component, close } = setup({ locales });

    component.form.patchValue({ kind: 'LOCALE' });
    expect(component.form.valid).toBe(false);
    component.form.patchValue({ locale: 'de' });
    expect(component.form.valid).toBe(true);
    component.save();
    expect(close).toHaveBeenCalledWith({ kind: 'LOCALE', locale: 'de' });
  });

  it('kindItemToString() shows the friendly kind label, or falls back to the raw value', () => {
    const { component } = setup({ locales });

    expect(component['kindItemToString']('LOCALE')).toBe('One locale (key-value JSON)');
    expect(component['kindItemToString']('unknown')).toBe('unknown');
  });

  it('localeItemToString() shows the locale name, or falls back to the raw value', () => {
    const { component } = setup({ locales });

    expect(component['localeItemToString']('de')).toBe('German');
    expect(component['localeItemToString']('fr')).toBe('fr');
  });

  it('names each select by its label: the label points at the select button', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: { locales } },
        { provide: BrnDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.componentInstance.form.patchValue({ kind: 'LOCALE' });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const labels = Array.from(element.querySelectorAll('label'));
    expect(labels.map(it => it.textContent?.trim())).toEqual(['Type', 'Locale']);
    for (const label of labels) {
      expect(element.querySelector(`#${label.htmlFor}`)?.tagName).toBe('BUTTON');
    }
  });
});

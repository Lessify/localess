import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';

import { ExportDialogModel } from './export-dialog.model';
import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  const locales: Locale[] = [
    { id: 'en', name: 'English' },
    { id: 'de', name: 'German' },
  ];

  function setup(data: ExportDialogModel) {
    TestBed.overrideComponent(ExportDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('defaults to a FULL export with no locale selected', () => {
    const { component } = setup({ locales });

    expect(component.form.value).toEqual({ kind: 'FULL', locale: null });
  });

  it('lists FULL and FLAT export kinds', () => {
    const { component } = setup({ locales });

    expect(component.exportKinds).toEqual([
      { key: 'FULL', value: 'FULL' },
      { key: 'FLAT', value: 'FLAT JSON' },
    ]);
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

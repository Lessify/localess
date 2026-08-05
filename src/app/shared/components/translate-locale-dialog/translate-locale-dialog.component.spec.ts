import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';

import { TranslateLocaleDialogModel } from './translate-locale-dialog.model';
import { TranslateLocaleDialogComponent } from './translate-locale-dialog.component';

describe('TranslateLocaleDialogComponent', () => {
  const en: Locale = { id: 'en', name: 'English' };
  const de: Locale = { id: 'de', name: 'German' };

  function setup(data: TranslateLocaleDialogModel) {
    TestBed.overrideComponent(TranslateLocaleDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }] });
    const fixture = TestBed.createComponent(TranslateLocaleDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('defaults both source and target to the first locale', () => {
    const { component } = setup({ locales: [en, de] });

    expect(component.form.value).toEqual({ sourceLocale: 'en', targetLocale: 'en' });
    expect(component.form.valid).toBe(true);
  });

  it('localeItemToString() shows the locale name, or falls back to the raw value', () => {
    const { component } = setup({ locales: [en, de] });

    expect(component['localeItemToString']('de')).toBe('German');
    expect(component['localeItemToString']('fr')).toBe('fr');
  });
});

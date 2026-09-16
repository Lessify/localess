import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';

import { TranslateLocaleDialogModel } from './translate-locale-dialog.model';
import { TranslateLocaleDialogComponent } from './translate-locale-dialog.component';

describe('TranslateLocaleDialogComponent', () => {
  const en: Locale = { id: 'en', name: 'English' };
  const de: Locale = { id: 'de', name: 'German' };

  function setup(data: TranslateLocaleDialogModel) {
    TestBed.overrideComponent(TranslateLocaleDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DIALOG_DATA, useValue: data }, { provide: Firestore, useValue: {} }] });
    const fixture = TestBed.createComponent(TranslateLocaleDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('defaults both source and target to the first locale', () => {
    const { component } = setup({ locales: [en, de] });

    expect(component.form.value).toEqual({ sourceLocale: 'en', targetLocale: 'en', overwrite: false });
    expect(component.form.valid).toBe(true);
  });

  // Off by default: filling only empty translations is safe to run twice, overwriting is not.
  it('defaults overwrite to off and carries the author’s choice out of the dialog', () => {
    const { component } = setup({ locales: [en, de] });
    expect(component.form.value.overwrite).toBe(false);

    component.form.controls['overwrite'].setValue(true);

    expect(component.form.value.overwrite).toBe(true);
  });

  it('localeItemToString() shows the locale name, or falls back to the raw value', () => {
    const { component } = setup({ locales: [en, de] });

    expect(component['localeItemToString']('de')).toBe('German');
    expect(component['localeItemToString']('fr')).toBe('fr');
  });
  /**
   * The provider takes a limited set of languages while a space can hold any locale, so an
   * unsupported one is disabled in the select rather than offered and rejected server-side.
   * Source and target are asked separately - Google models the two directions separately.
   */
  describe('provider support', () => {
    const unsupported: Locale = { id: 'xx-XX', name: 'Nowhere' };

    it('reports support per direction', () => {
      const { component } = setup({ locales: [en, unsupported] });

      expect(component.canTranslateFrom(en)).toBe(true);
      expect(component.canTranslateTo(en)).toBe(true);
      expect(component.canTranslateFrom(unsupported)).toBe(false);
      expect(component.canTranslateTo(unsupported)).toBe(false);
    });

    // Opening on a locale that can only fail would offer a translation the provider rejects.
    it('starts on the first supported locale rather than the first one', () => {
      const { component } = setup({ locales: [unsupported, de] });

      expect(component.form.value).toMatchObject({ sourceLocale: 'de', targetLocale: 'de' });
    });

    it('leaves the control empty and blocks the submit when no locale is supported', () => {
      const { component } = setup({ locales: [unsupported] });

      expect(component.form.value.sourceLocale).toBeNull();
      expect(component.isSelectionTranslatable()).toBe(false);
    });

    /**
     * The content side labels the space fallback with the `default` sentinel, which is a storage
     * key rather than a language - without the fallback there is nothing to send the provider.
     */
    it('resolves the default sentinel through the fallback locale', () => {
      const { component } = setup({ locales: [CONTENT_DEFAULT_LOCALE, de], localeFallback: en });

      expect(component.canTranslateFrom(CONTENT_DEFAULT_LOCALE)).toBe(true);
      expect(component.canTranslateTo(CONTENT_DEFAULT_LOCALE)).toBe(true);
    });

    // Nothing to resolve the sentinel with means nothing to send the provider.
    it('treats the sentinel as unsupported without a fallback locale', () => {
      const { component } = setup({ locales: [CONTENT_DEFAULT_LOCALE, de] });

      expect(component.canTranslateFrom(CONTENT_DEFAULT_LOCALE)).toBe(false);
      expect(component.form.value.sourceLocale).toBe('de');
    });

    it('blocks the submit while either end is unsupported', () => {
      const { component } = setup({ locales: [en, de, unsupported] });
      component.form.patchValue({ sourceLocale: 'en', targetLocale: 'de' });
      expect(component.isSelectionTranslatable()).toBe(true);

      component.form.patchValue({ targetLocale: 'xx-XX' });

      expect(component.isSelectionTranslatable()).toBe(false);
    });
  });
});

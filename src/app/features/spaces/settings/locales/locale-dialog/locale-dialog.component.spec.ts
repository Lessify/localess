import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LocaleDialogComponent } from './locale-dialog.component';
import { LocaleDialogContext } from './locale-dialog.model';

describe('LocaleDialogComponent', () => {
  const en: Locale = { id: 'en', name: 'English' };
  const de: Locale = { id: 'de', name: 'German' };
  const fr: Locale = { id: 'fr', name: 'French' };

  /**
   * This dialog runs on Spartan rather than Material, so the context arrives through CDK's
   * `DIALOG_DATA` and the result goes back through `BrnDialogRef.close()`.
   */
  function setup(context: LocaleDialogContext | null, allLocales: Locale[] = [en, de, fr]) {
    const findAllLocales = vi.fn().mockReturnValue(of(allLocales));
    const close = vi.fn();
    TestBed.overrideComponent(LocaleDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: context },
        { provide: BrnDialogRef, useValue: { close } },
        { provide: LocaleService, useValue: { findAllLocales } },
      ],
    });
    const fixture = TestBed.createComponent(LocaleDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, close };
  }

  it('excludes already-added locales from the options', () => {
    const { component } = setup({ locales: [en] });

    expect(component.locales).toEqual([de, fr]);
  });

  it('offers every locale when no context is given', () => {
    const { component } = setup(null);

    expect(component.locales).toEqual([en, de, fr]);
  });

  it('offers every locale when the context carries no locales', () => {
    const { component } = setup({});

    expect(component.locales).toEqual([en, de, fr]);
  });

  it('filteredOptions() returns everything when the search is blank', () => {
    const { component } = setup(null);

    expect(component.filteredOptions()).toEqual([en, de, fr]);
  });

  it('filteredOptions() filters by a case-insensitive, trimmed name match', () => {
    const { component } = setup(null);

    component.search.set(' ger ');

    expect(component.filteredOptions()).toEqual([de]);
  });

  it('displayLocale() formats the name and id, or an empty string when absent', () => {
    const { component } = setup(null);

    expect(component.displayLocale(de)).toBe('German (de)');
    expect(component.displayLocale(undefined)).toBe('');
  });

  /**
   * Only the confirming button is component code. Cancel carries `hlmDialogClose`, a directive that
   * closes the ref with no result - the caller's `filter(it => it !== undefined)` then skips the
   * create - so there is nothing here to unit test for it.
   */
  it('save() returns the picked locale', () => {
    const { component, close } = setup(null);
    component.form.controls['locale'].setValue(de);

    component.save();

    expect(close).toHaveBeenCalledWith({ locale: de });
  });
});

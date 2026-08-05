import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LocaleDialogComponent } from './locale-dialog.component';

describe('LocaleDialogComponent', () => {
  const en: Locale = { id: 'en', name: 'English' };
  const de: Locale = { id: 'de', name: 'German' };
  const fr: Locale = { id: 'fr', name: 'French' };

  function setup(data: Locale[] | null, allLocales: Locale[] = [en, de, fr]) {
    const findAllLocales = vi.fn().mockReturnValue(of(allLocales));
    TestBed.overrideComponent(LocaleDialogComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: LocaleService, useValue: { findAllLocales } },
      ],
    });
    const fixture = TestBed.createComponent(LocaleDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('excludes already-added locales from the options', () => {
    const { component } = setup([en]);

    expect(component.locales).toEqual([de, fr]);
  });

  it('offers every locale when no data is given', () => {
    const { component } = setup(null);

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
});

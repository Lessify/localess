import { TestBed } from '@angular/core/testing';
import { Locale } from '@localess/shared';
import { TranslationStatus } from '../../models/translation-status.model';
import { vi } from 'vitest';

import { TranslationFilterComponent } from './translation-filter.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

describe('TranslationFilterComponent', () => {
  function setup(availableLocales: Locale[] = [en, de]) {
    TestBed.overrideComponent(TranslationFilterComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(TranslationFilterComponent);
    fixture.componentRef.setInput('availableLocales', availableLocales);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('defaults the filter locale to the given fallback id', () => {
    const { component, fixture } = setup();

    fixture.componentRef.setInput('defaultLocaleId', 'de');
    fixture.detectChanges();

    expect(component.filterForm.value.locale).toBe('de');
  });

  it('emits localeChange immediately when the locale control changes', () => {
    const { component } = setup();
    const spy = vi.fn();
    component.localeChange.subscribe(spy);

    component.filterForm.controls.locale.setValue('de');

    expect(spy).toHaveBeenCalledWith('de');
  });

  it('emits labels and statuses at once, the search only on Enter', () => {
    const { component } = setup();
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.filterForm.patchValue({ locale: 'en', labels: ['ui'], states: [TranslationStatus.TRANSLATED] });
    expect(spy).toHaveBeenLastCalledWith({ locale: 'en', search: '', labels: ['ui'], states: [TranslationStatus.TRANSLATED] });

    spy.mockClear();
    component.filterForm.patchValue({ search: 'home' });
    expect(spy).not.toHaveBeenCalled();

    component.applySearch();
    expect(spy).toHaveBeenCalledWith({ locale: 'en', search: 'home', labels: ['ui'], states: [TranslationStatus.TRANSLATED] });
  });

  it('keeps the applied search while typing and clears it when the box is emptied', () => {
    const { component } = setup();
    const spy = vi.fn();
    component.filterChange.subscribe(spy);
    component.filterForm.patchValue({ locale: 'en', search: 'home' });
    component.applySearch();

    component.filterForm.patchValue({ search: 'hom' });
    component.selectLabel('ui');
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'home', labels: ['ui'] }));

    component.filterForm.patchValue({ search: '' });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }));
  });

  it('searchPending() tells typed text from the search applied: empty, typed, searched', () => {
    const { component } = setup();
    expect(component.searchPending()).toBe(false);

    component.filterForm.patchValue({ search: 'home' });
    expect(component.searchPending()).toBe(true);

    component.applySearch();
    expect(component.searchPending()).toBe(false);

    component.filterForm.patchValue({ search: '' });
    expect(component.searchPending()).toBe(false);
  });

  it('filterReset() clears search/labels/states', () => {
    const { component } = setup();
    component.filterForm.patchValue({ search: 'x', labels: ['a'], states: [TranslationStatus.TRANSLATED] });

    component.filterReset();

    expect(component.filterForm.value).toMatchObject({ search: '', labels: [], states: [] });
  });

  it('isFormChanged() is false at defaults and true once search/labels/states are set', () => {
    const { component } = setup();
    expect(component.isFormChanged()).toBe(false);

    component.filterForm.patchValue({ search: 'x' });
    expect(component.isFormChanged()).toBe(true);
  });

  it('selectLabel() toggles a label on and off', () => {
    const { component } = setup();

    component.selectLabel('ui');
    expect(component.filterForm.value.labels).toEqual(['ui']);

    component.selectLabel('ui');
    expect(component.filterForm.value.labels).toEqual([]);
  });

  it('selectState() toggles a state on and off', () => {
    const { component } = setup();

    component.selectState(TranslationStatus.TRANSLATED);
    expect(component.filterForm.value.states).toEqual([TranslationStatus.TRANSLATED]);

    component.selectState(TranslationStatus.TRANSLATED);
    expect(component.filterForm.value.states).toEqual([]);
  });

  it('localeIdToString() resolves a name from availableLocales, falling back to the id', () => {
    const { component } = setup();

    expect(component.localeIdToString('de')).toBe('German');
    expect(component.localeIdToString('fr')).toBe('fr');
  });
});

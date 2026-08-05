import { TestBed } from '@angular/core/testing';
import { Locale } from '@shared/models/locale.model';
import { TranslationStatus } from '@shared/models/translation.model';
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

    fixture.componentRef.setInput('localeFallbackId', 'de');
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

  it('emits filterChange with the debounced form value', async () => {
    vi.useFakeTimers();
    const { component } = setup();
    const spy = vi.fn();
    component.filterChange.subscribe(spy);

    component.filterForm.patchValue({ locale: 'en', search: 'home', labels: ['ui'], states: [TranslationStatus.TRANSLATED] });
    await vi.advanceTimersByTimeAsync(500);

    expect(spy).toHaveBeenCalledWith({ locale: 'en', search: 'home', labels: ['ui'], states: [TranslationStatus.TRANSLATED] });
    vi.useRealTimers();
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

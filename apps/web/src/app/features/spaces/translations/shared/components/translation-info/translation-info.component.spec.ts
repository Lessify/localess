import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import { Locale, Translation } from '@localess/shared';
import { vi } from 'vitest';

import { TranslationInfoComponent } from './translation-info.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

const translation = (locales: Record<string, string>): Translation => ({ id: 't1', key: 'home.title', locales }) as Translation;

describe('TranslationInfoComponent', () => {
  function setup() {
    const success = vi.fn();
    TestBed.overrideComponent(TranslationInfoComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: NotificationService, useValue: { success } }] });
    const fixture = TestBed.createComponent(TranslationInfoComponent);
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.detectChanges();
    return { component: fixture.componentInstance, success };
  }

  it('statusLabel() names the status in words, over the available locales', () => {
    const { component } = setup();

    expect(component.statusLabel(translation({}))).toBe('Untranslated');
    expect(component.statusLabel(translation({ en: 'Hi' }))).toBe('Partially Translated');
    expect(component.statusLabel(translation({ en: 'Hi', de: 'Hallo' }))).toBe('Translated');
  });

  it('copied() notifies success', () => {
    const { component, success } = setup();

    component.copied();

    expect(success).toHaveBeenCalledWith('Translation ID copied to clipboard.');
  });
});

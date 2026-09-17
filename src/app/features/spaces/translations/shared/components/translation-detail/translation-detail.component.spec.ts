import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { Locale } from '@shared/models/locale.model';
import { Translation, TranslationStatus, TranslationType } from '@shared/models/translation.model';
import { LocaleService } from '@shared/services/locale.service';
import { NotificationService } from '@shared/services/notification.service';
import { PlatformService } from '@shared/services/platform.service';
import { TranslateService } from '@shared/services/translate.service';
import { TranslationService } from '@shared/services/translation.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TranslationDetailComponent } from './translation-detail.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

function translation(overrides: Partial<Translation> = {}): Translation {
  return { id: 't1', type: TranslationType.STRING, locales: { en: 'Hello' }, ...overrides } as Translation;
}

describe('TranslationDetailComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(t: Translation = translation(), isActionSave = false) {
    const update = vi.fn().mockReturnValue(of(undefined));
    const updateId = vi.fn().mockReturnValue(of(undefined));
    const deleteTranslation = vi.fn().mockReturnValue(of(undefined));
    const isLocaleTranslatableFrom = vi.fn().mockReturnValue(true);
    const isLocaleTranslatableTo = vi.fn().mockReturnValue(true);
    const translate = vi.fn().mockReturnValue(of('translated'));
    const success = vi.fn();
    const error = vi.fn();
    const open = vi.fn();
    const openConfirm = vi.fn();

    TestBed.overrideComponent(TranslationDetailComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useValue: { update, updateId, delete: deleteTranslation } },
        { provide: LocaleService, useValue: { isLocaleTranslatableFrom, isLocaleTranslatableTo } },
        { provide: NotificationService, useValue: { success, error } },
        { provide: MatDialog, useValue: { open } },
        { provide: HlmDialogService, useValue: { open: openConfirm } },
        { provide: TranslateService, useValue: { translate } },
        { provide: PlatformService, useValue: { isActionSave: vi.fn().mockReturnValue(isActionSave) } },
      ],
    });
    const fixture = TestBed.createComponent(TranslationDetailComponent);
    fixture.componentRef.setInput('translation', t);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.componentRef.setInput('localeFallback', en);
    fixture.detectChanges();
    return { component: fixture.componentInstance, update, updateId, deleteTranslation, translate, success, error, open, openConfirm, isLocaleTranslatableFrom, isLocaleTranslatableTo };
  }

  it('identifyTranslationStatus() delegates to the shared util using availableLocales', () => {
    const { component } = setup();

    expect(component.identifyTranslationStatus(translation({ locales: {} }))).toBe(TranslationStatus.UNTRANSLATED);
    expect(component.identifyTranslationStatus(translation({ locales: { en: 'Hi', de: 'Hallo' } }))).toBe(TranslationStatus.TRANSLATED);
  });

  it('localeToString()/compareLocale()', () => {
    const { component } = setup();

    expect(component.localeToString(de)).toBe('German');
    expect(component.compareLocale(en, en)).toBe(true);
    expect(component.compareLocale(en, de)).toBe(false);
  });

  it('isLocaleTranslatable() rejects identical locales, otherwise delegates to LocaleService', () => {
    const { component } = setup();

    expect(component.isLocaleTranslatable(en, en)).toBe(false);
    expect(component.isLocaleTranslatable(en, de)).toBe(true);
  });

  // Each end is checked against its own direction: a source-only locale must not be offered as a
  // target, and the reverse.
  it('asks the source predicate about the source and the target predicate about the target', () => {
    const { component, isLocaleTranslatableFrom, isLocaleTranslatableTo } = setup();

    component.isLocaleTranslatable(en, de);

    expect(isLocaleTranslatableFrom).toHaveBeenCalledWith('en');
    expect(isLocaleTranslatableTo).toHaveBeenCalledWith('de');
  });

  it('refuses a source locale that is only supported as a target', () => {
    const { component, isLocaleTranslatableFrom } = setup();
    isLocaleTranslatableFrom.mockReturnValue(false);

    expect(component.isLocaleTranslatable(en, de)).toBe(false);
  });

  it('canTranslateFrom()/canTranslateTo() ask their own direction', () => {
    const { component, isLocaleTranslatableFrom, isLocaleTranslatableTo } = setup();
    isLocaleTranslatableTo.mockReturnValue(false);

    expect(component.canTranslateFrom(de)).toBe(true);
    expect(component.canTranslateTo(de)).toBe(false);
    expect(isLocaleTranslatableFrom).toHaveBeenCalledWith('de');
    expect(isLocaleTranslatableTo).toHaveBeenCalledWith('de');
  });

  /**
   * The button carries the whole guard here. The selects also choose which locale is shown and
   * hand-edited, so they keep offering every locale of the space - only the machine translation is
   * withheld, and the tooltip says why instead of leaving a dead button.
   */
  describe('translateTooltip()', () => {
    it('explains an identical pair', () => {
      const { component } = setup();
      component.selectedTargetLocale.set(component.selectedSourceLocale());

      expect(component.translateTooltip()).toContain('Pick a target other than');
    });

    it('explains an unsupported source', () => {
      const { component, isLocaleTranslatableFrom } = setup();
      isLocaleTranslatableFrom.mockReturnValue(false);
      component.selectedSourceLocale.set(en);
      component.selectedTargetLocale.set(de);

      expect(component.translateTooltip()).toBe('English is not supported as a translation source');
    });

    it('explains an unsupported target', () => {
      const { component, isLocaleTranslatableTo } = setup();
      isLocaleTranslatableTo.mockReturnValue(false);
      component.selectedSourceLocale.set(en);
      component.selectedTargetLocale.set(de);

      expect(component.translateTooltip()).toBe('German is not supported as a translation target');
    });

    it('falls back to the plain label when the pair works', () => {
      const { component } = setup();
      component.selectedSourceLocale.set(en);
      component.selectedTargetLocale.set(de);

      expect(component.translateTooltip()).toBe('Translate');
    });
  });

  it('refuses a target locale that is only supported as a source', () => {
    const { component, isLocaleTranslatableTo } = setup();
    isLocaleTranslatableTo.mockReturnValue(false);

    expect(component.isLocaleTranslatable(en, de)).toBe(false);
  });

  describe('translate', () => {
    it('translates the source locale content and notifies success', async () => {
      vi.useFakeTimers();
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component, translate, success } = setup(t);

      component.translate();

      expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: 'en', targetLocale: 'en' });
      expect(component.selectedTranslationLocaleValue()).toBe('translated');
      expect(success).toHaveBeenCalledWith('Translated');
      expect(component.isTranslateLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);
      expect(component.isTranslateLoading()).toBe(false);
    });

    it('notifies an error with a documentation link on failure', () => {
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component, translate, error } = setup(t);
      translate.mockReturnValue(throwError(() => new Error('boom')));

      component.translate();

      expect(error).toHaveBeenCalledWith('Can not be translation.', expect.anything());
    });
  });

  describe('openEditIdDialog', () => {
    it('updates the id and notifies success when confirmed', () => {
      const { component, open, updateId, success } = setup();
      open.mockReturnValue({ afterClosed: () => of('new.id') });
      const t = translation({ id: 't1' });

      component.openEditIdDialog(t);

      expect(updateId).toHaveBeenCalledWith('space-1', t, 'new.id');
      expect(success).toHaveBeenCalledWith('Translation ID has been updated.');
    });

    it('notifies an error on failure', () => {
      const { component, open, updateId, error } = setup();
      updateId.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of('new.id') });

      component.openEditIdDialog(translation({ id: 't1' }));

      expect(error).toHaveBeenCalledWith('Translation ID can not be updated.');
    });
  });

  describe('openEditDialog', () => {
    it('updates labels/description and notifies success when confirmed', () => {
      const { component, open, update, success } = setup();
      open.mockReturnValue({ afterClosed: () => of({ labels: ['ui'], description: 'desc' }) });
      const t = translation({ id: 't1' });

      component.openEditDialog(t);

      expect(update).toHaveBeenCalledWith('space-1', 't1', { labels: ['ui'], description: 'desc' });
      expect(success).toHaveBeenCalledWith('Translation has been updated.');
    });

    it('notifies an error on failure', () => {
      const { component, open, update, error } = setup();
      update.mockReturnValue(throwError(() => new Error('boom')));
      open.mockReturnValue({ afterClosed: () => of({ labels: [], description: '' }) });

      component.openEditDialog(translation({ id: 't1' }));

      expect(error).toHaveBeenCalledWith('Translation can not be updated.');
    });
  });

  describe('openDeleteDialog', () => {
    it('deletes and notifies success when confirmed', () => {
      const { component, openConfirm, deleteTranslation, success } = setup();
      openConfirm.mockReturnValue({ closed$: of(true) });

      component.openDeleteDialog(translation({ id: 't1' }));

      expect(deleteTranslation).toHaveBeenCalledWith('space-1', 't1');
      expect(success).toHaveBeenCalledWith('Translation has been deleted.');
    });

    it('does not delete when cancelled', () => {
      const { component, openConfirm, deleteTranslation } = setup();
      openConfirm.mockReturnValue({ closed$: of(undefined) });

      component.openDeleteDialog(translation({ id: 't1' }));

      expect(deleteTranslation).not.toHaveBeenCalled();
    });
  });

  it('copied() notifies success', () => {
    const { component, success } = setup();

    component.copied();

    expect(success).toHaveBeenCalledWith('Translation ID copied to clipboard.');
  });

  describe('captureKeyboard', () => {
    it('emits save with the selected translation locale value on Ctrl/Cmd+S', () => {
      const t = translation({ id: 't1', locales: { en: 'Hello' } });
      const { component } = setup(t, true);
      const spy = vi.fn();
      component.save.subscribe(spy);
      const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      component.captureKeyboard(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith({ translation: t, locale: en, value: 'Hello' });
    });

    it('does nothing for other key combinations', () => {
      const { component } = setup(translation(), false);
      const spy = vi.fn();
      component.save.subscribe(spy);
      const event = { preventDefault: vi.fn() } as unknown as KeyboardEvent;

      component.captureKeyboard(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

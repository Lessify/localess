import { signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { TestBed } from '@angular/core/testing';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { UserStore } from '@shared/stores/user.store';

import { TranslateMenuComponent } from './translate-menu.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };
const fr: Locale = { id: 'fr', name: 'French' };
/** Not a language Google translates, and not the `default` sentinel either. */
const unsupported: Locale = { id: 'xx-XX', name: 'Nowhere' };

describe('TranslateMenuComponent', () => {
  function setup(selectedLocale: Locale = de, availableLocales: Locale[] = [en, de, fr]) {
    // The trigger's `canUserPerform` pipe reads UserStore, which would otherwise pull in Firebase
    // Auth. Faked the same way the pipe's own spec does it.
    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: { role: signal('admin'), permissions: signal([]) } },
        // The real LocaleService over a stubbed Firestore: what the menu offers should be decided
        // by the actual supported-locale lists, not by a hand-written stub of them.
        { provide: Firestore, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(TranslateMenuComponent);
    fixture.componentRef.setInput('selectedLocale', selectedLocale);
    fixture.componentRef.setInput('availableLocales', availableLocales);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('offers every locale except the one being translated into', () => {
    const { component } = setup(de);

    expect(component.sourceLocales()).toEqual([en, fr]);
  });

  it('offers nothing when the selected locale is the only one', () => {
    const { component } = setup(de, [de]);

    expect(component.sourceLocales()).toEqual([]);
  });

  it('follows a change of selected locale', () => {
    const { component, fixture } = setup(de);

    fixture.componentRef.setInput('selectedLocale', fr);

    expect(component.sourceLocales()).toEqual([en, de]);
  });

  /**
   * The provider accepts a limited set of languages, and a space can hold any locale at all. An
   * item that can only fail is disabled rather than offered - see the Locales settings table,
   * which reports the same two directions per locale.
   */
  describe('provider support', () => {
    it('offers a source the provider accepts', () => {
      const { component } = setup(de);

      expect(component.canTranslateFrom(en)).toBe(true);
      expect(component.disabled()).toBe(false);
    });

    it('refuses a source the provider does not know', () => {
      const { component } = setup(de, [unsupported, de]);

      expect(component.canTranslateFrom(unsupported)).toBe(false);
    });

    // Every item translates into the field's own locale, so an unsupported target leaves nothing
    // to offer and the whole button goes.
    it('disables the button when the field locale cannot be a target', () => {
      const { component } = setup(unsupported, [en, unsupported]);

      expect(component.disabled()).toBe(true);
      expect(component.tooltip()).toContain('not supported as a translation target');
    });

    it('disables the button when no locale can be a source', () => {
      const { component } = setup(de, [unsupported, de]);

      expect(component.disabled()).toBe(true);
      expect(component.tooltip()).toContain('No other locale');
    });

    /**
     * `default` is a storage key, not a language. Resolved through the space fallback it is the
     * fallback's language; without a fallback there is nothing to send, so it stays unsupported.
     */
    it('resolves the default sentinel through the fallback locale', () => {
      const { component, fixture } = setup(de, [CONTENT_DEFAULT_LOCALE, de]);

      expect(component.canTranslateFrom(CONTENT_DEFAULT_LOCALE)).toBe(false);

      fixture.componentRef.setInput('fallbackLocale', en);

      expect(component.canTranslateFrom(CONTENT_DEFAULT_LOCALE)).toBe(true);
    });

    it('applies the same resolution to the field locale as a target', () => {
      const { component, fixture } = setup(CONTENT_DEFAULT_LOCALE, [CONTENT_DEFAULT_LOCALE, de]);
      fixture.componentRef.setInput('fallbackLocale', en);

      expect(component.canTranslateToSelected()).toBe(true);
    });
  });

  /**
   * Both placements have to land the button in the same spot on screen, by different means - see
   * the `placement` input for why neither context can use the other's mechanism.
   */
  describe('placement', () => {
    function triggerOf(fixture: { nativeElement: HTMLElement }) {
      return fixture.nativeElement.querySelector('button');
    }

    it('pushes the trigger to the right of the toolbar row by default', () => {
      const { fixture } = setup();

      expect(triggerOf(fixture)?.classList).toContain('ms-auto');
    });

    /**
     * Read by `hlmDropdownMenuTrigger`, which shares this element with `hlmInputGroupButton`.
     * The button always sits at the right-hand edge of its field, so with the default `start`
     * alignment CDK clamps the menu to the ~300px left between the trigger and the viewport edge,
     * and "Translate from English (Default) to German" wraps onto a second line - it needs 293px
     * against 292px available. Measured in the browser before and after.
     */
    it('anchors the menu to the trigger end so long items do not wrap', () => {
      const { fixture } = setup();

      expect(triggerOf(fixture)?.getAttribute('align')).toBe('end');
    });

    // The addon's own `has-[>button]:me-[-0.3rem]` cannot reach a button nested inside this
    // component, so the same offset is reapplied here - otherwise the button sits 0.3rem short of
    // where every other inline-end addon button sits.
    it('reapplies the addon edge offset when placed in an inline-end addon', () => {
      const { fixture } = setup();
      fixture.componentRef.setInput('placement', 'addon');
      fixture.detectChanges();

      expect(triggerOf(fixture)?.classList).toContain('me-[-0.3rem]');
      expect(triggerOf(fixture)?.classList).not.toContain('ms-auto');
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldMarkdown } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { LocalSettingsStore, MarkdownMode } from '@shared/stores/local-settings.store';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MarkdownEditorComponent } from './markdown-editor.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

describe('MarkdownEditorComponent', () => {
  // The mode is a persisted user preference, so each test starts from an empty localStorage.
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(data: ContentData, selectedLocale: Locale = de, initialValue = '', storedMode?: MarkdownMode) {
    const translate = vi.fn().mockReturnValue(of('translated'));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.overrideComponent(MarkdownEditorComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { translate } },
        { provide: NotificationService, useValue: { success, error } },
      ],
    });
    const settings = TestBed.inject(LocalSettingsStore);
    // Set before the component exists, so it sees the preference the way a reload would.
    if (storedMode) settings.setMarkdownMode(storedMode);
    const control = new FormControl(initialValue);
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('form', control);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldMarkdown);
    fixture.componentRef.setInput('selectedLocale', selectedLocale);
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.detectChanges();

    /** The editor is loaded by an effect, so a mode change only lands once effects flush. */
    const toggleMode = () => {
      fixture.componentInstance.toggleMode();
      fixture.detectChanges();
    };
    /** Mirrors an external write to the control, then lets the resulting effects run. */
    const setValue = (value: string) => {
      control.setValue(value);
      fixture.detectChanges();
    };
    /** A second markdown field alongside the first, as a schema with two of them would render. */
    const createSiblingField = (value: string) => {
      const sibling = TestBed.createComponent(MarkdownEditorComponent);
      sibling.componentRef.setInput('data', data);
      sibling.componentRef.setInput('form', new FormControl(value));
      sibling.componentRef.setInput('component', {} as unknown as SchemaFieldMarkdown);
      sibling.componentRef.setInput('selectedLocale', selectedLocale);
      sibling.componentRef.setInput('availableLocales', [en, de]);
      sibling.detectChanges();
      return sibling.componentInstance;
    };

    return {
      component: fixture.componentInstance,
      fixture,
      translate,
      success,
      error,
      control,
      settings,
      toggleMode,
      setValue,
      createSiblingField,
    };
  }

  it('isDefaultLocale()/selectedLocaleId() reflect the selected locale', () => {
    const { component } = setup({ _id: 'c1', schema: 's1' }, CONTENT_DEFAULT_LOCALE);

    expect(component.isDefaultLocale()).toBe(true);
    expect(component.selectedLocaleId()).toBe(CONTENT_DEFAULT_LOCALE.id);
  });

  it('is not the default locale for a non-default selection', () => {
    const { component } = setup({ _id: 'c1', schema: 's1' }, de);

    expect(component.isDefaultLocale()).toBe(false);
  });

  describe('modes', () => {
    it('defaults to source mode for an author with no stored preference', () => {
      const { component } = setup({ _id: 'c1', schema: 's1' });

      expect(component.mode()).toBe('source');
      // A schema can hold many markdown fields; none of them should pay for TipTap unopened.
      expect(component.editor()).toBeNull();
    });

    it('builds the editor on the first switch into wysiwyg mode and loads the markdown', () => {
      const { component, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, '## Title');

      toggleMode();

      expect(component.mode()).toBe('wysiwyg');
      expect(component.editor()).not.toBeNull();
      expect(component.editor()?.getMarkdown().trim()).toBe('## Title');
    });

    it('reuses the same editor across further mode switches', () => {
      const { component, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'text');
      toggleMode();
      const editor = component.editor();

      toggleMode();
      toggleMode();

      expect(component.mode()).toBe('wysiwyg');
      expect(component.editor()).toBe(editor);
    });

    // The whole point of the field kind: whichever mode the author used, the control holds markdown.
    it('writes markdown back to the form when the document is edited in wysiwyg mode', () => {
      const { component, control, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'plain');
      toggleMode();

      component.editor()?.chain().setContent('start').selectAll().toggleBold().run();

      expect(control.value).toBe('**start**');
    });

    // Opening a document must not rewrite it. Entering wysiwyg mode reparses the markdown, and the
    // serializer is entitled to normalize it - so that pass has to stay out of the form control.
    it('does not touch the form value when only switching modes', () => {
      const { control, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'visit https://example.com now');
      const changes = vi.fn();
      control.valueChanges.subscribe(changes);

      toggleMode();
      toggleMode();

      expect(control.value).toBe('visit https://example.com now');
      expect(changes).not.toHaveBeenCalled();
    });

    it('mirrors a disabled control into a read-only editor', () => {
      const { component, control, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'text');
      control.disable();

      toggleMode();

      expect(component.editor()?.isEditable).toBe(false);
    });

    it('destroys the editor on component destroy', () => {
      const { component, fixture, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'text');
      toggleMode();
      const destroySpy = vi.spyOn(component.editor()!, 'destroy');

      fixture.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('highlights a code block through the lowlight integration', () => {
      const { component, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, '```typescript\nconst answer: number = 42;\n```');

      toggleMode();

      expect(component.editor()?.view.dom.innerHTML).toContain('hljs-');
    });
  });

  /**
   * Authors settle into one way of working - hand-written markdown or the visual editor - so the
   * mode is a remembered preference rather than per-field state. The store persists it to
   * localStorage; these cover the component reading and writing it.
   */
  describe('remembered preference', () => {
    it('opens straight into wysiwyg when that is the stored preference, with no toggle', () => {
      const { component } = setup({ _id: 'c1', schema: 's1' }, de, '## Title', 'wysiwyg');

      expect(component.mode()).toBe('wysiwyg');
      expect(component.editor()?.getMarkdown().trim()).toBe('## Title');
    });

    it('opens in source when that is the stored preference', () => {
      const { component } = setup({ _id: 'c1', schema: 's1' }, de, '## Title', 'source');

      expect(component.mode()).toBe('source');
      expect(component.editor()).toBeNull();
    });

    it('records the choice when the author switches to wysiwyg', () => {
      const { settings, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'text');

      toggleMode();

      expect(settings.markdownMode()).toBe('wysiwyg');
    });

    it('records the choice when the author switches back to source', () => {
      const { settings, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'text', 'wysiwyg');

      toggleMode();

      expect(settings.markdownMode()).toBe('source');
    });

    // Every markdown field on the page follows the one preference, rather than each remembering
    // its own mode - the author chose a way of working, not a per-field setting.
    it('applies the choice to every markdown field on the page', () => {
      const { toggleMode, createSiblingField } = setup({ _id: 'c1', schema: 's1' }, de, 'text');

      toggleMode();

      expect(createSiblingField('other field').mode()).toBe('wysiwyg');
    });
  });

  describe('lossy content guard', () => {
    it('flags stored markdown that wysiwyg mode cannot represent', () => {
      const { component } = setup({ _id: 'c1', schema: 's1' }, de, 'text with <sup>2</sup>');

      expect(component.lossy()).toBe(true);
      expect(component.modeTooltip()).toContain('cannot represent');
    });

    it('refuses to enter wysiwyg mode rather than destroying the HTML', () => {
      const { component, control, error, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, '<div>callout</div>');

      toggleMode();

      expect(component.mode()).toBe('source');
      expect(component.editor()).toBeNull();
      expect(control.value).toBe('<div>callout</div>');
      expect(error).toHaveBeenCalled();
    });

    /**
     * The guard overrides the preference for one field without overwriting it. An author who works
     * in the visual editor still sees raw markdown on a field holding HTML, and every other field
     * - and the next reload - stays in their chosen mode.
     */
    it('shows source for a lossy field without changing the stored preference', () => {
      const { component, settings } = setup({ _id: 'c1', schema: 's1' }, de, 'has <br> html', 'wysiwyg');

      expect(component.mode()).toBe('source');
      expect(settings.markdownMode()).toBe('wysiwyg');
    });

    it('returns to the preferred wysiwyg mode once the content is no longer lossy', () => {
      const { component, setValue } = setup({ _id: 'c1', schema: 's1' }, de, 'has <br> html', 'wysiwyg');
      expect(component.mode()).toBe('source');

      setValue('## now clean');

      expect(component.mode()).toBe('wysiwyg');
      expect(component.editor()?.getMarkdown().trim()).toBe('## now clean');
    });

    it('tracks the live control value as it changes', () => {
      const { component, setValue } = setup({ _id: 'c1', schema: 's1' }, de, 'clean text');
      expect(component.lossy()).toBe(false);

      setValue('now with <br> html');

      expect(component.lossy()).toBe(true);
    });

    it('allows wysiwyg mode for markdown that only looks like HTML inside code', () => {
      const { component, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'use the `<div>` element');

      toggleMode();

      expect(component.mode()).toBe('wysiwyg');
    });
  });

  describe('translate', () => {
    it('notifies an error when there is no content to translate', () => {
      const { component, translate, error } = setup({ _id: 'c1', schema: 's1', body: '' });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('No content to translate');
    });

    it('uses the plain field for the default locale and sets the result on the form', () => {
      const { component, translate, success, control } = setup({ _id: 'c1', schema: 's1', body: 'Hello' });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: null, targetLocale: 'de' });
      expect(control.value).toBe('translated');
      expect(success).toHaveBeenCalledWith('Translated');
    });

    it('uses the locale-suffixed field for a non-default source locale', () => {
      const { component, translate } = setup({ _id: 'c1', schema: 's1', ['body_i18n_de']: 'Hallo' });

      component.translate('body', 'de', 'en');

      expect(translate).toHaveBeenCalledWith({ content: 'Hallo', sourceLocale: 'de', targetLocale: 'en' });
    });

    it('pushes the translation into the editor when wysiwyg mode is open', () => {
      const { component, translate, toggleMode } = setup({ _id: 'c1', schema: 's1', body: 'Hello' }, de, 'Hello');
      translate.mockReturnValue(of('## Hallo'));
      toggleMode();

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(component.editor()?.getMarkdown().trim()).toBe('## Hallo');
    });

    // A translation carrying HTML would be stripped on the next keystroke in wysiwyg mode, so the
    // field drops to source instead of showing content it cannot keep - the preference is untouched.
    it('falls back to source mode when the translation contains HTML', () => {
      const { component, translate, control, settings, toggleMode } = setup({ _id: 'c1', schema: 's1', body: 'Hello' }, de, 'Hello');
      translate.mockReturnValue(of('Hallo <br> Welt'));
      toggleMode();

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(component.mode()).toBe('source');
      expect(control.value).toBe('Hallo <br> Welt');
      expect(settings.markdownMode()).toBe('wysiwyg');
    });

    it('notifies an error with a documentation link on failure', () => {
      const { component, translate, error } = setup({ _id: 'c1', schema: 's1', body: 'Hello' });
      translate.mockReturnValue(throwError(() => new Error('boom')));

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(error).toHaveBeenCalledWith('Can not be translation.', expect.anything());
    });
  });

  // Underline is the mark that let both editors share one toolbar; it has to reach the form as
  // portable markdown rather than TipTap's default `++text++`.
  it('writes underline back as inline HTML', () => {
    const { component, control, toggleMode } = setup({ _id: 'c1', schema: 's1' }, de, 'plain');
    toggleMode();

    component.editor()?.chain().setContent('plain').selectAll().toggleUnderline().run();

    expect(control.value).toBe('<u>plain</u>');
  });
});

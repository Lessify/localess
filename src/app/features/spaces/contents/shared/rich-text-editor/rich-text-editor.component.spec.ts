import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldRichText } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TOOLBAR_REQUIRED_MARKS, TOOLBAR_REQUIRED_NODES } from '../editor-toolbar/editor-toolbar.component';
import { RichTextEditorComponent } from './rich-text-editor.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

/** A stored RICH_TEXT value: a TipTap document, not a string. */
function doc(text: string, marks?: { type: string }[]) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] }] };
}

describe('RichTextEditorComponent', () => {
  function setup(data: ContentData = { _id: 'c1', schema: 's1' }, selectedLocale: Locale = de) {
    const translate = vi.fn().mockReturnValue(of('<p>translated</p>'));
    const success = vi.fn();
    const error = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { translate } },
        { provide: NotificationService, useValue: { success, error } },
      ],
    });
    const control = new FormControl('');
    const fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('form', control);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldRichText);
    fixture.componentRef.setInput('selectedLocale', selectedLocale);
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, control, translate, success, error };
  }

  it('destroys the editor on component destroy', () => {
    const { component, fixture } = setup();
    const destroySpy = vi.spyOn(component.editor, 'destroy');

    fixture.destroy();

    expect(destroySpy).toHaveBeenCalled();
  });

  it('highlights a code block through the TipTap integration', () => {
    const { component } = setup();

    component.editor.commands.setContent('<pre><code class="language-typescript">const answer: number = 42;</code></pre>');

    expect(component.editor.view.dom.innerHTML).toContain('hljs-');
  });

  /**
   * The counterpart of the same assertion in the shared toolbar's spec, against the same two
   * lists. `EditorToolbarComponent` renders one fixed set of buttons for both field editors, so
   * every type it acts on has to be registered here too - otherwise a button looks fine and
   * silently does nothing.
   */
  it('registers every mark and node the shared toolbar acts on', () => {
    const { component } = setup();

    expect(Object.keys(component.editor.schema.marks)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_MARKS));
    expect(Object.keys(component.editor.schema.nodes)).toEqual(expect.arrayContaining(TOOLBAR_REQUIRED_NODES));
  });

  /**
   * A RICH_TEXT field stores a document rather than text, so it is handed to the provider as HTML -
   * both DeepL and Google translate only text nodes in that mode and leave markup alone.
   */
  describe('translate', () => {
    it('sends the source document as HTML', () => {
      const { component, translate } = setup({ _id: 'c1', schema: 's1', body: doc('Hello') });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate).toHaveBeenCalledWith({
        content: '<p>Hello</p>',
        sourceLocale: null,
        targetLocale: 'de',
        format: 'html',
      });
    });

    // The reason HTML is the interchange format: marks have to survive the trip.
    it('keeps marks in the HTML it sends', () => {
      const { component, translate } = setup({ _id: 'c1', schema: 's1', body: doc('Hello', [{ type: 'bold' }]) });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate.mock.calls[0][0].content).toBe('<p><strong>Hello</strong></p>');
    });

    it('uses the locale-suffixed field for a non-default source locale', () => {
      const { component, translate } = setup({ _id: 'c1', schema: 's1', ['body_i18n_de']: doc('Hallo') });

      component.translate('body', 'de', 'en');

      expect(translate).toHaveBeenCalledWith({
        content: '<p>Hallo</p>',
        sourceLocale: 'de',
        targetLocale: 'en',
        format: 'html',
      });
    });

    it('parses the translated HTML back into the editor and the form control', () => {
      const { component, control, translate, success } = setup({ _id: 'c1', schema: 's1', body: doc('Hello') });
      translate.mockReturnValue(of('<p>Hallo <strong>Welt</strong></p>'));

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(component.editor.getHTML()).toBe('<p>Hallo <strong>Welt</strong></p>');
      // The form holds the document, written by ngx-tiptap's value accessor off the update event.
      expect(control.value).toMatchObject({ type: 'doc' });
      expect(success).toHaveBeenCalledWith('Translated');
    });

    it('notifies an error when the field has no value', () => {
      const { component, translate, error } = setup({ _id: 'c1', schema: 's1' });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('No content to translate');
    });

    // An untouched editor stores a document holding one empty paragraph, which is not worth paying
    // a provider call for.
    it('notifies an error for an empty document', () => {
      const { component, translate, error } = setup({
        _id: 'c1',
        schema: 's1',
        body: { type: 'doc', content: [{ type: 'paragraph' }] },
      });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('No content to translate');
    });

    // A field that predates the editor, or was written through the API, can hold a plain string.
    it('passes a legacy string value through unchanged', () => {
      const { component, translate } = setup({ _id: 'c1', schema: 's1', body: '<p>Hello</p>' });

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(translate.mock.calls[0][0].content).toBe('<p>Hello</p>');
    });

    it('notifies an error with a documentation link on failure', () => {
      const { component, translate, error } = setup({ _id: 'c1', schema: 's1', body: doc('Hello') });
      translate.mockReturnValue(throwError(() => new Error('boom')));

      component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

      expect(error).toHaveBeenCalledWith('Can not be translation.', expect.anything());
    });
  });
});

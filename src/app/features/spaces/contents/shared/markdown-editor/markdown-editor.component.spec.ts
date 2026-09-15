import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ContentData } from '@shared/models/content.model';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
import { SchemaFieldMarkdown } from '@shared/models/schema.model';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@shared/services/translate.service';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { MarkdownEditorComponent } from './markdown-editor.component';

const en: Locale = { id: 'en', name: 'English' };
const de: Locale = { id: 'de', name: 'German' };

describe('MarkdownEditorComponent', () => {
  function setup(data: ContentData, selectedLocale: Locale = de) {
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
    const control = new FormControl('');
    const fixture = TestBed.createComponent(MarkdownEditorComponent);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('form', control);
    fixture.componentRef.setInput('component', {} as unknown as SchemaFieldMarkdown);
    fixture.componentRef.setInput('selectedLocale', selectedLocale);
    fixture.componentRef.setInput('availableLocales', [en, de]);
    fixture.detectChanges();
    return { component: fixture.componentInstance, translate, success, error, control };
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

  it('translate() notifies an error when there is no content to translate', () => {
    const { component, translate, error } = setup({ _id: 'c1', schema: 's1', body: '' });

    component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

    expect(translate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('No content to translate');
  });

  it('translate() uses the plain field for the default locale and sets the result on the form', () => {
    const { component, translate, success, control } = setup({ _id: 'c1', schema: 's1', body: 'Hello' });

    component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

    expect(translate).toHaveBeenCalledWith({ content: 'Hello', sourceLocale: null, targetLocale: 'de' });
    expect(control.value).toBe('translated');
    expect(success).toHaveBeenCalledWith('Translated');
  });

  it('translate() uses the locale-suffixed field for a non-default source locale', () => {
    const { component, translate } = setup({ _id: 'c1', schema: 's1', ['body_i18n_de']: 'Hallo' });

    component.translate('body', 'de', 'en');

    expect(translate).toHaveBeenCalledWith({ content: 'Hallo', sourceLocale: 'de', targetLocale: 'en' });
  });

  it('translate() notifies an error with a documentation link on failure', () => {
    const { component, translate, error } = setup({ _id: 'c1', schema: 's1', body: 'Hello' });
    translate.mockReturnValue(throwError(() => new Error('boom')));

    component.translate('body', CONTENT_DEFAULT_LOCALE.id, 'de');

    expect(error).toHaveBeenCalledWith('Can not be translation.', expect.anything());
  });

  // Order matters: this must run before the test that opens a preview. `test.isolate: true` gives
  // this file its own module registry, so the dynamic import below has not run yet at this point.
  it('does not load Prism until the preview is opened', () => {
    const { component } = setup({ _id: 'c1', schema: 's1' });

    expect(component.preview()).toBe(false);
    expect((globalThis as Record<string, unknown>)['Prism']).toBeUndefined();
  });

  it('loads Prism before showing the preview', async () => {
    const { component } = setup({ _id: 'c1', schema: 's1' });

    await component.togglePreview();

    expect(component.preview()).toBe(true);
    // ngx-markdown highlights by calling the global Prism and skips silently when it is absent,
    // so the global has to exist by the time <markdown> renders.
    expect((globalThis as Record<string, unknown>)['Prism']).toBeDefined();
  });

  it('closes the preview without reloading Prism', async () => {
    const { component } = setup({ _id: 'c1', schema: 's1' });
    await component.togglePreview();

    await component.togglePreview();

    expect(component.preview()).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';

import { TranslationStringEditComponent } from './translation-string-edit.component';

describe('TranslationStringEditComponent', () => {
  function setup(value: string, enableHighlighting = false) {
    const fixture = TestBed.createComponent(TranslationStringEditComponent);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('enableHighlighting', enableHighlighting);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('returns an empty string for empty input', () => {
    const { component } = setup('');

    expect(component.highlightedText()).toBe('');
  });

  it('doubles a trailing newline', () => {
    const { component } = setup('Hello\n');

    expect(component.highlightedText()).toBe('Hello\n\n');
  });

  it('wraps {{placeholder}} tokens in a highlight mark', () => {
    const { component } = setup('Hello {{name}}!');

    expect(component.highlightedText()).toBe('Hello <mark class="bg-yellow-100 dark:bg-yellow-300">{{name}}</mark>!');
  });

  it('handleScroll() syncs the backdrop scroll position with the textarea', () => {
    const { component } = setup('some content', true);
    const textarea = component.$textarea().nativeElement;
    const backdrop = component.$backdrop().nativeElement;
    Object.defineProperty(textarea, 'scrollTop', { value: 42, configurable: true });
    Object.defineProperty(textarea, 'scrollLeft', { value: 7, configurable: true });

    component['handleScroll']();

    expect(backdrop.scrollTop).toBe(42);
    expect(backdrop.scrollLeft).toBe(7);
  });
});

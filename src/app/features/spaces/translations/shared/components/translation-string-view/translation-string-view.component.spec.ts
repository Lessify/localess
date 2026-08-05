import { TestBed } from '@angular/core/testing';

import { TranslationStringViewComponent } from './translation-string-view.component';

describe('TranslationStringViewComponent', () => {
  function setup(value: string) {
    const fixture = TestBed.createComponent(TranslationStringViewComponent);
    fixture.componentRef.setInput('value', value);
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
});

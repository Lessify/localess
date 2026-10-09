import { TestBed } from '@angular/core/testing';
import { TranslationStatus } from '@shared/models/translation.model';

import { TranslationStatusComponent } from './translation-status.component';

describe('TranslationStatusComponent', () => {
  function setup(status: TranslationStatus) {
    const fixture = TestBed.createComponent(TranslationStatusComponent);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('maps TRANSLATED to its tooltip and icon', () => {
    const { component } = setup(TranslationStatus.TRANSLATED);

    expect(component.tooltip()).toBe('Translated');
    expect(component.icon()).toBe('lucideCircleDot');
  });

  it('maps PARTIALLY_TRANSLATED to its tooltip and icon', () => {
    const { component } = setup(TranslationStatus.PARTIALLY_TRANSLATED);

    expect(component.tooltip()).toBe('Partially Translated');
    expect(component.icon()).toBe('lucideCircleDotDashed');
  });

  it('maps UNTRANSLATED to its tooltip and icon', () => {
    const { component } = setup(TranslationStatus.UNTRANSLATED);

    expect(component.tooltip()).toBe('Untranslated');
    expect(component.icon()).toBe('lucideCircleSmall');
  });
});

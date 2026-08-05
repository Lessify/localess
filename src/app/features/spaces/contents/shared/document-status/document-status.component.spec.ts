import { TestBed } from '@angular/core/testing';

import { DocumentStatusComponent } from './document-status.component';

describe('DocumentStatusComponent', () => {
  function setup(updatedAt: number, publishedAt?: number) {
    const fixture = TestBed.createComponent(DocumentStatusComponent);
    fixture.componentRef.setInput('updatedAt', updatedAt);
    if (publishedAt !== undefined) {
      fixture.componentRef.setInput('publishedAt', publishedAt);
    }
    fixture.detectChanges();
    return { component: fixture.componentInstance };
  }

  it('is "Not published" when there is no publishedAt', () => {
    const { component } = setup(100);

    expect(component.tooltip()).toBe('Not published');
    expect(component.icon()).toBe('lucideCircleDotDashed');
  });

  it('is "Published" when publishedAt is after updatedAt', () => {
    const { component } = setup(100, 200);

    expect(component.tooltip()).toBe('Published');
    expect(component.icon()).toBe('lucideCircleArrowUp');
  });

  it('is "Draft" when publishedAt is before updatedAt', () => {
    const { component } = setup(200, 100);

    expect(component.tooltip()).toBe('Draft');
    expect(component.icon()).toBe('lucideCircleFadingArrowUp');
  });

  it('is "Not published" when publishedAt equals updatedAt', () => {
    const { component } = setup(100, 100);

    expect(component.tooltip()).toBe('Not published');
    expect(component.icon()).toBe('lucideCircleDotDashed');
  });
});

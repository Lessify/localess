import { TestBed } from '@angular/core/testing';

import { PrismComponent } from './prism.component';

describe('PrismComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(PrismComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

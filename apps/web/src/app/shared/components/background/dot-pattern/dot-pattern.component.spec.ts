import { TestBed } from '@angular/core/testing';

import { DotPatternComponent } from './dot-pattern.component';

describe('DotPatternComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(DotPatternComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

import { TestBed } from '@angular/core/testing';

import { TopographyComponent } from './topography.component';

describe('TopographyComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(TopographyComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

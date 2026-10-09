import { TestBed } from '@angular/core/testing';

import { GalaxyComponent } from './galaxy.component';

describe('GalaxyComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(GalaxyComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

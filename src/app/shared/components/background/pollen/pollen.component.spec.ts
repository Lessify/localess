import { TestBed } from '@angular/core/testing';

import { PollenComponent } from './pollen.component';

describe('PollenComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(PollenComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

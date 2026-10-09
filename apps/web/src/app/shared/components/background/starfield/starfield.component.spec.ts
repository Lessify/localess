import { TestBed } from '@angular/core/testing';

import { StarfieldComponent } from './starfield.component';

describe('StarfieldComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(StarfieldComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

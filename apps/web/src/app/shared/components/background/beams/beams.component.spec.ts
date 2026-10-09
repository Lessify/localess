import { TestBed } from '@angular/core/testing';

import { BeamsComponent } from './beams.component';

describe('BeamsComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(BeamsComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

import { TestBed } from '@angular/core/testing';

import { BeamsCollisionComponent } from './beams-collision.component';

describe('BeamsCollisionComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(BeamsCollisionComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

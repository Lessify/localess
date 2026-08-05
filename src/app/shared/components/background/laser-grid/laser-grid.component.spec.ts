import { TestBed } from '@angular/core/testing';

import { LaserGridComponent } from './laser-grid.component';

describe('LaserGridComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(LaserGridComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

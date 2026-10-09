import { TestBed } from '@angular/core/testing';

import { MatrixComponent } from './matrix.component';

describe('MatrixComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(MatrixComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

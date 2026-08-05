import { TestBed } from '@angular/core/testing';

import { MeteorsComponent } from './meteors.component';

describe('MeteorsComponent', () => {
  it('creates and renders without throwing', () => {
    const fixture = TestBed.createComponent(MeteorsComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
  });
});

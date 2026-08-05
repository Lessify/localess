import { TestBed } from '@angular/core/testing';

import { RandomBackgroundComponent } from './random-background.component';

describe('RandomBackgroundComponent', () => {
  it('picks a background index within the valid range', () => {
    for (let i = 0; i < 20; i++) {
      const fixture = TestBed.createComponent(RandomBackgroundComponent);
      fixture.detectChanges();

      const index = fixture.componentInstance.bgIndex();
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(11);
      expect(Number.isInteger(index)).toBe(true);
    }
  });
});

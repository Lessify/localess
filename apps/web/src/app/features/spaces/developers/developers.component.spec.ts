import { TestBed } from '@angular/core/testing';

import { DevelopersComponent } from './developers.component';

describe('DevelopersComponent', () => {
  it('creates with the given spaceId', () => {
    const fixture = TestBed.createComponent(DevelopersComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();

    expect(fixture.componentInstance.spaceId()).toBe('space-1');
  });
});

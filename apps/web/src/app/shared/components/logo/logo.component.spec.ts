import { TestBed } from '@angular/core/testing';

import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  it('creates with the required open input', () => {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
  });
});

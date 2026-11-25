import { TestBed } from '@angular/core/testing';

import { LogoComponent } from './logo.component';

describe('LogoComponent', () => {
  function create(open: boolean) {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    return fixture;
  }

  const mark = (fixture: ReturnType<typeof create>) => fixture.nativeElement.querySelector('.mark') as SVGGElement;

  it('creates with the required open input', () => {
    const fixture = create(true);

    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('shows the name only while open', () => {
    expect(create(true).nativeElement.querySelector('h3')?.textContent).toContain('Localess');
    expect(create(false).nativeElement.querySelector('h3')).toBeNull();
  });

  it('does not turn on the first render', () => {
    const fixture = create(false);

    expect(fixture.componentInstance.turns()).toBe(0);
    expect(mark(fixture).classList).not.toContain('turned');
    expect(mark(fixture).style.transform).toBe('rotate(0deg)');
  });

  it('makes a half turn, with the colours swapped, each time the sidebar folds or opens', () => {
    const fixture = create(true);

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(mark(fixture).style.transform).toBe('rotate(180deg)');
    expect(mark(fixture).classList).toContain('turned');

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(mark(fixture).style.transform).toBe('rotate(360deg)');
    expect(mark(fixture).classList).not.toContain('turned');
  });
});

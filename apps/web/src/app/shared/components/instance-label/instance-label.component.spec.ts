import { TestBed } from '@angular/core/testing';
import { InstanceLabel } from '@localess/shared';

import { InstanceLabelComponent } from './instance-label.component';

describe('InstanceLabelComponent', () => {
  function render(label: InstanceLabel): HTMLElement {
    const fixture = TestBed.createComponent(InstanceLabelComponent);
    fixture.componentRef.setInput('label', label);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('span');
  }

  it('shows the instance name in its color', () => {
    const span = render({ name: 'Test', color: 'destructive' });
    expect(span.textContent?.trim()).toBe('Test');
    expect(span.className).toContain('bg-destructive');
  });

  it('uses each color variant', () => {
    expect(render({ name: 'Production', color: 'primary' }).className).toContain('bg-primary');
  });
});
